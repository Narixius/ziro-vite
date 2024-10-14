import { defineCommand } from 'citty'
import { colors } from 'consola/utils'
import { createApp, eventHandler, fromNodeMiddleware, readBody, readFormData, toNodeListener } from 'h3'
import { listen } from 'listhen'
import { upperFirst } from 'lodash-es'
import { createElement } from 'react'
import { renderToString } from 'react-dom/server'
import { createServer } from 'vite'
import { Router } from '../../router/client/components.js'
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
        console.log(`  ${colors.green(`✔`)} ${colors.dim(`Server is running at:`)}`)
        const maxTypeLength = Math.max(...(await server.getURLs()).map(serverUrl => serverUrl.type.length), 'network'.length) + 1
        ;(await server.getURLs()).forEach(serverUrl => {
          const paddedType = serverUrl.type.padEnd(maxTypeLength)
          console.log(`  ${colors.blue('🌐')}${colors.dim(upperFirst(paddedType))}: ${colors.whiteBright(colors.bold(colors.underline(serverUrl.url)))}`)
        })
        if (!host) console.log(`  ${colors.dim('✘')} ${colors.dim('Network'.padEnd(maxTypeLength) + ':')} ${colors.dim('use --host to expose network access')}`)
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
  h3.use(renderer)
}

const renderer = eventHandler(async event => {
  const req = event.node.req
  const res = event.node.res
  const method = req.method!

  const getBody = async () => {
    const contentType = req.headers['content-type']
    let data = null as unknown as any
    if (contentType) {
      if (['multipart/form-data', 'application/x-www-form-urlencoded'].some(value => contentType.includes(value))) {
        function formDataToObject(formData: FormData) {
          const obj: Record<string, any> = {}
          formData.forEach((value, key) => {
            if (typeof obj[key] !== 'undefined') {
              if (!Array.isArray(obj[key])) {
                obj[key] = [obj[key]]
              }
              obj[key].push(value)
            } else {
              obj[key] = value
            }
          })
          return obj
        }
        data = formDataToObject(await readFormData(event))
      }
      if (contentType === 'application/json') {
        data = await readBody(event)
      }
    }
    return data
  }

  if (['POST', 'GET'].includes(method.toUpperCase())) {
    const router = AppContext.getContext().router
    if (router && req.originalUrl) {
      router.setUrl(req.originalUrl)
      let data = null
      router.context = {
        storage: {
          cookies: new Cookies(req.headers.cookie),
        },
      }

      router.clearCache()
      router.statusCode = 200
      router.statusMessage = 'success'

      const isJsonResponse = req.headers.accept?.includes('application/json')

      try {
        if (method === 'GET') data = await router.load({ req, res, getBody }, isJsonResponse)
        if (method === 'POST') data = await router.loadAction({ req, res, getBody }, isJsonResponse)
      } catch (e: any) {
        if (isRedirectError(e)) {
          res.writeHead((e as RedirectError).getRedirectStatus(), { Location: (e as RedirectError).getPath(), 'Set-Cookie': router.context.storage.cookies!.getCookies() })
          return res.end()
        }
      }

      //   if (!String(router.statusCode).startsWith('2') && router.statusMessage !== 'success') {
      //     data = {
      //       error: router.statusMessage,
      //     }
      //   }

      res.statusCode = router.statusCode
      res.statusMessage = router.statusMessage
      res.setHeader('Set-Cookie', router.context.storage.cookies!.getCookies())

      if (isJsonResponse) {
        if (data) {
          res.setHeader('content-type', 'application/json')
          return res.end(JSON.stringify(data))
        } else {
          return res.end()
        }
      } else {
        const html = renderToString(createElement(Router, { router: router }))
        const processedHTML = await processHTMLTags(router, html, AppContext.getContext().vite, req)
        res.setHeader('Content-Type', 'text/html')
        return res.end(processedHTML)
      }
    }
  }
})
