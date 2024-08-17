// import { AnyRouter } from '@tanstack/react-router'
import { ref } from '@vue/reactivity'
import { defu } from 'defu'
import { createElement } from 'react'
import { renderToString } from 'react-dom/server'
import { joinURL } from 'ufo'
import { normalizePath, type Plugin } from 'vite'
import { Router } from '../router/client.js'
import { ZiroRouter } from '../router/core.js'
import { generateRouter } from '../router/generator.js'
import { isRedirectError, RedirectError } from '../router/redirect.js'
import { isRouteRelatedFile } from '../router/utils.js'
import { processHTMLTags } from './html-generator.js'

// const generateRouter = (...any: any) => {}
const router = ref<ZiroRouter>()

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
        generateRouter({ rootDir: server.config.root, pagesDirPath, dotZiroDirPath, server, router })
        server.middlewares.use('/', async function (req, res, next) {
          if (req.headers.accept?.includes('text/html')) {
            const localRouter = router.value
            if (localRouter && req.originalUrl) {
              localRouter.setUrl(req.originalUrl)
              // reset router start
              localRouter.cache = {}
              localRouter.statusCode = 200
              localRouter.statusMessage = 'success'
              // reset router end
              try {
                await localRouter.load()
              } catch (e: any) {
                if (isRedirectError(e)) {
                  res.writeHead((e as RedirectError).getRedirectStatus(), { Location: (e as RedirectError).getPath() })
                  return res.end()
                }
              }
              const html = renderToString(createElement(Router, { router: localRouter }))
              const processedHTML = await processHTMLTags(localRouter, html, server, req)
              res.setHeader('Content-Type', 'text/html')
              res.statusCode = localRouter.statusCode
              res.statusMessage = localRouter.statusMessage
              return res.end(processedHTML)
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
import { router } from '/.ziro/routes.ts'

startTransition(() => {
  hydrateRoot(document, <Router router={router} />)
})`
        }
      },
    },
  ]
}
