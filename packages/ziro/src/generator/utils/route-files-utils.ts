import defu from 'defu'
import path from 'node:path'
import { pathToFileURL } from 'node:url'
import { globSync } from 'tinyglobby'
import { joinURL, parseFilename, withoutTrailingSlash } from 'ufo'
import { GenerateManifestOptions } from '../manifest'
const rootRouteImportName = 'rootRoute'

export const generateImportName = (filePath?: string) => {
  if (!filePath) return ''
  let fileName = filePath
    .replace(/\.(tsx?|jsx?)/g, '')
    .replace(/[.]/g, '')
    .replaceAll('-', '_')

  if (filePath.endsWith('_root')) return rootRouteImportName

  if (fileName.startsWith('/')) {
    fileName = fileName.slice(1)
  }
  fileName = fileName.replace(/\/(.)/g, function (_, group1) {
    return group1.toUpperCase()
  })

  fileName = fileName.replace(':', '_')

  return fileName
}

export const getImportPath = (from: string, to: string) => {
  const importPath = path.relative(from, to)
  return importPath.replace(/\.\w+$/, '')
}

export const generateRouterPath = (filePath: string) => {
  filePath = filePath.replace(/^\.\.\//, '').replace(/\.\w+$/, '')
  // Check if the filePath is exactly pages/index
  if (filePath === '/index') {
    return '/'
  }
  // Replace /pages/something/index with /something/
  filePath = filePath.replace(/\/(.*)\/index$/, '/$1/')

  if (filePath.endsWith('/')) filePath = filePath.slice(0, -1)

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

export const isRouteRelatedFile = (pagesDirPath: string, path: string) => {
  //   if (path.startsWith(pagesDirPath)) {
  let filename = getFilename(path)!
  // remove file extension
  filename = filename.replace(/\.\w+$/, '')
  if (filename === 'index' || filename === '_layout' || filename === '_root' || filename?.startsWith(':')) {
    return true
  }
  //   }
  return false
}

export const findRouteFiles = (_options: Required<GenerateManifestOptions>) => {
  const options = defu(_options, {
    cwd: pathToFileURL(process.cwd()).href,
    pagesPath: 'pages',
  })
  const pagesDirPath = joinURL(options.cwd, options.pagesPath)
  return globSync([joinURL(pagesDirPath, '/**/*.{js,jsx,ts,tsx}')], {
    onlyFiles: true,
  }).filter(file => isRouteRelatedFile(pagesDirPath, file))
}

export const sortRoutes = (a: string, b: string) => {
  const depth = a.split('/').length - b.split('/').length
  const aFileName = getFilename(a)!
  const bFileName = getFilename(b)!
  if (depth === 0) {
    if (aFileName.startsWith('_root')) return -1
    else if (bFileName.startsWith('_root')) return 1
    if (aFileName.startsWith('_layout')) return -1
    else if (bFileName.startsWith('_layout')) return 1
  }
  return depth
}

export const cl = (condition: boolean, trueString: string, falseString: string) => {
  return condition ? trueString : falseString
}
