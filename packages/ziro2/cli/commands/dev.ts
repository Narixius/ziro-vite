import { defineCommand } from 'citty'
import { colors } from 'consola/utils'
import { createApp, eventHandler, fromNodeMiddleware, toNodeListener } from 'h3'
import { listen } from 'listhen'
import { upperFirst } from 'lodash-es'
import { createServer } from 'vite'
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
  return 'ziro is charged'
})
