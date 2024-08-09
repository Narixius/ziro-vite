import { createRoot } from 'react-dom/client'
import { ZiroRoute, createRouter } from 'ziro/router'
import { Router } from 'ziro/router/client'
import { redirect } from 'ziro/router/redirect'
import * as rootLayout from './pages/_layout'
import * as root from './pages/_root'
import * as Auth from './pages/auth'
import * as Dashboard from './pages/dashboard'
import * as blog from './pages/pokes'
import * as singleBlog from './pages/pokes/$pokemon'

const router = createRouter({
  initialUrl: window.location.pathname,
})

export const rootRoute = router.setRootRoute({
  component: root.default,
  loadingComponent: () => 'root is loading...',
  meta: root.meta,
  loader: root.loader,
})

export const layoutRoute = router.addLayoutRoute({
  parent: rootRoute,
  component: rootLayout.default,
  errorComponent: rootLayout.ErrorComponent,
  loader: rootLayout.loader,
})

export const blogPageRoute = router.addRoute({
  parent: layoutRoute,
  path: '/blog',
  loadingComponent: () => 'blog page is loading...',
  component: blog.default,
  meta: blog.meta,
  loader: blog.loader,
})

export const singleBlogRoute = router.addRoute({
  parent: blogPageRoute,
  path: '/blog/$pokemon',
  component: singleBlog.default,
  loadingComponent: () => 'pokemon is loading...',
  errorComponent: singleBlog.ErrorComponent,
  loader: singleBlog.loader,
  meta: singleBlog.meta,
})

export const authRoute = router.addRoute({
  parent: rootRoute,
  path: '/auth',
  component: Auth.default,
  loadingComponent: () => 'loading...',
})

const authMiddleware = router.addMiddleware({
  parent: rootRoute,
  handler: async () => {
    if (localStorage.getItem('loggedIn') === 'true') {
      return {
        user: {
          name: localStorage.getItem('name'),
        },
      }
    } else redirect('/auth')
  },
})

const dashboardRoute = router.addRoute({
  parent: authMiddleware,
  path: '/dashboard',
  component: Dashboard.default,
})

const node = createRoot(document.getElementById('root')!)
node.render(<Router router={router} />)

declare module 'ziro/router' {
  interface FileRoutesByPath {
    _root: {
      parent: undefined
      loaderData: typeof rootRoute extends ZiroRoute<any, any, infer TLoaderData> ? TLoaderData : {}
    }
    'layout:/pokes': {
      parent: typeof rootRoute
      loaderData: typeof layoutRoute extends ZiroRoute<any, any, infer TLoaderData> ? TLoaderData : {}
    }
    '/blog': {
      parent: typeof layoutRoute
      loaderData: typeof blogPageRoute extends ZiroRoute<any, any, infer TLoaderData> ? TLoaderData : {}
    }
    '/blog/$pokemon': {
      parent: typeof blogPageRoute
      loaderData: typeof singleBlogRoute extends ZiroRoute<any, any, infer TLoaderData> ? TLoaderData : {}
    }
    '/dashboard': {
      parent: typeof authMiddleware
      loaderData: typeof dashboardRoute extends ZiroRoute<any, any, infer TLoaderData> ? TLoaderData : {}
    }
    '/auth': {
      parent: typeof rootRoute
      loaderData: typeof authRoute extends ZiroRoute<any, any, infer TLoaderData> ? TLoaderData : {}
    }
  }
}
