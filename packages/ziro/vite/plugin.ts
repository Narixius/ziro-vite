import { AnyRouter, createMemoryHistory } from '@tanstack/react-router'
import { StartServer } from '@tanstack/start/server'
import { ref } from '@vue/reactivity'
import { defu } from 'defu'
import { createElement } from 'react'
import { renderToString } from 'react-dom/server'
import { joinURL } from 'ufo'
import { normalizePath, type Plugin } from 'vite'
import { generateRouter } from '../router/generator.js'
import { isRouteRelatedFile } from '../router/utils.js'

const router = ref<AnyRouter>()

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
        }
      },
      async configureServer(server) {
        const dotZiroDirPath = joinURL(server.config.root, '.ziro')
        const pagesDirPath = joinURL(server.config.root, config.pagesDir)
        generateRouter({ rootDir: server.config.root, pagesDirPath, dotZiroDirPath, server, router })
        server.middlewares.use(async function (req, res, next) {
          let serverRouter = router.value!
          const routes = router.value?.matchRoutes(req.url!, {})
          if (routes && routes.length > 1) {
            serverRouter = router.value!
            const memoryHistory = createMemoryHistory({
              initialEntries: [req.url!],
            })
            const head = await server.transformIndexHtml(req.url!, '<html><head></head><body></body></html>')
            const headContent = head.split('<head>')[1].split('</head>')[0]
            const bodyContent = head.split('<body>')[1].split('</body>')[0]

            serverRouter.update({
              history: memoryHistory,
              context: {
                ...serverRouter.options.context,
                head: headContent,
                scripts: bodyContent,
              },
            })

            await serverRouter.load()

            if (req.headers['content-type'] && ['application/json', 'multipart/form-data'].includes(req.headers['content-type']?.toLowerCase())) {
              const contextAndLoaderData = getCurrentRouteLoaderData(req.url!, serverRouter)
              if (contextAndLoaderData) {
                const [context, loaderData] = contextAndLoaderData
                res.setHeader('content-type', 'application/json')
                return res.end(JSON.stringify({ context, loaderData }))
              }
              return res.end()
            } else {
              const appHtml = renderToString(createElement(StartServer, { router: serverRouter }))
              res.setHeader('content-type', 'text/html')
              return res.end(`<!DOCTYPE html>${appHtml}`)
            }
          }
          next()
        })

        server.watcher.on('all', async (eventName, filepath) => {
          let isRouteFileChanged = eventName === 'add' || (eventName === 'unlink' && normalizePath(filepath).startsWith(normalizePath(joinURL(server.config.root, config.pagesDir))))
          if (isRouteFileChanged) generateRouter({ rootDir: server.config.root, pagesDirPath, dotZiroDirPath, server, router })
        })
      },
      handleHotUpdate({ server, file }) {
        const dotZiroDirPath = joinURL(server.config.root, '.ziro')
        const pagesDirPath = joinURL(server.config.root, config.pagesDir)
        if (isRouteRelatedFile(pagesDirPath, file)) generateRouter({ rootDir: server.config.root, pagesDirPath, dotZiroDirPath, server, router, generateRouteFile: false })
      },
      transformIndexHtml() {
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
