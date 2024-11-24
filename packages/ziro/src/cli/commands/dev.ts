import { defineCommand } from 'citty'
import { colors } from 'consola/utils'
import { getPort } from 'get-port-please'
import { createApp, eventHandler, fromNodeMiddleware, fromWebHandler, toNodeListener } from 'h3'
import parse from 'html-react-parser'
import { listen } from 'listhen'
import { upperFirst } from 'lodash-es'
import { createElement } from 'react'
import { renderToReadableStream } from 'react-dom/server.browser'
import { parseURL } from 'ufo'
import { createServer } from 'vite'
import yoctoSpinner from 'yocto-spinner'
import { Cache, DataContext, Middleware } from '../../router'
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

    console.log()
    const spinner = yoctoSpinner({
      text: `${colors.dim(`Starting server...`)}`,
      spinner: {
        interval: 80,
        frames: [`  ${colors.yellow(`⦾`)}`, `  ${colors.yellow(`⦿`)}`],
      },
    }).start()
    await configureDevServer(parseInt(port))
    spinner.stop()

    listen(toNodeListener(app), {
      clipboard: false,
      showURL: false,
      public: host,
      port: {
        port: parseInt(port),
        verbose: false,
      },
      autoClose: true,
    }).then(async server => {
      AppContext.getContext().listener = server
      console.log(`  ${colors.green(`⦿`)} ${colors.dim(`Server is running at:`)}`)
      const maxTypeLength = Math.max(...(await server.getURLs()).map(serverUrl => serverUrl.type.length), 'network'.length) + 1
      ;(await server.getURLs()).forEach(serverUrl => {
        const paddedType = serverUrl.type.padEnd(maxTypeLength)
        console.log(`  ${colors.blueBright('⦿')} ${colors.dim(upperFirst(paddedType))}: ${colors.whiteBright(colors.bold(colors.underline(serverUrl.url)))}`)
      })
      if (!host) console.log(`  ${colors.dim('𐄂')} ${colors.dim('Network'.padEnd(maxTypeLength) + ':')} ${colors.dim('use --host to expose network access')}`)
      console.log()
    })
  },
})

export default devCommand

export const configureDevServer = async (port: number) => {
  const vite = await createServer({
    server: {
      middlewareMode: true,
      hmr: {
        port: await getPort({
          portRange: [port + 100, port + 105],
        }),
      },
    },
    clearScreen: false,
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
    let dataContext = new DataContext()
    const cache = new Cache()
    let responseStatus = 200
    let responseStatusText = ''

    if (request.method === 'POST') {
      const actionResponse = await AppContext.getContext().router.handleAction(request, cache, dataContext)
      if (actionResponse instanceof Response) {
        responseStatus = actionResponse.status
        responseStatusText = actionResponse.statusText
      }
      if (request.headers.get('accept')?.includes('application/json') || String(actionResponse.status)[0] === '3') {
        return actionResponse
      }
    }

    const isRestRequest = request.headers.get('accept')?.includes('application/json')

    const loaderResponse = new Response(null, { status: responseStatus, statusText: responseStatusText })
    let res
    switch (AppContext.getContext().options.routerOptions.mode) {
      case 'ssr':
        res = await AppContext.getContext().router.handleRequest(request, loaderResponse, cache, dataContext)
        break
      case 'partially-ssr':
        if (isRestRequest) res = await AppContext.getContext().router.handleRequest(request, loaderResponse, cache, dataContext)
        else res = await AppContext.getContext().router.partiallyHandleRequest(request, loaderResponse, cache, dataContext)
        break
      default:
        res = loaderResponse
        break
    }

    // partially render the route on the server to catch any error statuses
    if (String(res.status)[0] === '3') return res
    responseStatus = res.status

    if (isRestRequest) {
      return new Response(
        JSON.stringify({
          cache: cache.serialize(),
          middlewares: Object.fromEntries(
            AppContext.getContext()
              ?.router?.findRouteTree(parseURL(request.url).pathname)
              ?.tree?.map(route => {
                return [route.getId(), ((route.getMiddlewares() as Middleware[]) || []).map(middleware => middleware.name)]
              }) || [],
          ),
        }),
        {
          headers: {
            'Content-Type': 'application/json',
          },
        },
      )
    }

    const viteRenderedHtml = await AppContext.getContext().vite.transformIndexHtml(request.url, '<head></head><body></body>')
    const headContent = viteRenderedHtml.match(/<head[^>]*>([\s\S]*?)<\/head>/i)?.[1] || ''
    const bodyContent = viteRenderedHtml.match(/<body[^>]*>([\s\S]*?)<\/body>/i)?.[1] || ''

    const stream = await renderToReadableStream(
      createElement(Router, {
        initialUrl: request.url,
        router: AppContext.getContext().router,
        dataContext,
        cache,
        layoutOptions: {
          body: parse(bodyContent),
          head: parse(headContent),
        },
      }),
      {
        onError(error, errorInfo) {
          console.error(error)
        },
      },
    )
    // if streaming is not activated
    if (AppContext.getContext().options.routerOptions.mode === 'ssr') await stream.allReady

    return new Response(stream, {
      headers: { 'content-type': 'text/html' },
      status: responseStatus,
      statusText: responseStatusText,
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
