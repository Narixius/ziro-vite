import { createRoot } from 'react-dom/client'
import { TwoSeventyRing } from 'react-svg-spinners'
import { createRootRoute, createRoute, createRouter } from 'ziro/router'
import { Router } from 'ziro/router/client'
import root from './pages/_root'
import blog from './pages/blog'
import singleBlog from './pages/blog/$slug'

const router = createRouter({
  initialUrl: window.location.pathname,
})

export const rootRoute = createRootRoute({
  component: root,
  loader: async () => ({ root: true }),
})

export const blogPageRoute = createRoute({
  parent: rootRoute,
  path: '/blog',
  component: blog,
  loadingComponent: () => <TwoSeventyRing />,
  loader: async options => {
    return { time: 1234 }
  },
})

export const singleBlogRoute = createRoute({
  parent: blogPageRoute,
  path: '/blog/:slug',
  component: singleBlog,
  loadingComponent: () => <TwoSeventyRing />,
  errorComponent: () => 'something went wrong loading this post!',
  loader: async options => {
    options.dataContext
    return {
      ok: true,
    }
  },
})

export const singleBlogEditRoute = createRoute({
  parent: singleBlogRoute,
  path: '/blog/:slug/edit',
  component: singleBlog,
  loadingComponent: () => <TwoSeventyRing />,
  errorComponent: () => 'something went wrong loading this post!',
  loader: async options => {
    options.dataContext.
    return {
      ok: true,
    }
  },
})

router.addRoute(rootRoute)
router.addRoute(blogPageRoute)
router.addRoute(singleBlogRoute)

const node = createRoot(document.getElementById('root')!)
node.render(<Router router={router} />)

declare module 'ziro/router' {
  interface FileRoutesByPath {
    '/': {
      parent: typeof rootRoute
    }
    '/blog': {
      parent: typeof rootRoute
    }
    '/blog/:slug': {
      parent: typeof blogPageRoute
    }
  }
}
