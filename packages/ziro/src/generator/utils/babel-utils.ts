import { transformSync } from '@babel/core'
import fs from 'node:fs'

export const transformModuleToESM = (filepath: string) => {
  const code = fs.readFileSync(filepath, 'utf8')
  return transformSync(code, {
    filename: filepath,
    presets: ['@babel/preset-typescript', '@babel/preset-react'],
  })
}
