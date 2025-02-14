import { Import, createUnimport } from 'unimport'
import { RouterOptions } from '../router'
import { PluginContext } from '../vite/plugin'
import { RoutesManifest } from './manifest'
import { generateImportName, getImportPath } from './utils/route-files-utils'

export const generateServerRouterCode = async (manifestDirPath: string, manifest: RoutesManifest, pluginContext: PluginContext, routerOptions: RouterOptions) => {
  const imports: Import[] = [
    {
      name: 'Router',
      from: 'ziro/router',
    },
    {
      name: 'Route',
      from: 'ziro/router',
    },
  ]
  let code = `\nconst router = new Router(${JSON.stringify(routerOptions, undefined, 2)})\n\n`
  for (const [routeId, routeManifest] of Object.entries(manifest)) {
    const importName = generateImportName(routeManifest.routeInfo.filepath)

    // const pluginCtx = routeManifest.plugin ? pluginContext[routeManifest.plugin] : undefined
    const routeVariableName = `${importName}Route`
    imports.push({
      name: '*',
      as: importName,
      from: getImportPath(manifestDirPath, routeManifest.routeInfo.filepath),
    })
    // const pluginConfigImportName = `pluginConfig${routeManifest.plugin}`
    // if (!!pluginCtx) {
    //   imports.push({
    //     name: 'config',
    //     as: pluginConfigImportName,
    //     from: getImportPath(manifestDirPath, pluginCtx.configPath),
    //   })
    // }
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
    routeManifest.routeInfo.hasLayout ? `	Layout: ${importName}.Layout` : '',
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
