import { defineCommand } from 'citty'
import { colors } from 'consola/utils'
import { createApp, eventHandler, toNodeListener } from 'h3'
import { listen } from 'listhen'
import { upperFirst } from 'lodash-es'
import { printZiroHeader } from './shared.js'

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
      console.log()
      console.log(`   ${colors.green(`✓`)} ${colors.white(`Server is running at:`)}`)
      ;(await server.getURLs()).forEach(serverUrl => {
        console.log(`   🌐${colors.white(upperFirst(serverUrl.type))}: ${colors.whiteBright(colors.bold(serverUrl.url))}`)
      })
      if (!host) console.log(`   🌐${colors.strikethrough(colors.white('Network'))}: ${colors.dim('use --host to expose network access')}`)
      console.log()
    })
  },
})

export default devCommand
