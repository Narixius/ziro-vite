import { createUnimport, Import } from 'unimport'
import { RoutesManifest } from './manifest'
import { cl, generateImportName, getImportPath } from './utils/route-files-utils'

export const generateRoutesTypings = async (manifestDirPath: string, manifest: RoutesManifest) => {
  const imports: Import[] = [
    {
      from: 'ziro/router',
      name: 'Route',
    },
    {
      from: 'ziro/router',
      name: 'GetRouteDataContext',
    },
    {
      from: 'ziro/router',
      name: 'IntersectionOfMiddlewaresResult',
    },
    {
      from: 'ziro/router',
      name: 'LoaderReturnType',
    },
  ]
  let code = `\ndeclare module 'ziro/router' {\n  interface RouteFilesByRouteId {\n`
  for (const [routeId, routeManifest] of Object.entries(manifest)) {
    const importName = generateImportName(routeManifest.routeInfo.filepath)
    imports.push({
      name: '*',
      as: importName,
      from: getImportPath(manifestDirPath, routeManifest.routeInfo.filepath),
    })
    code += `    "${routeId}": {
		route: Route<"${routeId}", ${cl(routeManifest.routeInfo.hasLoader, ` LoaderReturnType<typeof ${importName}.loader>`, `{}`)}, ${cl(
      routeManifest.routeInfo.hasActions,
      `typeof ${importName}.actions`,
      `{}`,
    )}, ${cl(routeManifest.routeInfo.hasMiddleware, `typeof ${importName}.middlewares`, `[]`)}, ${routeManifest.parentId ? `RouteFilesByRouteId["${routeManifest.parentId}"]["route"]` : `undefined`}>,
		dataContext: ${routeManifest.parentId ? `GetRouteDataContext<"${routeManifest.parentId}">` : `{}`} & IntersectionOfMiddlewaresResult<${cl(
      routeManifest.routeInfo.hasMiddleware,
      `typeof ${importName}.middlewares`,
      `[]`,
    )}>
	}\n`
  }

  code += `  }\n  interface RoutesByRouteId {
		routes: ${Object.values(manifest)
      .filter(route => route.routeInfo.index)
      .map(route => JSON.stringify(route.id))
      .join(' | ')}
    }\n`

  code += `}`
  const { injectImports } = createUnimport({ imports })
  return (await injectImports(code)).code
}
