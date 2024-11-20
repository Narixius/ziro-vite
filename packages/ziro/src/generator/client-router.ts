import { Import, createUnimport } from 'unimport'
import { RouterOptions } from '../router'
import { RoutesManifest } from './manifest'
import { generateImportName, getImportPath } from './utils/route-files-utils'

export const generateClientRouterCode = async (manifestDirPath: string, manifest: RoutesManifest, routerOptions: RouterOptions) => {
  const imports: Import[] = [
    {
      name: 'Router',
      from: 'ziro/router',
    },
    {
      name: 'Route',
      from: 'ziro/router',
    },
    {
      name: 'lazy',
      from: 'react',
    },
  ]
  let code = `\nconst router = new Router(${JSON.stringify(routerOptions, undefined, 2)})\n\n`
  for (const [routeId, routeManifest] of Object.entries(manifest)) {
    const importName = generateImportName(routeManifest.routeInfo.filepath)
    const routeVariableName = `${importName}Route`
    const importPath = getImportPath(manifestDirPath, routeManifest.routeInfo.filepath)
    imports.push({
      name: '*',
      as: importName,
      from: importPath,
    })
    code += `const ${routeVariableName} = new Route("${routeId}", {
${[
  routeManifest.parentId ? `  parent: ${generateImportName(manifest[routeManifest.parentId].routeInfo.filepath)}Route` : '',
  routeManifest.routeInfo.hasLoader ? `  loader: ${routerOptions.mode === 'csr' ? `${importName}.loader` : `async ()=>{}`}` : ``,
  routeManifest.routeInfo.hasActions && routerOptions.mode === 'csr' ? `  actions: ${importName}.actions` : ``,
  routeManifest.routeInfo.hasMiddleware && routerOptions.mode === 'csr' ? `  middlewares: ${importName}.middlewares` : ``,
  routeManifest.routeInfo.hasMeta ? `  meta: ${routerOptions.mode === 'csr' ? ` ${importName}.meta` : `(...args)=> import(${JSON.stringify(importPath)}).then(m=>m.meta(...args))`}` : ``,
  `  props: {\n${[
    routeManifest.routeInfo.hasComponent ? `	component: lazy(() => import(${JSON.stringify(importPath)}))` : '',
    routeManifest.routeInfo.hasErrorBoundary ? `	ErrorBoundary: lazy(() => import(${JSON.stringify(importPath)}).then(m => ({ default: m.ErrorBoundary })))` : '',
    routeManifest.routeInfo.hasLoadingComponent ? `	LoadingComponent: lazy(() => import(${JSON.stringify(importPath)}).then(m => ({ default: m.Loading })))` : '',
    routeManifest.routeInfo.hasLayout ? `	Layout: lazy(() => import(${JSON.stringify(importPath)}).then(m => ({ default: m.Layout })))` : '',
  ]
    .filter(Boolean)
    .join(',\n')}
  }`,
]
  .filter(Boolean)
  .join(',\n')}\n})\n`
    // if (routeManifest.routeInfo.index) {
    if (routeId !== '/_root' || (routeId === '/_root' && !manifest['/_layout'])) {
      code += `router.addRoute(${routeVariableName})\n`
    }
    // }
    // if (routeManifest.routeInfo.index) {
    // code += `router.addRoute(${routeVariableName})\n`
    //   }
    code += '\n'
  }
  code += `export default router\n`
  const { injectImports } = createUnimport({ imports })
  return (await injectImports(code)).code
}
