import { colors } from 'consola/utils'

export const sharedContext = {
  version: 'N/A',
}

export const printZiroHeader = () => {
  console.log(`  ${colors.bold('Z۰RO')} ${colors.dim(`v${sharedContext.version}`)} ${colors.dim(`[Development]`)}`)
}
