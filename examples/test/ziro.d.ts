import { blogPageRoute, rootRoute, singleBlogRoute } from './main'

declare module 'ziro/router' {
  interface FileRoutesByPath {
    '/blog': {
      parent: typeof rootRoute
    }
    '/blog/:slug': {
      parent: typeof blogPageRoute
    }
    '/blog/:slug/edit': {
      parent: typeof singleBlogRoute
    }
  }
}
