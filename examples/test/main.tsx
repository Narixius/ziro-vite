import { lazy } from 'react'
import { createRoot } from 'react-dom/client'
import { ZiroRoute, createRouter } from 'ziro/router'
import { Outlet, Router } from 'ziro/router/client'
import { redirect } from 'ziro/router/redirect'
import * as rootLayout from './pages/_layout'
import * as root from './pages/_root'
import * as blog from './pages/pokes'
import * as singleBlog from './pages/pokes/$pokemon'

const router = createRouter({
  initialUrl: window.location.pathname,
})

export const rootRoute = router.createRootRoute({
  component: root.default,
  loadingComponent: () => 'root is loading...',
  meta: root.meta,
  loader: root.loader,
})

export const layoutRoute = router.createLayoutRoute({
  parent: rootRoute,
  component: rootLayout.default,
  errorComponent: rootLayout.ErrorComponent,
  loader: rootLayout.loader,
})

export const blogPageRoute = router.createRoute({
  parent: layoutRoute,
  path: '/blog',
  loadingComponent: () => 'blog page is loading...',
  component: blog.default,
  meta: blog.meta,
  loader: blog.loader,
})

export const singleBlogRoute = router.createRoute({
  parent: blogPageRoute,
  path: '/blog/$pokemon',
  component: singleBlog.default,
  loadingComponent: () => 'pokemon is loading...',
  errorComponent: singleBlog.ErrorComponent,
  loader: singleBlog.loader,
  meta: singleBlog.meta,
})

export const authRoute = router.createRoute({
  parent: rootRoute,
  path: '/auth',
  component: lazy(() => import('./pages/auth')),
})

const authMiddleware = router.createLayoutRoute({
  parent: rootRoute,
  component: () => <Outlet />,
  loader: async () => {
    if (localStorage.getItem('loggedIn') === 'true') {
      return {
        user: {
          name: localStorage.getItem('name'),
        },
      }
    } else redirect('/auth')
  },
})

const dashboardRoute = router.createRoute({
  parent: authMiddleware,
  path: '/dashboard',
  component: lazy(() => import('./pages/dashboard')),
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
