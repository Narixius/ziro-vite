import babel from '@babel/core'
import { parse } from 'es-module-lexer'
import fs from 'node:fs'

export type PageModuleInfo = {
  filepath: string
  hasComponent: boolean
  hasMeta: boolean
  hasLoading: boolean
  hasLoader: boolean
  hasError: boolean
  hasAction: boolean
  hasMiddleware: boolean
}

const transformModuleToESM = (filepath: string) => {
  const code = fs.readFileSync(filepath, 'utf8')
  return babel.transformSync(code, {
    filename: filepath,
    presets: ['@babel/preset-typescript', '@babel/preset-react'],
  })
}

export const getPageModuleInfo = async (filepath: string): Promise<PageModuleInfo> => {
  const moduleEsm = transformModuleToESM(filepath)
  if (moduleEsm?.code) {
    const r: PageModuleInfo = {
      filepath,
      hasAction: false,
      hasComponent: false,
      hasError: false,
      hasLoader: false,
      hasLoading: false,
      hasMeta: false,
      hasMiddleware: false,
    }
    const [_, exports] = await parse(moduleEsm.code)
    exports.forEach(exp => {
      if (exp.n === 'default') r.hasComponent = true
      if (exp.n === 'action') r.hasAction = true
      if (exp.n === 'loader') r.hasLoader = true
      if (exp.n === 'meta') r.hasMeta = true
      if (exp.n === 'Loading') r.hasLoading = true
      if (exp.n === 'ErrorComponent') r.hasError = true
      if (exp.n === 'middlewares') r.hasMiddleware = true
    })
    return r
  }
  throw new Error(`Failed to parse module: ${filepath}`)
}
