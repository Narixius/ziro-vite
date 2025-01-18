import { createNitro, build, createDevServer } from 'nitropack'

const nitro = await createNitro({
  compatibilityDate: '2025-01-17',
  preset: 'nitro-dev',
  logLevel: 'warn',
  experimental: {
    database: true,
  },
  database: {
    default: {
      connector: 'libsql',
      options: {
        url: `file:local.db`,
      },
    },
  },
})
const devserver = await createDevServer(nitro)
await devserver.listen({
  port: 3000,
  verbose: true,
})
// await build(nitro)
