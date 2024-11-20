import defu from 'defu'
import { pathToFileURL } from 'node:url'
import { joinURL } from 'ufo'
import { getRouteFileInfo, RouteFileInfo } from './utils/es-module-lexer'
import { findRouteFiles, generateRouterPath, getImportPath } from './utils/route-files-utils'

export type GenerateManifestOptions = {
  cwd?: string
  pagesPath?: string
}

export type RouteManifest = {
  id: string
  parentId?: string
  routeInfo: RouteFileInfo
}

export type RoutesManifest = {
  [key: string]: RouteManifest
}

function assignParentIds(manifest: RoutesManifest): RoutesManifest {
  const updatedManifest: RoutesManifest = JSON.parse(JSON.stringify(manifest))
  const findParentLayout = (routeId: string): string | undefined => {
    const parts = routeId.split('/').filter(Boolean)
    parts.pop() // Remove the current route part
    while (parts.length > 0) {
      const layoutId = '/' + parts.join('/') + '/_layout'
      if (updatedManifest[layoutId] && layoutId !== routeId) {
        return layoutId
      }
      parts.pop()
    }
    // If no layout is found and '/_layout' exists, return it
    if (updatedManifest['/_layout'] && '/_layout' !== routeId) {
      return '/_layout'
    }
    // If even '/_layout' doesn't exist, return '/_root' as the ultimate fallback
    return '/_root'
  }

  for (const [routeId, route] of Object.entries(updatedManifest)) {
    if (routeId === '/_root') {
      route.parentId = undefined // Root has no parent
    } else if (routeId === '/_layout') {
      route.parentId = '/_root' // Root layout's parent is /_root
    } else if (routeId.endsWith('/_layout')) {
      // For nested layouts, the parent is always the next level up layout
      route.parentId = findParentLayout(routeId)
    } else {
      // For regular routes, find the closest layout
      route.parentId = findParentLayout(routeId + '/dummy') // Add dummy to include current level
    }

    // Ensure we don't create circular references
    if (route.parentId === routeId) {
      route.parentId = '/_root'
    }
  }

  return updatedManifest
}

export const generateManifest = async (_options: GenerateManifestOptions) => {
  const options = defu(_options, {
    cwd: pathToFileURL(process.cwd()).href,
    pagesPath: 'pages',
  })
  const pagesDirFullPath = joinURL(options.cwd, options.pagesPath)
  const routeFiles = findRouteFiles(options)

  let manifest = await routeFiles.reduce(async (routesMapPromise, routeId) => {
    const routesMap = await routesMapPromise
    const routeInfo = await getRouteFileInfo(routeId)
    const routeImportPath = getImportPath(pagesDirFullPath, routeId)
    const id = routeInfo.index ? generateRouterPath(joinURL('/', routeImportPath)) : joinURL('/', routeImportPath)
    routesMap[id] = {
      id,
      routeInfo,
    }
    return routesMap
  }, {} as Promise<Record<string, RouteManifest>>)

  manifest = assignParentIds(manifest)
  return manifest
}
