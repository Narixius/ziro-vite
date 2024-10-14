import { defineCommand } from 'citty'

const buildCommand = defineCommand({
  meta: {
    name: 'build',
    description: 'Run the development server',
  },
  run({ args }) {
    console.log(`building app`)
  },
})

export default buildCommand
