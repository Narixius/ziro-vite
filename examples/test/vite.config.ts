import { vitePluginSsrCss } from '@hiogawa/vite-plugin-ssr-css'
import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'
import tsconfigPaths from 'vite-tsconfig-paths'
import { ziro } from 'ziro'

export default defineConfig({
  plugins: [tsconfigPaths(), react(), ziro({}), vitePluginSsrCss({ entries: ['/@ziro/client-entry.jsx'] })],
})
