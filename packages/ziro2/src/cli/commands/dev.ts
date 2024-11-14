import { defineCommand } from 'citty'
import { colors } from 'consola/utils'
import { createApp, eventHandler, fromNodeMiddleware, fromWebHandler, toNodeListener } from 'h3'
import { listen } from 'listhen'
import { upperFirst } from 'lodash-es'
import { createElement } from 'react'
import { renderToReadableStream } from 'react-dom/server.browser'
import { createServer } from 'vite'
import { Cache, DataContext } from '../../router'
import { Router } from '../../router/react'
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
    await configureDevServer()

    listen(toNodeListener(app), {
      clipboard: false,
      showURL: false,
      public: host,
      port,
      autoClose: true,
    }).then(async server => {
      AppContext.getContext().listener = server
      console.log()
      console.log(`  ${colors.green(`✦`)} ${colors.dim(`Server is running at:`)}`)
      const maxTypeLength = Math.max(...(await server.getURLs()).map(serverUrl => serverUrl.type.length), 'network'.length) + 1
      ;(await server.getURLs()).forEach(serverUrl => {
        const paddedType = serverUrl.type.padEnd(maxTypeLength)
        console.log(`  ${colors.blue('⦿')} ${colors.dim(upperFirst(paddedType))}: ${colors.whiteBright(colors.bold(colors.underline(serverUrl.url)))}`)
      })
      if (!host) console.log(`  ${colors.dim('𐄂')} ${colors.dim('Network'.padEnd(maxTypeLength) + ':')} ${colors.dim('use --host to expose network access')}`)
      console.log()
    })
  },
})

export default devCommand

export const configureDevServer = async () => {
  const vite = await createServer({
    server: { middlewareMode: true },
    appType: 'custom',
  })
  AppContext.getContext().vite = vite
  await AppContext.getContext().loadServerRouter()
  const h3 = AppContext.getContext().h3
  h3.use(fromNodeMiddleware(vite.middlewares))
  h3.use(renderer)
}

const renderer = eventHandler(
  fromWebHandler(async request => {
    const dataContext = new DataContext()
    const cache = new Cache()

    if (request.method === 'POST') {
      const actionResponse = await AppContext.getContext().router.handleAction(request, cache, dataContext)
      if (request.headers.get('accept')?.includes('application/json') || String(actionResponse.status)[0] === '3') return actionResponse
    }

    // partially render the route on the server to catch any error statuses
    const res = await AppContext.getContext().router.partiallyHandleRequest(request, cache, dataContext)
    if (res.status !== 200) return res
    // console.log(await AppContext.getContext().vite.transformIndexHtml(request.url, ''))
    const stream = await renderToReadableStream(
      createElement(Router, {
        initialUrl: request.url,
        router: AppContext.getContext().router,
        dataContext,
        cache,
      }),
      {
        onError(error, errorInfo) {
          console.error(error)
          console.error(errorInfo)
        },
      },
    )

    // if streaming is not activated
    // await stream.allReady

    return new Response(stream, {
      headers: { 'content-type': 'text/html' },
    })

    // const ssrReady = await renderSSRHead(dataContext.head)
    // const html = await AppContext.getContext().vite.transformIndexHtml(
    //   new URL(request.url).pathname,
    //   `<!DOCTYPE html>
    // 	<html ${ssrReady.htmlAttrs}>
    // 		<head>
    // 			${ssrReady.headTags}
    // 		</head>
    // 		<body ${ssrReady.bodyAttrs}>
    // 			${ssrReady.bodyTagsOpen}
    // 				<div id='root'>
    // 				${renderToString(
    //         createElement(Router, {
    //           initialUrl: parseURL(request.url).pathname,
    //           router: AppContext.getContext().router,
    //           dataContext,
    //           cache,
    //         }),
    //       )}
    // 				</div>
    // 			 ${ssrReady.bodyTags}
    // 			 <script>window.__routerCache = ${cache.serialize()}</script>
    // 		</body>
    // 	</html>`,
    // )
    // const headers = response.headers
    // headers.set('Content-Type', 'text/html')
    // return new Response(html, { headers })

    // find the route
    // render the ssr router
    // send the

    // AppContext.getContext().vite.transformIndexHtml(req.url!, `<div id="root"></div>`)
  }),
)
