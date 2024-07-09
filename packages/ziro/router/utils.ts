import path from 'node:path'
import { parseFilename, withoutTrailingSlash } from 'ufo'
import { rootRouteImportName } from './constants.js'

export const generateImportName = (filePath: string) => {
  let fileName = filePath.replace(/\.(tsx?|jsx?)/g, '').replace(/[.]/g, '')

  if (filePath.endsWith('_root')) return rootRouteImportName

  if (fileName.startsWith('/')) {
    fileName = fileName.slice(1)
  }
  fileName = fileName.replace(/\/(.)/g, function (_, group1) {
    return group1.toUpperCase()
  })

  return fileName
}

export const getImportPath = (from: string, to: string) => {
  const importPath = path.relative(from, to)
  return importPath.replace(/\.\w+$/, '')
}

export const generateRouterPath = (filePath: string) => {
  filePath = filePath.replace(/^\.\.\//, '').replace(/\.\w+$/, '')
  // Check if the filePath is exactly pages/index
  if (filePath === 'pages/index') {
    return '/'
  }
  // Replace /pages/something/index with /something/
  filePath = filePath.replace(/pages\/(.*)\/index$/, '/$1/')
  // Replace /pages/something with /something
  filePath = filePath.replace(/^pages\//, '/')
  return filePath
}

export const getFilename = (filePath: string) => {
  return parseFilename(filePath, { strict: false })
}

export const findParentDir = (filePath: string) => {
  return path.dirname(filePath)
}

export const normalizePathFromLayout = (path: string) => {
  const p = path.replace(/\.\w+$/, '').replace(/\/(.*)\/index$/, '/$1/')
  if (p === '/index') return '/'
  return withoutTrailingSlash(p.replaceAll('/_layout', '/'))
}

export const isLayoutFile = (path: string) => getFilename(path) === '_layout'
