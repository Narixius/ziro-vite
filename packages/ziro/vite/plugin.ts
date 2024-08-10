// import { AnyRouter } from '@tanstack/react-router'
import { defu } from 'defu'
import { joinURL } from 'ufo'
import { normalizePath, type Plugin } from 'vite'
// import { generateRouter } from '../router/generator.js'
import { createElement } from 'react'
import { renderToString } from 'react-dom/server'
import { Router } from '../router/client.js'
import { ZiroRouter } from '../router/core.js'
import { isRouteRelatedFile } from '../router/utils.js'

const generateRouter = (...any: any) => {}

// const router = ref<AnyRouter>()

export type ZiroConfig = Partial<{
  pagesDir: string
}>

const defaultZiroConfig: Required<ZiroConfig> = {
  pagesDir: './pages',
}

export const getCurrentRouteLoaderData = (pathname: string, router: any) => {
  const currentRoute = router.__store.state.matches.find((route: any) => {
    return route.id === pathname
  })

  if (currentRoute) {
    return [currentRoute.context, currentRoute.loaderData]
  }
  return null
}

export const ziro = (ziroConfig: ZiroConfig): Plugin[] => {
  const config = defu(ziroConfig, defaultZiroConfig)

  return [
    {
      name: 'Z۰ro',
      config(config, env) {
        return {
          ...config,
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
      async configureServer(server) {
        const dotZiroDirPath = joinURL(server.config.root, '.ziro')
        const pagesDirPath = joinURL(server.config.root, config.pagesDir)
        generateRouter({ rootDir: server.config.root, pagesDirPath, dotZiroDirPath, server, router: null })
        server.middlewares.use(async function (req, res, next) {
          const routerContext = await server.ssrLoadModule(joinURL(server.config.root, 'router.ts'), {
            fixStacktrace: true,
          })
          if (routerContext && req.url) {
            if (req.url.includes('pikachu')) {
              ;(routerContext.router as ZiroRouter).setUrl(req.url)
              await routerContext.router.load()
              //   console.log(JSON.stringify(routerContext.router.cache))
              const html = renderToString(createElement(Router, { router: routerContext.router }))
              return res.end(`<!DOCTYPE html>${html}`)
            }
          }
          next()
        })

        server.watcher.on('all', async (eventName, filepath) => {
          let isRouteFileChanged = eventName === 'add' || (eventName === 'unlink' && normalizePath(filepath).startsWith(normalizePath(joinURL(server.config.root, config.pagesDir))))
          if (isRouteFileChanged) generateRouter({ rootDir: server.config.root, pagesDirPath, dotZiroDirPath, server, router: null })
        })
      },
      handleHotUpdate({ server, file }) {
        const dotZiroDirPath = joinURL(server.config.root, '.ziro')
        const pagesDirPath = joinURL(server.config.root, config.pagesDir)
        if (isRouteRelatedFile(pagesDirPath, file)) generateRouter({ rootDir: server.config.root, pagesDirPath, dotZiroDirPath, server, router: null, generateRouteFile: false })
      },
      transformIndexHtml() {
        return []
        return [
          {
            tag: 'script',
            attrs: {
              type: 'module',
              src: '/@ziro/polyfill.js',
            },
            injectTo: 'head',
          },
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
        if ([`/@ziro/polyfill.js`, `/@ziro/client-entry.jsx`].includes(id)) {
          return id
        }
      },
      load(id) {
        if (id === '/@ziro/polyfill.js') {
          return `import 'ziro/polyfill'`
        }
        if (id === '/@ziro/client-entry.jsx') {
          return `import { StartClient } from 'ziro/router';
import { hydrateRoot } from 'react-dom/client';
import { createRouter } from '/.ziro/routes.d.ts';
const router = createRouter();
hydrateRoot(document.getElementById('root'), <StartClient router={router} />);
`
        }
      },
    },
  ]
}
