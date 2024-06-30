import fg from 'fast-glob'
import fs from 'node:fs'
import path from 'node:path'
import { joinURL } from 'ufo'
import { Import, createUnimport } from 'unimport'

export type GenerateRouterFunction = (options: { rootDir: string; pagesDirPath: string; dotZiroDirPath: string }) => Promise<void>

const rootRouteImportName = 'pagesRoot'

const generateImportName = (filePath: string) => {
  let fileName = filePath.replace(/\.(tsx?|jsx?)/g, '').replace(/[.]/g, '')

  if (filePath.endsWith('__root')) return rootRouteImportName

  if (fileName.startsWith('/')) {
    fileName = fileName.slice(1)
  }
  fileName = fileName.replace(/\/(.)/g, function (_, group1) {
    return group1.toUpperCase()
  })

  return fileName
}

const getImportPath = (from: string, to: string) => {
  const importPath = path.relative(from, to)
  return importPath.replace(/\.\w+$/, '')
}

const generateRouterPath = (filePath: string) => {
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

export const generateRouter: GenerateRouterFunction = async ({ rootDir, pagesDirPath, dotZiroDirPath }) => {
  let routeFiles = fg.sync([joinURL(pagesDirPath, '/**/*.{js,jsx,ts,tsx}')])
  let routerContent = ''

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
  const rootPath = routeFiles.find(path => path.startsWith(joinURL(pagesDirPath, '__root.')))
  if (rootPath) {
    routeFiles = routeFiles.filter(path => path !== rootPath)
    const importPath = getImportPath(dotZiroDirPath, rootPath)
    rootImports.push({
      name: 'default',
      as: generateImportName(importPath),
      from: importPath,
    })
  }

  // import route files

  for (const routePath of routeFiles) {
    const importPath = getImportPath(dotZiroDirPath, routePath)
    pagesImports.push({
      name: 'default',
      as: generateImportName(importPath),
      from: importPath,
    })
  }

  // create route objects

  routerContent += '\n// generate route objects \n'

  const importPath = getImportPath(dotZiroDirPath, rootPath!)

  routerContent += `const ${generateImportName(importPath)}Route = createRootRoute({
  component: ${generateImportName(importPath)},
})
`

  for (const imp of pagesImports) {
    routerContent += `
const ${generateImportName(imp.from)}Route = createRoute({
  path: '${generateRouterPath(imp.from)}',
  component: ${generateImportName(imp.from)},
  getParentRoute: () => ${rootRouteImportName}Route,
})
`
  }

  routerContent += '\n// generate route tree \n'

  routerContent += `const routeTree = ${rootRouteImportName}Route.addChildren({ ${pagesImports
    .map(imp => {
      return generateImportName(imp.from) + 'Route'
    })
    .join(', ')} })`

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
      .map(imp => {
        return `'${generateRouterPath(imp.from)}': {
      id: '${generateRouterPath(imp.from)}'
      path: '${generateRouterPath(imp.from)}'
      fullPath: '${generateRouterPath(imp.from)}'
      preLoaderRoute: typeof ${generateImportName(imp.from)}Route
      parentRoute: typeof ${rootRouteImportName}Route
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
  fs.writeFileSync(joinURL(dotZiroDirPath, 'routes.ts'), routerContent, 'utf8')
}
