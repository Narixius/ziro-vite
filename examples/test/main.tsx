import { createRoot } from 'react-dom/client'
import { TwoSeventyRing } from 'react-svg-spinners'
import { createRootRoute, createRoute, createRouter } from 'ziro/router'
import { Router } from 'ziro/router/client'
import root from './pages/_root'
import blog from './pages/blog'
import * as singleBlog from './pages/blog/$slug'

const router = createRouter({
  initialUrl: window.location.pathname,
})

export const rootRoute = createRootRoute({
  component: root,
  async loader() {
    return {
      user: {
        name: 'alireza',
        id: 10,
      },
    }
  },
})

export const blogPageRoute = createRoute({
  parent: rootRoute,
  path: '/blog',
  component: blog,
  async loader() {
    return {
      latestBlogVersion: 1.2,
    }
  },
})

export const singleBlogRoute = createRoute({
  parent: blogPageRoute,
  path: '/blog/$slug',
  component: singleBlog.default,
  loadingComponent: () => <TwoSeventyRing />,
  errorComponent: singleBlog.ErrorComponent,
  loader: singleBlog.loader,
  meta: singleBlog.meta,
})

router.addRoute(rootRoute)
router.addRoute(blogPageRoute)
router.addRoute(singleBlogRoute)

const node = createRoot(document.getElementById('root')!)
node.render(<Router router={router} />)

declare module 'ziro/router' {
  interface FileRoutesByPath {
    '/blog': {
      parent: typeof rootRoute
      route: typeof blogPageRoute
    }
    '/blog/$slug': {
      parent: typeof blogPageRoute
      route: typeof singleBlogRoute
    }
  }
}
