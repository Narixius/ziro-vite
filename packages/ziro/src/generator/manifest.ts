import defu from 'defu'
import { pathToFileURL } from 'node:url'
import { joinURL } from 'ufo'
import { PluginContext } from '../vite/plugin'
import { getRouteFileInfo, RouteFileInfo } from './utils/es-module-lexer'
import { findRouteFiles, generateRouterPath, getImportPath, sortRoutes } from './utils/route-files-utils'

export type GenerateManifestOptions = {
  cwd?: string
  pagesPath?: string
}

export type RouteManifest = {
  id: string
  parentId?: string
  routeInfo: RouteFileInfo
  plugin?: string
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

export const generateManifest = async (_options: GenerateManifestOptions, pluginContext: PluginContext) => {
  const options = defu(_options, {
    cwd: pathToFileURL(process.cwd()).href,
    pagesPath: 'pages',
  })
  const pagesDirFullPath = joinURL(options.cwd, options.pagesPath)
  let routeFiles = findRouteFiles(options)
  const routesPluginsMap: {
    [routeId: string]: {
      routeId: string
      filePath: string
      plugin: string
    }
  } = {}
  // register plugin routes
  Object.keys(pluginContext).forEach(pluginKey => {
    const plugin = pluginContext[pluginKey]
    if (plugin.routes) {
      plugin.routes.forEach(route => {
        routesPluginsMap[route.filePath] = {
          routeId: route.routeId,
          plugin: pluginKey,
          filePath: route.filePath,
        }
      })
      routeFiles.push(...plugin.routes.map(r => r.filePath))
    }
  })

  routeFiles = routeFiles.sort(sortRoutes)

  let manifest = await routeFiles.reduce(async (routesMapPromise, routeId) => {
    const routesMap = await routesMapPromise
    const routePlugin = routesPluginsMap[routeId]
    let filePath = routeId
    if (routePlugin) {
      routeId = routePlugin.routeId
      filePath = routePlugin.filePath
    }
    const routeInfo = await getRouteFileInfo(filePath)
    const routeImportPath = getImportPath(pagesDirFullPath, filePath)
    const id = routePlugin ? routePlugin.routeId : routeInfo.index ? generateRouterPath(joinURL('/', routeImportPath)) : joinURL('/', routeImportPath)

    routesMap[id] = {
      id,
      routeInfo,
      plugin: !!routePlugin ? routePlugin.plugin : undefined,
    }

    return routesMap
  }, {} as Promise<Record<string, RouteManifest>>)

  manifest = assignParentIds(manifest)
  return manifest
}
