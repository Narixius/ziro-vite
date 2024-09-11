import { defineCommand } from 'citty'
import { colors } from 'consola/utils'
import { createApp, fromNodeMiddleware, NodeEventContext, toNodeListener } from 'h3'
import { listen } from 'listhen'
import { upperFirst } from 'lodash-es'
import { createElement } from 'react'
import { renderToString } from 'react-dom/server'
import { createServer } from 'vite'
import { Router } from '../../router/client.js'
import { isRedirectError, RedirectError } from '../../router/redirect.js'
import { Cookies } from '../../router/storage/cookies.js'
import { processHTMLTags } from '../../vite/html-generator.js'
import { AppContext, printZiroHeader } from './shared.js'

const devCommand = defineCommand({
  meta: {
    name: 'dev',
    description: 'Run the development server',
  },
  args: {
    host: {
      alias: 'h',
      type: 'boolean',
      default: false,
      description: 'Expose the server to the host',
    },
    port: {
      alias: 'p',
      type: 'string',
      default: '3000',
      description: 'Port to run the server on',
    },
  },
  setup() {
    printZiroHeader()
  },
  async run({ args: { host, port } }) {
    const app = createApp()
    AppContext.getContext().h3 = app

    listen(toNodeListener(app), {
      clipboard: false,
      showURL: false,
      public: host,
      port,
    })
      .then(async server => {
        AppContext.getContext().listener = server
        console.log()
        console.log(`   ${colors.green(`✓`)} ${colors.white(`Server is running at:`)}`)
        ;(await server.getURLs()).forEach(serverUrl => {
          console.log(`   🌐${colors.white(upperFirst(serverUrl.type))}: ${colors.whiteBright(colors.bold(serverUrl.url))}`)
        })
        if (!host) console.log(`   🌐${colors.strikethrough(colors.white('Network'))}: ${colors.dim('use --host to expose network access')}`)
        console.log()
      })
      .then(runDevServer)
  },
})

export default devCommand

export const runDevServer = async () => {
  const vite = await createServer({
    server: { middlewareMode: true },
    appType: 'custom',
  })
  AppContext.getContext().vite = vite
  const h3 = AppContext.getContext().h3
  h3.use(fromNodeMiddleware(vite.middlewares))
  h3.use(fromNodeMiddleware(renderer))
}

const renderer = async (req: NodeEventContext['req'], res: NodeEventContext['res']) => {
  const method = req.method!

  if (['GET', 'POST'].includes(method.toUpperCase()) && req.headers.accept?.includes('application/json')) {
    const router = AppContext.getContext().router
    if (router && req.originalUrl) {
      router.setUrl(req.originalUrl)
      let data = null
      router.context = {
        storage: {
          cookies: new Cookies(req.headers.cookie),
        },
      }
      // reset router state
      //   router.cache = {}
      router.clearCache()
      router.statusCode = 200
      router.statusMessage = 'success'

      try {
        if (method === 'GET') data = await router.load({ req, res }, true)
        if (method === 'POST') data = await router.loadAction({ req, res }, true)
      } catch (e: any) {
        if (isRedirectError(e)) {
          res.writeHead((e as RedirectError).getRedirectStatus(), { Location: (e as RedirectError).getPath() })
          return res.end()
        }
      }

      if (!String(router.statusCode).startsWith('2') && router.statusMessage !== 'success') {
        data = {
          error: router.statusMessage,
        }
      }

      res.statusCode = router.statusCode
      res.statusMessage = router.statusMessage
      res.setHeader('Set-Cookie', router.context.storage.cookies!.getCookies())

      if (data) {
        res.setHeader('content-type', 'application/json')
        return res.end(JSON.stringify(data))
      } else {
        return res.end()
      }
    }
  }
  if (req.headers.accept?.includes('text/html')) {
    const router = AppContext.getContext().router
    if (router && req.originalUrl) {
      router.setUrl(req.originalUrl)
      const cookies = new Cookies(req.headers.cookie)
      router.context = {
        storage: {
          cookies,
        },
      }
      // reset router state
      router.clearCache()
      router.statusCode = 200
      router.statusMessage = 'success'

      try {
        await router.load({ req, res })
      } catch (e: any) {
        if (isRedirectError(e)) {
          res.writeHead((e as RedirectError).getRedirectStatus(), { Location: (e as RedirectError).getPath() })
          return res.end()
        }
      }

      const html = renderToString(createElement(Router, { router: router }))
      const processedHTML = await processHTMLTags(router, html, AppContext.getContext().vite, req)
      res.setHeader('Content-Type', 'text/html')
      res.statusCode = router.statusCode
      res.statusMessage = router.statusMessage
      res.setHeader('Set-Cookie', cookies.getCookies())
      return res.end(processedHTML)
    }
  }
}
