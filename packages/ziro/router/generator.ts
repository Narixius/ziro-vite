import fg from 'fast-glob'
import fs from 'node:fs'
import path from 'node:path'
import { joinURL, withTrailingSlash } from 'ufo'
import { Import, createUnimport } from 'unimport'
import { ViteDevServer } from 'vite'
import { AppContext } from '../cli/commands/shared.js'
import { rootRouteImportName } from './constants.js'
import { AnyRoute, createRouter } from './core.js'
import { PageModuleInfo, getPageModuleInfo } from './es-module-lexer.js'
import { findParentDir, generateImportName, generateRouterPath, getImportPath, isLayoutFile, isRouteRelatedFile, normalizePathFromLayout } from './utils.js'

export type GenerateRouterFunction = (options: { rootDir: string; pagesDirPath: string; dotZiroDirPath: string; server: ViteDevServer; generateRouteFile?: boolean }) => Promise<void>

const generateCodeFromModuleInfo = (key: string, prop: string, moduleImportName: string, has: boolean) => {
  if (key === 'middlewares') return ''
  if (has) {
    return `${key}: ${moduleImportName}.${prop},`
  }
  return ''
}

export const generateRouter: GenerateRouterFunction = async ({ rootDir, pagesDirPath, dotZiroDirPath, server, generateRouteFile = true }) => {
  let routeFiles = fg.sync([joinURL(pagesDirPath, '/**/*.{js,jsx,ts,tsx}')]).filter(file => isRouteRelatedFile(pagesDirPath, file))

  let routerContent = ``

  const rootImports: Import[] = []
  const pagesImports: Import[] = []

  // import tanstack router dependencies

  rootImports.push(
    {
      name: 'createRouter',
      from: 'ziro/router',
    },
    {
      name: 'clientLoader',
      from: 'ziro/router',
    },
    {
      name: 'IntersectionOfMiddlewareReturns',
      from: 'ziro/router',
    },
    {
      name: 'GetRouteLoader',
      from: 'ziro/router',
    },
    {
      name: 'GetRouteActions',
      from: 'ziro/router',
    },
  )

  let router = createRouter()
  AppContext.getContext().router = router

  const flatRoutes: Record<string, AnyRoute> = {}
  // import root if exists
  const rootPath = routeFiles.find(path => path.startsWith(joinURL(pagesDirPath, '_root.')))
  if (rootPath) {
    routeFiles = routeFiles.filter(path => path !== rootPath)
    const importPath = getImportPath(dotZiroDirPath, rootPath)
    rootImports.push({
      name: '*',
      as: generateImportName(importPath),
      from: importPath,
    })
    const rootModule = await server.ssrLoadModule(rootPath)
    const rootRoute = router.setRootRoute({
      component: rootModule.default,
      loadingComponent: rootModule.Loading,
      meta: rootModule.meta,
      loader: rootModule.loader,
      errorComponent: rootModule.ErrorComponent,
      middlewares: rootModule.middlewares,
    })
    flatRoutes['pagesRootRoute'] = rootRoute
  } else {
    flatRoutes['pagesRootRoute'] = router.getRootRoute()
  }

  // import route files
  routeFiles = routeFiles.filter(file => isRouteRelatedFile(pagesDirPath, file))
  for (const routeFilePath of routeFiles) {
    const importPath = getImportPath(dotZiroDirPath, routeFilePath)
    pagesImports.push({
      name: '*',
      as: generateImportName(importPath),
      from: importPath,
      meta: {
        filePath: routeFilePath,
      },
    })
  }

  // find parent layouts
  const setPropsBasedOnParentLayout = (page: Import, base = page.meta! && findParentDir(page.meta!.filePath)) => {
    const filePath = page.meta!.filePath
    // if there is a layout, return layout
    const layoutInBase = routeFiles.find(path => path.includes(joinURL(base, '_layout.')))
    if (layoutInBase && layoutInBase !== filePath) {
      const pathFromLayout = normalizePathFromLayout(joinURL('/', path.relative(findParentDir(layoutInBase), page.meta!.filePath)))
      page.meta = {
        ...(page.meta || {}),
        parentLayout: generateImportName(getImportPath(dotZiroDirPath, layoutInBase)),
        parentKey: generateRouterPath(getImportPath(dotZiroDirPath, layoutInBase)),
        path: pathFromLayout,
        fullPath: generateRouterPath(page.from),
        isLayout: isLayoutFile(page.from),
      }
      return
    }
    const isInTheRoot = base.split(withTrailingSlash(pagesDirPath)).length === 1
    if (isInTheRoot) {
      const pathFromLayout = normalizePathFromLayout(joinURL('/', path.relative(pagesDirPath, page.meta!.filePath)))
      page.meta = {
        ...(page.meta || {}),
        parentLayout: rootRouteImportName,
        parentKey: '_root',
        path: pathFromLayout,
        fullPath: generateRouterPath(page.from),
        isLayout: isLayoutFile(page.from),
      }
      return
    }
    // other wise, search for the parent folder
    setPropsBasedOnParentLayout(page, findParentDir(base))
  }
  pagesImports.forEach(page => setPropsBasedOnParentLayout(page))
  //  create router

  routerContent += '\n// generate router \n'
  routerContent += 'export const router = createRouter()'

  // create route objects

  routerContent += '\n\n// generate route objects \n'
  const rootImportName = 'pagesRoot'

  let rootModuleInfo: null | PageModuleInfo = null
  if (rootPath) {
    rootModuleInfo = await getPageModuleInfo(rootPath)
    routerContent += `const ${rootImportName}Route = router.setRootRoute<${rootModuleInfo.hasLoader ? `Awaited<ReturnType<typeof ${rootImportName}.loader>>` : '{}'}, ${
      rootModuleInfo.hasMiddleware ? `typeof ${rootImportName}.middlewares` : '[]'
    }>({
  ${`${generateCodeFromModuleInfo('component', 'default', rootImportName, rootModuleInfo.hasComponent)}
  ${rootModuleInfo.hasLoader ? `loader: clientLoader(${JSON.stringify('_root')}, router),` : ''}
  ${generateCodeFromModuleInfo('actions', 'actions', rootImportName, rootModuleInfo.hasActions)}
  ${generateCodeFromModuleInfo('meta', 'meta', rootImportName, rootModuleInfo.hasMeta)}
  ${generateCodeFromModuleInfo('loadingComponent', 'Loading', rootImportName, rootModuleInfo.hasLoading)}
  ${generateCodeFromModuleInfo('errorComponent', 'ErrorComponent', rootImportName, rootModuleInfo.hasError)}
  ${generateCodeFromModuleInfo('middlewares', 'middlewares', rootImportName, rootModuleInfo.hasMiddleware)}`.trim()}
})
`
  } else {
    routerContent += `const ${rootImportName}Route = router.getRootRoute()`
  }

  const generateRouteFromImportedModule = async (imp: Import) => {
    const importName = generateImportName(imp.from)
    if (!!flatRoutes[`${importName}Route`]) return
    const isLayout = isLayoutFile(imp.from)
    const moduleInfo = await getPageModuleInfo(imp.meta!.filePath)
    imp.meta!.moduleInfo = moduleInfo
    routerContent += `const ${importName}Route = router.${!isLayout ? 'addRoute' : 'addLayoutRoute'}<${
      isLayout
        ? `typeof ${imp.meta!.parentLayout}Route, ${moduleInfo.hasLoader ? `typeof ${importName}.loader` : '{}'}, ${moduleInfo.hasMiddleware ? `typeof ${importName}.middlewares` : '[]'}`
        : `'${imp.meta!.fullPath}', typeof ${imp.meta!.parentLayout}Route, ${moduleInfo.hasLoader ? `Awaited<ReturnType<typeof ${importName}.loader>>` : '{}'}, ${
            moduleInfo.hasActions ? `typeof ${importName}.actions` : '{}'
          }, ${moduleInfo.hasMiddleware ? `typeof ${importName}.middlewares` : '[]'}`
    }>({
  ${isLayout ? `id: '${imp.meta!.fullPath}',` : `path: '${imp.meta!.fullPath}',`}
  parent: ${imp.meta!.parentLayout}Route,
  ${`${generateCodeFromModuleInfo('component', 'default', importName, moduleInfo.hasComponent)}
  ${moduleInfo.hasLoader ? `loader: clientLoader(${JSON.stringify(imp.meta!.fullPath)}, router),` : ''}
  ${generateCodeFromModuleInfo('actions', 'actions', importName, moduleInfo.hasActions)}
  ${generateCodeFromModuleInfo('meta', 'meta', importName, moduleInfo.hasMeta)}
  ${generateCodeFromModuleInfo('loadingComponent', 'Loading', importName, moduleInfo.hasLoading)}
  ${generateCodeFromModuleInfo('errorComponent', 'ErrorComponent', importName, moduleInfo.hasError)}
  ${generateCodeFromModuleInfo('middlewares', 'middlewares', importName, moduleInfo.hasMiddleware)}`.trim()}
})
`
    const routeModule = await server.ssrLoadModule(imp.meta!.filePath)
    const routeProps = {
      path: isLayout ? undefined : imp.meta!.fullPath,
      id: isLayout ? imp.meta!.fullPath : undefined,
      component: routeModule.default,
      parent: flatRoutes[`${imp.meta!.parentLayout}Route`],
      loader: routeModule.loader,
      meta: routeModule.meta,
      loadingComponent: routeModule.Loading,
      errorComponent: routeModule.ErrorComponent,
      middlewares: routeModule.middlewares,
      action: routeModule.action,
    }
    if (isLayout) flatRoutes[`${importName}Route`] = router.addLayoutRoute(routeProps)
    else flatRoutes[`${importName}Route`] = router.addRoute(routeProps)
  }

  for (const imp of pagesImports) {
    const isParentCreated = !!flatRoutes[`${imp.meta!.parentLayout}Route`]
    if (!isParentCreated) {
      const localImp = pagesImports.find(impMap => impMap.as === imp.meta!.parentLayout)
      if (localImp) await generateRouteFromImportedModule(localImp)
    }
    await generateRouteFromImportedModule(imp)
  }

  routerContent += '\n\n// router types \n'

  routerContent += `declare module 'ziro/router' {
  interface FileRoutesByPath {
    _root: {
      parent: undefined
      route: typeof ${rootImportName}Route
      middlewares: ${rootModuleInfo?.hasMiddleware && !!rootPath ? `typeof ${generateImportName(getImportPath(dotZiroDirPath, rootPath))}.middlewares` : '[]'}
      dataContext: ${rootModuleInfo?.hasMiddleware ? `IntersectionOfMiddlewareReturns<FileRoutesByPath['_root']['middlewares']>` : `{}`}
      loaderData: GetRouteLoader<FileRoutesByPath['_root']['route']>
	  actions: {}
    }
    ${pagesImports
      .map(imp => {
        return `'${imp.meta!.fullPath}': {
	  parent: '${imp.meta!.parentKey}'
      route: typeof ${generateImportName(imp.from)}Route
	  middlewares: ${imp.meta!.moduleInfo.hasMiddleware ? `typeof ${generateImportName(imp.from)}.middlewares` : '[]'}
	  dataContext: FileRoutesByPath['${imp.meta!.parentKey}']['loaderData'] & FileRoutesByPath['${imp.meta!.parentKey}']['dataContext'] & IntersectionOfMiddlewareReturns<FileRoutesByPath['${
          imp.meta!.fullPath
        }']['middlewares']>
      loaderData: GetRouteLoader<FileRoutesByPath['${imp.meta!.fullPath}']['route']>
      actions: GetRouteActions<FileRoutesByPath['${imp.meta!.fullPath}']['route']>
    }`
      })
      .join('\n    ')}
  }
}`

  const { injectImports } = createUnimport({ imports: [...rootImports, ...pagesImports] })

  routerContent = (await injectImports(routerContent)).code
  if (generateRouteFile)
    fs.writeFileSync(
      joinURL(dotZiroDirPath, 'routes.d.ts'),
      `/* prettier-ignore-start */
/* eslint-disable */
// @ts-nocheck
// noinspection JSUnusedGlobalSymbols

${routerContent}`,
      'utf8',
    )
}
