import { createRoot } from 'react-dom/client'
import { createRootRoute, createRoute, createRouter } from 'ziro/router'
import { Router } from 'ziro/router/client'
import root from './pages/_root'
import blog from './pages/pokes'
import * as singleBlog from './pages/pokes/$pokemon'

const router = createRouter({
  initialUrl: window.location.pathname,
})

export const rootRoute = createRootRoute({
  component: root,
  loadingComponent: () => 'root is loading...',
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
  path: '/blog/$cat',
  loadingComponent: () => 'pokemons page is loading...',
  component: blog,
})

export const singleBlogRoute = createRoute({
  parent: blogPageRoute,
  path: '/blog/$cat/$pokemon',
  component: singleBlog.default,
  loadingComponent: () => 'pokemon is loading...',
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
    '/blog/$cat': {
      parent: typeof rootRoute
      route: typeof blogPageRoute
    }
    '/blog/$cat/$pokemon': {
      parent: typeof blogPageRoute
      route: typeof singleBlogRoute
    }
  }
}
