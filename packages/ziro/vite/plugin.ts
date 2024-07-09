import { AnyRouter, createMemoryHistory } from '@tanstack/react-router'
import { StartServer } from '@tanstack/start/server'
import { ref } from '@vue/reactivity'
import { defu } from 'defu'
import { createElement } from 'react'
import { renderToString } from 'react-dom/server'
import { joinURL } from 'ufo'
import { normalizePath, type Plugin } from 'vite'
import { generateRouter } from '../router/generator.js'

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
  const dotZiroDirPath = joinURL(process.cwd(), '.ziro')
  const pagesDirPath = joinURL(process.cwd(), config.pagesDir)

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
        generateRouter({ rootDir: server.config.root, pagesDirPath, dotZiroDirPath, server, router })
        server.middlewares.use(async function (req, res, next) {
          let serverRouter = router.value!
          const routes = router.value?.matchRoutes(req.url!, {})
          if (routes && routes.length > 1) {
            serverRouter = router.value!
            const memoryHistory = createMemoryHistory({
              initialEntries: [req.url!],
            })
            const head = await server.transformIndexHtml(req.url!, '')
            serverRouter.update({
              history: memoryHistory,
              context: {
                ...serverRouter.options.context,
                head,
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
              return res.end(appHtml)
            }
          }
          next()
        })

        server.watcher.on('all', async (eventName, filepath) => {
          let isRouteFileChanged = eventName === 'add' || (eventName === 'unlink' && normalizePath(filepath).startsWith(normalizePath(joinURL(server.config.root, config.pagesDir))))
          if (isRouteFileChanged) generateRouter({ rootDir: server.config.root, pagesDirPath, dotZiroDirPath, server, router })
        })
      },
    },
  ]
}
