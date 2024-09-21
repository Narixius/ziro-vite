import { defu } from 'defu'
import { joinURL } from 'ufo'
import { normalizePath, type Plugin } from 'vite'
import { generateRouter } from '../router/generator.js'
import { isRouteRelatedFile } from '../router/utils.js'

export type ZiroConfig = Partial<{
  pagesDir: string
}>

const defaultZiroConfig: Required<ZiroConfig> = {
  pagesDir: './pages',
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
        generateRouter({ rootDir: server.config.root, pagesDirPath, dotZiroDirPath, server })

        server.watcher.on('all', async (eventName, filepath) => {
          let isRouteFileChanged = eventName === 'add' || (eventName === 'unlink' && normalizePath(filepath).startsWith(normalizePath(joinURL(server.config.root, config.pagesDir))))
          if (isRouteFileChanged) generateRouter({ rootDir: server.config.root, pagesDirPath, dotZiroDirPath, server })
        })
      },

      handleHotUpdate({ server, file }) {
        const dotZiroDirPath = joinURL(server.config.root, '.ziro')
        const pagesDirPath = joinURL(server.config.root, config.pagesDir)
        if (isRouteRelatedFile(pagesDirPath, file)) generateRouter({ rootDir: server.config.root, pagesDirPath, dotZiroDirPath, server, generateRouteFile: false })
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
          return `import { startTransition } from 'react'
import { hydrateRoot } from 'react-dom/client'
import { Router } from 'ziro/router/client'
import { router } from '/.ziro/routes.d.ts'

startTransition(() => {
  hydrateRoot(document, <Router router={router} />)
})`
        }
      },
    },
  ]
}
