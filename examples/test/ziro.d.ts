import { blogPageRoute, rootRoute, singleBlogRoute } from './main'

declare module 'ziro/router' {
  interface FileRoutesByPath {
    '/blog/$category': {
      parent: typeof rootRoute
    }
    '/blog/$category/$slug': {
      parent: typeof blogPageRoute
    }
    '/blog/$category/$slug/edit': {
      parent: typeof singleBlogRoute
    }
  }
}
