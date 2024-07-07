import { init } from 'es-module-lexer'
import fg from 'fast-glob'
import { groupBy } from 'lodash-es'
import fs from 'node:fs'
import path from 'node:path'
import { joinURL, withTrailingSlash } from 'ufo'
import { createUnimport, Import } from 'unimport'
import { ViteDevServer } from 'vite'
import { rootRouteImportName } from './constants'
import { findParentDir, generateImportName, generateRouterPath, getImportPath, isLayoutFile, normalizePathFromLayout } from './utils'

export type GenerateRouterFunction = (options: { rootDir: string; pagesDirPath: string; dotZiroDirPath: string; server: ViteDevServer }) => Promise<void>

export const generateRouter: GenerateRouterFunction = async ({ rootDir, pagesDirPath, dotZiroDirPath, server }) => {
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
      name: 'createRootRoute',
      from: '@tanstack/react-router',
    },
    {
      name: 'createRoute',
      from: '@tanstack/react-router',
    },
  )

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

  routerContent += `const ${generateImportName(importPath)}Route = createRootRoute({
  component: ${generateImportName(importPath)}.default,
})
`
  await init
  for (const imp of pagesImports) {
    // const exports = await server.ssrLoadModule(imp.meta!.filePath)
    const importName = generateImportName(imp.from)
    routerContent += `
const ${importName}Route = createRoute({
  path: '${imp.meta!.path}',
  component: ${importName}.default,
  getParentRoute: () => ${imp.meta!.parentLayout}Route,
  ${true ? `loader: ${importName}.loader,` : ''}
  ${true ? `beforeLoad: ${importName}.beforeLoad,` : ''}
})
`
  }

  routerContent += '\n// generate route tree \n'
  const roots = groupBy(pagesImports, 'meta.parentLayout')
  const addChildrenRoutes = (key: string): string => {
    return `${key}Route.addChildren({${roots[key]
      .map(imp => {
        if (!isLayoutFile(imp.from)) return imp.as + 'Route,'
        else return `${imp.as!}Route: ${addChildrenRoutes(imp.as!)},`
      })
      .join(' ')}})`
  }
  routerContent += `const routeTree = ${addChildrenRoutes('pagesRoot')}`

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
