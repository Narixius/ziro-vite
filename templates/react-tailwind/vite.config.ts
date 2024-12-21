import tailwindcss from '@tailwindcss/vite'
import { defineConfig } from 'vite'
import tsconfigPaths from 'vite-tsconfig-paths'
import ziro from 'ziro/vite'

export default defineConfig({
  plugins: [tsconfigPaths(), ziro(), tailwindcss()],
})
