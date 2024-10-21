// vitest.config.ts
import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    reporters: ['basic'],
    silent: false,
    coverage: {
      provider: 'v8',
      include: ['src/*'],
      exclude: ['**/utils/**'],
    },
    server: {
      deps: {
        inline: ['@babel/preset-typescript'],
      },
    },
  },
})
