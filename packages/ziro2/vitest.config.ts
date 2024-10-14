// vitest.config.ts
import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    coverage: {
      provider: 'v8',
      exclude: ['./cli/*', './dist/*', './vitest.config.ts', './constraints.ts', './index.ts'],
    },
  },
})
