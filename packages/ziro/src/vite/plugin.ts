import { transform } from '@babel/core'
import defu from 'defu'
import { mkdirSync, writeFileSync } from 'node:fs'
import { joinURL } from 'ufo'
import { createUnplugin } from 'unplugin'
import { AppContext } from '../cli/commands/shared'
import { generateManifest, GenerateManifestOptions, generateRoutesTypings, generateServerRouterCode } from '../generator'
import { generateClientRouterCode } from '../generator/client-router'
import { Plugin } from '../generator/plugin'
import { isRouteRelatedFile } from '../generator/utils/route-files-utils'
import { Router, RouterOptions } from '../router'
import deadImportsRemover from './babel/dead-imports-remover'
import serverCodeRemover from './babel/server-code-remover'

export type ZiroOptions = {
  pagesDir?: string
  manifestDirPath?: string
  routerOptions?: RouterOptions
  plugins?: Plugin<any>[]
}

export type PluginContext = { [key: string]: { routes: { routeId: string; filePath: string }[]; config: any; configPath: string } }

const generateManifestFilesChain = async (manifestDirPath: string, manifestOptions: GenerateManifestOptions, pluginContext: PluginContext, routerOptions: RouterOptions) => {
  await mkdirSync(manifestDirPath, {
    recursive: true,
  })
  return generateManifest(manifestOptions, pluginContext)
    .then(async manifest => {
      writeFileSync(joinURL(manifestDirPath, 'manifest.json'), JSON.stringify(manifest, null, 2), {
        encoding: 'utf8',
      })
      return manifest
    })
    .then(async manifest => {
      await generateRoutesTypings(manifestDirPath, manifest).then(code => {
        writeFileSync(joinURL(manifestDirPath, 'routes.d.ts'), code, {
          encoding: 'utf8',
        })
      })
      return manifest
    })
    .then(async manifest => {
      await generateClientRouterCode(manifestDirPath, manifest, routerOptions).then(code => {
        writeFileSync(joinURL(manifestDirPath, 'router.client.ts'), code, {
          encoding: 'utf8',
        })
      })

      return manifest
    })
    .then(async manifest => {
      await generateServerRouterCode(manifestDirPath, manifest, pluginContext, routerOptions).then(code => {
        writeFileSync(joinURL(manifestDirPath, 'router.server.ts'), code, {
          encoding: 'utf8',
        })
      })

      if (!AppContext.getContext().loadServerRouter)
        AppContext.getContext().loadServerRouter = async () => {
          AppContext.getContext().router = (await AppContext.getContext().vite.ssrLoadModule(joinURL(manifestDirPath, 'router.server.ts'))).default as Router
        }

      if (AppContext.getContext().router && AppContext.getContext().loadServerRouter) AppContext.getContext().loadServerRouter()

      return manifest
    })
}

const ZiroUnplugin = createUnplugin<Partial<ZiroOptions> | undefined>(_options => {
  const options = defu(_options, {
    pagesDir: 'pages',
    manifestDirPath: '.ziro',
    routerOptions: {
      mode: 'partially-ssr',
    },
    plugins: [],
  } as Required<ZiroOptions>)
  AppContext.getContext().options = options
  const cwd = process.cwd()
  let manifestDirPath = joinURL(cwd, options.manifestDirPath)
  let pagesDirPath = joinURL(cwd, options.pagesDir)
  const generateRouteFiles = async () => {
    const pluginsContext = await options.plugins.reduce<Promise<PluginContext>>(async (ctx, plugin) => {
      const config = await AppContext.getContext()
        .vite.ssrLoadModule(plugin.bootstrapConfig.configPath!)
        .then(m => m.config)

      return {
        ...ctx,
        [plugin.key]: {
          routes: plugin.options.registerRoutes?.(config) || [],
          config,
          configPath: plugin.bootstrapConfig.configPath!,
        },
      }
    }, {} as Promise<PluginContext>)

    await generateManifestFilesChain(
      manifestDirPath,
      {
        cwd,
        pagesPath: options.pagesDir,
      },
      pluginsContext,
      options.routerOptions,
    )
  }
  return {
    name: 'ziro',
    vite: {
      async configureServer(server) {
        server.watcher.on('all', async (eventName, filepath) => {
          if (!filepath.startsWith(manifestDirPath)) await generateRouteFiles()
        })
      },
      config(config, env) {
        return {
          ...config,
          logLevel: 'warn',
          optimizeDeps: {
            include: ['react', 'react/jsx-runtime', 'react/jsx-dev-runtime', 'react-dom/client'],
          },
          esbuild: {
            jsx: 'automatic',
          },
          ssr: {
            external: ['ziro'],
          },
        }
      },
      async configResolved(config) {
        manifestDirPath = joinURL(config.root, options.manifestDirPath)
        pagesDirPath = joinURL(config.root, options.pagesDir)
        AppContext.getContext().generateRouteFiles = generateRouteFiles
      },
      transformIndexHtml() {
        return [
          {
            tag: 'script',
            attrs: {
              type: 'module',
              src: '/@ziro/client-entry.jsx',
            },
            injectTo: 'body',
          },
        ]
      },
      resolveId(id) {
        if ([`/@ziro/client-entry.jsx`].includes(id)) {
          return id
        }
      },
      load(id) {
        if (id === '/@ziro/client-entry.jsx') {
          return `
import { startTransition, StrictMode } from 'react'
import { hydrateRoot } from 'react-dom/client'
import { Router } from 'ziro/react'
import router from '/.ziro/router.client.ts'

// startTransition(() => {
  hydrateRoot(document,
  <Router router={router}
  />
  )
// })`
        }
      },
      transform(code, id, _options) {
        const removeServerExports = ['ssr', 'partially-ssr'].includes(options.routerOptions.mode)
        if (!removeServerExports) return code
        if (_options && !_options.ssr && isRouteRelatedFile(pagesDirPath, id)) {
          const res = transform(code, {
            filename: id,
            targets: {
              esmodules: true,
            },
            plugins: [serverCodeRemover(), deadImportsRemover()],
          })

          return transform(res!.code!, {
            filename: id,
            targets: {
              esmodules: true,
            },
            plugins: [deadImportsRemover()],
          })!.code!
        }
        return code
      },
    },
  }
})

export default ZiroUnplugin.vite
