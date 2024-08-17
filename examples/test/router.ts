import { createRouter } from 'ziro/router'
import * as rootLayout from './pages/_layout'
import * as root from './pages/_root'
import * as Auth from './pages/auth'
import * as Dashboard from './pages/dashboard'
import * as singleBlog from './pages/pokes/:pokemon'
import * as blog from './pages/pokes/_layout'

export const router = createRouter()

const rootRoute = router.setRootRoute({
  component: root.default,
  loadingComponent: () => 'root is loading...',
  errorComponent: root.ErrorComponent,
  meta: root.meta,
  loader: root.loader,
})

const layoutRoute = router.addLayoutRoute({
  parent: rootRoute,
  component: rootLayout.default,
  loader: rootLayout.loader,
})

const blogPageRoute = router.addRoute({
  parent: rootRoute,
  path: '/blog',
  loadingComponent: () => 'blog page is loading...',
  component: blog.default,
  meta: blog.meta,
  loader: blog.loader,
  errorComponent: blog.ErrorComponent,
})

const singleBlogRoute = router.addRoute({
  parent: blogPageRoute,
  path: '/blog/:pokemon',
  component: singleBlog.default,
  loadingComponent: () => 'pokemon is loading...',
  errorComponent: singleBlog.ErrorComponent,
  loader: singleBlog.loader,
  meta: singleBlog.meta,
})

const authRoute = router.addRoute({
  parent: rootRoute,
  path: '/auth',
  component: Auth.default,
  loadingComponent: () => 'loading...',
})

const dashboardRoute = router.addRoute({
  parent: rootRoute,
  path: '/dashboard',
  component: Dashboard.default,
  loader: async () => ({ routeName: 'dashboard' }),
  middlewares: Dashboard.middlewares,
})

declare module 'ziro/router' {
  interface FileRoutesByPath {
    _root: {
      parent: undefined
      route: typeof rootRoute
      middlewares: []
    }
    '/pokes/_layout': {
      parent: typeof rootRoute
      route: typeof layoutRoute
      middlewares: []
    }
    '/blog': {
      parent: typeof rootRoute
      route: typeof blogPageRoute
      middlewares: []
    }
    '/blog/:pokemon': {
      parent: typeof blogPageRoute
      route: typeof singleBlogRoute
      middlewares: []
    }
    '/dashboard': {
      parent: typeof rootRoute
      route: typeof dashboardRoute
      middlewares: typeof Dashboard.middlewares
    }
    '/auth': {
      parent: typeof rootRoute
      route: typeof authRoute
      middlewares: []
    }
  }
}
