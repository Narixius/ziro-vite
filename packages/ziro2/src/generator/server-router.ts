import { Import, createUnimport } from 'unimport'
import { RoutesManifest } from './manifest'
import { generateImportName, getImportPath } from './utils/route-files-utils'

export const generateServerRouterCode = async (manifestDirPath: string, manifest: RoutesManifest) => {
  const imports: Import[] = [
    {
      name: 'Router',
      from: 'ziro2/router',
    },
    {
      name: 'Route',
      from: 'ziro2/router',
    },
  ]
  let code = `\nconst router = new Router()\n\n`
  for (const [routeId, routeManifest] of Object.entries(manifest)) {
    const importName = generateImportName(routeManifest.routeInfo.filepath)
    const routeVariableName = `${importName}Route`
    imports.push({
      name: '*',
      as: importName,
      from: getImportPath(manifestDirPath, routeManifest.routeInfo.filepath),
    })
    code += `const ${routeVariableName} = new Route("${routeId}", {
${[
  routeManifest.parentId ? `  parent: ${generateImportName(manifest[routeManifest.parentId].routeInfo.filepath)}Route` : '',
  routeManifest.routeInfo.hasLoader ? `  loader: ${importName}.loader` : ``,
  routeManifest.routeInfo.hasActions ? `  actions: ${importName}.actions` : ``,
  routeManifest.routeInfo.hasMiddleware ? `  middlewares: ${importName}.middlewares` : ``,
  routeManifest.routeInfo.hasMeta ? `  meta: ${importName}.meta` : ``,
  `  props: {\n${[
    routeManifest.routeInfo.hasComponent ? `	component: ${importName}.default` : '',
    routeManifest.routeInfo.hasErrorBoundary ? `	ErrorBoundary: ${importName}.ErrorBoundary` : '',
    routeManifest.routeInfo.hasLoadingComponent ? `	LoadingComponent: ${importName}.Loading` : '',
  ]
    .filter(Boolean)
    .join(',\n')}
  }`,
]
  .filter(Boolean)
  .join(',\n')}\n})\n`
    if (routeManifest.routeInfo.index) {
      code += `router.addRoute(${routeVariableName})\n`
    }
    code += '\n'
  }
  code += `export default router\n`
  const { injectImports } = createUnimport({ imports })
  return (await injectImports(code)).code
}
