import { createRoot } from 'react-dom/client'
import { ZiroRoute, createLayoutRoute, createRootRoute, createRoute, createRouter } from 'ziro/router'
import { Router } from 'ziro/router/client'
import * as rootLayout from './pages/_layout'
import * as root from './pages/_root'
import * as blog from './pages/pokes'
import * as singleBlog from './pages/pokes/$pokemon'

const router = createRouter({
  initialUrl: window.location.pathname,
})

const baseRoute = createRoute({
  path: '',
  component: () => '',
})

export const rootRoute = createRootRoute({
  component: root.default,
  loadingComponent: () => 'root is loading...',
  meta: root.meta,
  loader: root.loader,
})

export const layoutRoute = createLayoutRoute({
  parent: rootRoute,
  component: rootLayout.default,
  errorComponent: rootLayout.ErrorComponent,
  loader: rootLayout.loader,
})

export const blogPageRoute = createRoute({
  parent: layoutRoute,
  path: '/blog',
  loadingComponent: () => 'blog page is loading...',
  component: blog.default,
  meta: blog.meta,
  loader: blog.loader,
})

export const singleBlogRoute = createRoute({
  parent: blogPageRoute,
  path: '/blog/$pokemon',
  component: singleBlog.default,
  loadingComponent: () => 'pokemon is loading...',
  errorComponent: singleBlog.ErrorComponent,
  loader: singleBlog.loader,
  meta: singleBlog.meta,
})

router.addRoute(blogPageRoute)
router.addRoute(singleBlogRoute)

const node = createRoot(document.getElementById('root')!)
node.render(<Router router={router} />)

declare module 'ziro/router' {
  interface FileRoutesByPath {
    _root: {
      parent: typeof baseRoute
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
  }
}
