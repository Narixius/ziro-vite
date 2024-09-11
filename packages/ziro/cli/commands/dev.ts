import { defineCommand } from 'citty'
import { colors } from 'consola/utils'
import { createApp, eventHandler, toNodeListener } from 'h3'
import { listen } from 'listhen'
import { upperFirst } from 'lodash-es'

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
    console.log(`${colors.bold('Z۰ro')} ${colors.gray('(Development)')}`)
  },
  async run({ args: { host, port } }) {
    const app = createApp()
    app.use(
      '/',
      eventHandler(() => 'Hello world!'),
    )
    listen(toNodeListener(app), {
      clipboard: false,
      showURL: false,
      public: host,
      port,
    }).then(async server => {
      console.log(colors.green('Server is running at:'))
      ;(await server.getURLs()).forEach(serverUrl => {
        console.log(` 🌐${colors.dim(upperFirst(serverUrl.type))}: ${colors.cyan(serverUrl.url)}`)
      })
      if (!host) console.log(` 🌐${colors.strikethrough(colors.dim('Network'))}: ${colors.dim('[use --host to expose to host]')}`)
    })
  },
})

export default devCommand
