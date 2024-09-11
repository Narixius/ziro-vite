#!/usr/bin/env node

import { defineCommand, runMain } from 'citty'
import { readPackageJSON } from 'pkg-types'
import { sharedContext } from './commands/shared.js'

runMain(
  defineCommand({
    async setup() {
      console.log()
      const ziroPackageJson = await readPackageJSON(new URL('../../package.json', import.meta.url).toString())
      sharedContext.version = ziroPackageJson.version!
    },
    subCommands: {
      dev: () => import('./commands/dev.js').then(m => m.default),
      build: () => import('./commands/build.js').then(m => m.default),
    },
  }),
)
