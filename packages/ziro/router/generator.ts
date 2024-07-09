import { AnyRoute, AnyRouter, createRootRouteWithContext, createRoute, createRouter } from '@tanstack/react-router'
import { Ref } from '@vue/reactivity'
import fg from 'fast-glob'
import { groupBy } from 'lodash-es'
import fs from 'node:fs'
import path from 'node:path'
import { joinURL, withTrailingSlash } from 'ufo'
import { createUnimport, Import } from 'unimport'
import { ViteDevServer } from 'vite'
import { rootRouteImportName } from './constants.js'
import { findParentDir, generateImportName, generateRouterPath, getImportPath, isLayoutFile, normalizePathFromLayout } from './utils.js'

export type GenerateRouterFunction = (options: { rootDir: string; pagesDirPath: string; dotZiroDirPath: string; server: ViteDevServer; router: Ref<AnyRouter | undefined> }) => Promise<void>

export const generateRouter: GenerateRouterFunction = async ({ rootDir, pagesDirPath, dotZiroDirPath, server, router: serverRouter }) => {
  let routeFiles = fg.sync([joinURL(pagesDirPath, '/**/*.{js,jsx,ts,tsx}')])

  let routerContent = ``

  const rootImports: Import[] = []
  const pagesImports: Import[] = []

  // import tanstack router dependencies

  rootImports.push(
    {
      name: 'createRouter',
      as: 'createReactRouter',
      from: '@tanstack/react-router',
    },
    {
      name: 'createRootRouteWithContext',
      from: '@tanstack/react-router',
    },
    {
      name: 'createRoute',
      from: '@tanstack/react-router',
    },
  )

  let router = createRouter({})
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
    const rootRoute = createRootRouteWithContext()({
      component: rootModule.default,
      loader: rootModule.loader,
      beforeLoad: rootModule.beforeLoad,
      notFoundComponent: () => 'not found!',
      meta: rootModule.meta,
    })
    flatRoutes['pagesRootRoute'] = rootRoute
  }

  // import route files
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
  const setPropsBasedOnParentLayout = (page: Import, base = page.meta && page.meta.filePath) => {
    const filePath = page.meta!.filePath
    const isInTheRoot = base.split(withTrailingSlash(pagesDirPath)).length === 1 || base.split(withTrailingSlash(pagesDirPath))[1].split('/').length === 1
    if (isInTheRoot) {
      const pathFromLayout = normalizePathFromLayout(joinURL('/', path.relative(pagesDirPath, page.meta!.filePath)))
      page.meta = {
        ...(page.meta || {}),
        parentLayout: rootRouteImportName,
        path: pathFromLayout,
        fullPath: generateRouterPath(page.from),
        isLayout: isLayoutFile(page.from),
      }
    } else {
      // if there is a layout, return layout
      const layoutPath = routeFiles.find(path => path.includes(joinURL(findParentDir(base), '_layout.')))
      if (layoutPath && layoutPath !== filePath) {
        const pathFromLayout = normalizePathFromLayout(joinURL('/', path.relative(findParentDir(layoutPath), page.meta!.filePath)))
        page.meta = {
          ...(page.meta || {}),
          parentLayout: generateImportName(getImportPath(dotZiroDirPath, layoutPath)),
          path: pathFromLayout,
          fullPath: generateRouterPath(page.from),
          isLayout: isLayoutFile(page.from),
        }
      } else {
        // other wise, search for the parent folder
        setPropsBasedOnParentLayout(page, findParentDir(filePath))
      }
    }
  }
  pagesImports.forEach(page => setPropsBasedOnParentLayout(page))

  // create route objects

  routerContent += '\n// generate route objects \n'

  const importPath = getImportPath(dotZiroDirPath, rootPath!)

  routerContent += `const ${generateImportName(importPath)}Route = createRootRouteWithContext()({
  component: ${generateImportName(importPath)}.default,
  notFoundComponent: () => 'not found!',
})
`
  for (const imp of pagesImports) {
    // const exports = await server.ssrLoadModule(imp.meta!.filePath)
    const importName = generateImportName(imp.from)
    routerContent += `
const ${importName}Route = createRoute({
  path: '${imp.meta!.path}',
  component: ${importName}.default,
  getParentRoute: () => ${imp.meta!.parentLayout}Route,
  loader: ${importName}.loader,
  beforeLoad: ${importName}.beforeLoad,
  staleTime: ${importName}.staleTime,
  meta: ${importName}.meta,
})`
    const routeModule = await server.ssrLoadModule(imp.meta!.filePath)
    flatRoutes[`${importName}Route`] = createRoute({
      path: imp.meta!.path,
      component: routeModule.default,
      getParentRoute: () => flatRoutes[`${imp.meta!.parentLayout}Route`],
      loader: routeModule.loader,
      beforeLoad: routeModule.beforeLoad,
      staleTime: routeModule.staleTime,
      meta: routeModule.meta,
    })
  }

  routerContent += '\n// generate route tree \n'
  const roots = groupBy(pagesImports, 'meta.parentLayout')

  const addChildrenRoutes = (key: string): string => {
    const children: [string, AnyRoute][] = []
    const childCode = `${key}Route.addChildren({${roots[key]
      .map(imp => {
        if (!imp.meta!.isLayout) {
          children.push([imp.as + 'Route', flatRoutes[imp.as + 'Route']])
          return imp.as + 'Route,'
        } else {
          children.push([imp.as + 'Route', flatRoutes[imp.as + 'Route']])
          return `${imp.as!}Route: ${addChildrenRoutes(imp.as!)},`
        }
      })
      .join(' ')}})`
    if (children.length) {
      flatRoutes[key + 'Route'] = flatRoutes[key + 'Route'].addChildren(Object.fromEntries(children))
    }
    return childCode
  }

  routerContent += `const routeTree = ${addChildrenRoutes('pagesRoot')}`

  router.update({
    routeTree: flatRoutes['pagesRootRoute'],
  })

  serverRouter.value = router

  routerContent += '\n\n// generate and export create router function \n'
  routerContent += `export function createRouter() {
  return createReactRouter({
    routeTree,
    context: {
      head: '',
    },
    defaultPreload: 'intent',
  })
}`

  routerContent += '\n\n// router types \n'

  routerContent += `declare module '@tanstack/react-router' {
  interface FileRoutesByPath {
    ${pagesImports
      .filter(imp => !imp.meta!.isLayout)
      .map(imp => {
        return `'${imp.meta!.fullPath}': {
      id: '${imp.meta!.fullPath}'
      path: '${imp.meta!.path}'
      fullPath: '${imp.meta!.fullPath}'
      preLoaderRoute: typeof ${generateImportName(imp.from)}Route
      parentRoute: typeof ${imp.meta!.parentLayout}Route
    }`
      })
      .join('\n    ')}
  }
  interface Register {
    router: ReturnType<typeof createRouter>
  }
}`

  const { injectImports } = createUnimport({ imports: [...rootImports, ...pagesImports] })

  routerContent = (await injectImports(routerContent)).code
  fs.writeFileSync(
    joinURL(dotZiroDirPath, 'routes.ts'),
    `/* prettier-ignore-start */
/* eslint-disable */
// @ts-nocheck
// noinspection JSUnusedGlobalSymbols
${routerContent}`,
    'utf8',
  )
}
