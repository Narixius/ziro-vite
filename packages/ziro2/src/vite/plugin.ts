import defu from 'defu'
import { writeFileSync } from 'node:fs'
import { joinURL } from 'ufo'
import { createUnplugin } from 'unplugin'
import { generateManifest, GenerateManifestOptions, generateRoutesTypings, generateServerRouterCode } from '../generator'

export type ZiroOptions = Partial<{
  pagesDir?: string
  manifestDirPath?: string
}>

const generateManifestFilesChain = async (manifestDirPath: string, manifestOptions: GenerateManifestOptions) => {
  return generateManifest(manifestOptions)
    .then(async manifest => {
      writeFileSync(joinURL(manifestDirPath, 'manifest.json'), JSON.stringify(manifest, null, 2), {
        encoding: 'utf8',
      })
      return manifest
    })
    .then(async manifest => {
      await generateServerRouterCode(manifestDirPath, manifest).then(code => {
        writeFileSync(joinURL(manifestDirPath, 'router.server.ts'), code, {
          encoding: 'utf8',
        })
      })
      return manifest
    })
    .then(async manifest => {
      await generateRoutesTypings(manifestDirPath, manifest).then(code => {
        writeFileSync(joinURL(manifestDirPath, 'routes.d.ts'), code, {
          encoding: 'utf8',
        })
      })
    })
}

const ZiroUnplugin = createUnplugin<ZiroOptions>(_options => {
  const options = defu(_options, {
    pagesDir: 'pages',
    manifestDirPath: '.ziro',
  })
  const cwd = process.cwd()
  let manifestDirPath = joinURL(cwd, options.manifestDirPath)
  let pagesDirPath = joinURL(cwd, options.pagesDir)
  const generateRouteFiles = async () => {
    await generateManifestFilesChain(manifestDirPath, {
      cwd,
      pagesPath: options.pagesDir,
    })
  }
  return {
    name: 'ziro',
    vite: {
      async configureServer(server) {
        manifestDirPath = joinURL(server.config.root, options.manifestDirPath)
        pagesDirPath = joinURL(server.config.root, options.pagesDir)
        await generateRouteFiles()
        server.watcher.on('all', async (eventName, filepath) => {
          await generateRouteFiles()
        })
      },
    },
  }
})

export default ZiroUnplugin.vite
