import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'
import { ziro } from 'ziro'

export default defineConfig({
  plugins: [react(), ziro()],
})
