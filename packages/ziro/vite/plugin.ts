import { defu } from 'defu'
import { joinURL } from 'ufo'
import { normalizePath, type Plugin } from 'vite'
import { generateRouter } from '../router/generator'

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
        server.middlewares.use(function (req, res, next) {
          if (req.headers['content-type'] && ['application/json', 'multipart/form-data'].includes(req.headers['content-type']?.toLowerCase())) return res.end('from backend')
          next()
        })
        generateRouter({ rootDir: server.config.root, pagesDirPath, dotZiroDirPath, server })
        server.watcher.on('all', async (eventName, filepath) => {
          let isRouteFileChanged = eventName === 'add' || (eventName === 'unlink' && normalizePath(filepath).startsWith(normalizePath(joinURL(server.config.root, config.pagesDir))))
          if (isRouteFileChanged) generateRouter({ rootDir: server.config.root, pagesDirPath, dotZiroDirPath, server })
        })
      },
    },
  ]
}
