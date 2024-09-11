#!/usr/bin/env node

import { defineCommand, runMain } from 'citty'

runMain(
  defineCommand({
    setup() {
      console.log()
    },
    subCommands: {
      dev: () => import('./commands/dev.js').then(m => m.default),
      build: () => import('./commands/build.js').then(m => m.default),
    },
  }),
)
