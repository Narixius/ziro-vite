import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'
import tsconfigPaths from 'vite-tsconfig-paths'
import ziro from 'ziro/vite'

export default defineConfig({
  plugins: [
    tsconfigPaths(),
    react(),
    ziro({
      routerOptions: {
        mode: 'partially-ssr',
      },
    }),
  ],
})
