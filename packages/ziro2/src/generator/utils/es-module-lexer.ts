import { parse } from 'es-module-lexer'
import { transformModuleToESM } from './babel-utils'
import { getFilename } from './route-files-utils'

export type RouteFileInfo = {
  filepath: string
  index: boolean
  hasComponent: boolean
  hasMeta: boolean
  hasLoadingComponent: boolean
  hasLoader: boolean
  hasErrorBoundary: boolean
  hasActions: boolean
  hasMiddleware: boolean
}

export const getRouteFileInfo = async (filepath: string): Promise<RouteFileInfo> => {
  const moduleEsm = transformModuleToESM(filepath)
  if (typeof moduleEsm?.code !== 'undefined' && moduleEsm?.code !== null) {
    const r: RouteFileInfo = {
      filepath,
      index: false,
      hasActions: false,
      hasComponent: false,
      hasErrorBoundary: false,
      hasLoader: false,
      hasLoadingComponent: false,
      hasMeta: false,
      hasMiddleware: false,
    }
    const [_, exports] = await parse(moduleEsm.code)
    exports.forEach(exp => {
      if (exp.n === 'default') r.hasComponent = true
      if (exp.n === 'actions') r.hasActions = true
      if (exp.n === 'loader') r.hasLoader = true
      if (exp.n === 'meta') r.hasMeta = true
      if (exp.n === 'Loading') r.hasLoadingComponent = true
      if (exp.n === 'ErrorBoundary') r.hasErrorBoundary = true
      if (exp.n === 'middlewares') r.hasMiddleware = true
    })
    r.index = !getFilename(filepath)?.startsWith('_root') && !getFilename(filepath)?.startsWith('_layout')
    return r
  }
  throw new Error(`Failed to parse module: ${filepath}`)
}
