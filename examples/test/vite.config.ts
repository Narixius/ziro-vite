import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'
import tsconfigPaths from 'vite-tsconfig-paths'
import ziro from 'ziro/vite'
import { dashboard } from './plugins/dashboard'

export default defineConfig({
  plugins: [
    tsconfigPaths(),
    react(),
    ziro({
      plugins: [dashboard],
    }),
  ],
})
