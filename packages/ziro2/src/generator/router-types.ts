import { createUnimport, Import } from 'unimport'
import { RoutesManifest } from './manifest'
import { cl, generateImportName, getImportPath } from './utils/route-files-utils'

export interface RoutesByRouteId {}

export const generateRoutesTypings = async (manifestDirPath: string, manifest: RoutesManifest) => {
  const imports: Import[] = [
    {
      from: 'ziro2/router',
      name: 'Route',
    },
  ]
  let code = `\ndeclare module 'ziro2/generator' {\n  interface RoutesByRouteId {\n`
  for (const [routeId, routeManifest] of Object.entries(manifest)) {
    const importName = generateImportName(routeManifest.routeInfo.filepath)
    imports.push({
      name: '*',
      as: importName,
      from: getImportPath(manifestDirPath, routeManifest.routeInfo.filepath),
    })
    code += `    "${routeId}": Route<"${routeId}", ${cl(routeManifest.routeInfo.hasLoader, ` Awaited<ReturnType<typeof ${importName}.loader>>`, `{}`)}, ${cl(
      routeManifest.routeInfo.hasActions,
      `typeof ${importName}.actions`,
      `{}`,
    )}, ${cl(routeManifest.routeInfo.hasMiddleware, `typeof ${importName}.middlewares`, `[]`)}, ${routeManifest.parentId ? `RoutesByRouteId["${routeManifest.parentId}"]` : `undefined`}>\n`
  }
  code += `  }\n}`
  const { injectImports } = createUnimport({ imports })
  return (await injectImports(code)).code
}
