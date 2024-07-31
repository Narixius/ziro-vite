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
})

export const blogPageRoute = createRoute({
  parent: rootRoute,
  path: '/blog',
  component: blog,
})

export const singleBlogRoute = createRoute({
  parent: blogPageRoute,
  path: '/blog/$slug',
  component: singleBlog,
  loadingComponent: () => <TwoSeventyRing />,
  errorComponent: () => 'something went wrong loading this post!',
  loader: async () => {
    await new Promise(r => setTimeout(r, 2000))
    return {
      ok: true,
    }
  },
  async meta({ params }) {
    return {
      title: params.slug,
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
