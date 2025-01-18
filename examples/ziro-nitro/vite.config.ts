import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'
import tsconfigPaths from 'vite-tsconfig-paths'
// import ziro from 'ziro/vite'
import nitro from '@analogjs/vite-plugin-nitro'

export default defineConfig({
  plugins: [
    // tsconfigPaths(),
    // react(),
    // ziro(),
    nitro(
      {
        ssr: true,
        entryServer: './app/pages/index.tsx',
        apiPrefix: '/',
      },
      {
        srcDir: 'app',
        routesDir: 'pages',
        compatibilityDate: '2025-01-17',
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
      },
    ),
  ],
})
