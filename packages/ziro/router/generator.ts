import { Ref } from '@vue/reactivity'
import fg from 'fast-glob'
import fs from 'node:fs'
import path from 'node:path'
import { joinURL, withTrailingSlash } from 'ufo'
import { Import, createUnimport } from 'unimport'
import { ViteDevServer } from 'vite'
import { rootRouteImportName } from './constants.js'
import { AnyRoute, ZiroRouter, createRouter } from './core.js'
import { getPageModuleInfo } from './es-module-lexer.js'
import { findParentDir, generateImportName, generateRouterPath, getImportPath, isLayoutFile, isRouteRelatedFile, normalizePathFromLayout } from './utils.js'

export type GenerateRouterFunction = (options: {
  rootDir: string
  pagesDirPath: string
  dotZiroDirPath: string
  server: ViteDevServer
  router: Ref<ZiroRouter | undefined>
  generateRouteFile?: boolean
}) => Promise<void>

const generateCodeFromModuleInfo = (key: string, prop: string, moduleImportName: string, has: boolean) => {
  if (key === 'middlewares') return ''
  if (has) {
    return `${key}: ${moduleImportName}.${prop},`
  }
  return ''
}

export const generateRouter: GenerateRouterFunction = async ({ rootDir, pagesDirPath, dotZiroDirPath, server, router: serverRouter, generateRouteFile = true }) => {
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
  )

  let router = createRouter()

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
  if (rootPath) {
    const moduleInfo = await getPageModuleInfo(rootPath)
    routerContent += `const ${rootImportName}Route = router.setRootRoute({
  ${`${generateCodeFromModuleInfo('component', 'default', rootImportName, moduleInfo.hasComponent)}
  ${moduleInfo.hasLoader ? 'loader: clientLoader,' : ''}
  ${generateCodeFromModuleInfo('action', 'action', rootImportName, moduleInfo.hasAction)}
  ${generateCodeFromModuleInfo('meta', 'meta', rootImportName, moduleInfo.hasMeta)}
  ${generateCodeFromModuleInfo('loadingComponent', 'Loading', rootImportName, moduleInfo.hasLoading)}
  ${generateCodeFromModuleInfo('errorComponent', 'ErrorComponent', rootImportName, moduleInfo.hasError)}
  ${generateCodeFromModuleInfo('middlewares', 'middlewares', rootImportName, moduleInfo.hasMiddleware)}`.trim()}
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
    routerContent += `const ${importName}Route = router.${!isLayout ? 'addRoute' : 'addLayoutRoute'}({
  ${isLayout ? `id: '${imp.meta!.fullPath}',` : `path: '${imp.meta!.fullPath}',`}
  parent: ${imp.meta!.parentLayout}Route,
  ${`${generateCodeFromModuleInfo('component', 'default', importName, moduleInfo.hasComponent)}
  ${moduleInfo.hasLoader ? 'loader: clientLoader,' : ''}
  ${generateCodeFromModuleInfo('action', 'action', importName, moduleInfo.hasAction)}
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

  serverRouter.value = router

  routerContent += '\n\n// router types \n'

  routerContent += `declare module 'ziro/router' {
  interface FileRoutesByPath {
    _root: {
      parent: undefined
      route: typeof ${rootImportName}Route
    }
    ${pagesImports
      .map(imp => {
        return `'${imp.meta!.fullPath}': {
	  parent: typeof ${imp.meta!.parentLayout}Route
      route: typeof ${generateImportName(imp.from)}Route
	  middlewares: typeof ${generateImportName(imp.from)}.middlewares
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
