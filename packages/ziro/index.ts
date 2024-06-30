import { defu } from 'defu'
import { joinURL } from 'ufo'
import { normalizePath, type Plugin } from 'vite'
import { generateRouter } from './route/generator.js'

export type ZiroConfig = Partial<{
  pagesDir: string
}>

const defaultZiroConfig: Required<ZiroConfig> = {
  pagesDir: './pages',
}

export const ziro = (ziroConfig: ZiroConfig): Plugin[] => {
  const config = defu(ziroConfig, defaultZiroConfig)
  const dotZiroDirPath = joinURL(process.cwd(), '.ziro')
  const pagesDirPath = joinURL(process.cwd(), config.pagesDir)

  return [
    {
      name: 'Z۰ro',
      config(config, env) {
        return {
          ...config,
          optimizeDeps: {
            include: ['react', 'react/jsx-runtime', 'react/jsx-dev-runtime', 'react-dom/client'],
          },
          esbuild: {
            jsx: 'automatic',
          },
        }
      },
      async configureServer(server) {
        generateRouter({ rootDir: server.config.root, pagesDirPath, dotZiroDirPath })
        server.watcher.on('all', async (eventName, filepath) => {
          let isRouteFileChanged = eventName === 'add' || (eventName === 'unlink' && normalizePath(filepath).startsWith(normalizePath(joinURL(server.config.root, config.pagesDir))))

          if (isRouteFileChanged) generateRouter({ rootDir: server.config.root, pagesDirPath, dotZiroDirPath })
        })
      },
    },
  ]
}
