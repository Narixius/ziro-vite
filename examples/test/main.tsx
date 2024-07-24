import { createRoot } from 'react-dom/client'
import { createRoute, createRouter } from 'ziro/router'
import { Router } from 'ziro/router/client'
import root from './pages/_root'
import blog from './pages/blog'
import singleBlog from './pages/blog/$slug'

const router = createRouter({
  initialUrl: window.location.pathname,
})

const rootRoute = createRoute({
  parent: null,
  path: '/',
  component: root,
})

const blogPageRoute = createRoute({
  parent: rootRoute,
  path: '/blog',
  component: blog,
})

const singleBlogRoute = createRoute({
  parent: blogPageRoute,
  path: '/blog/:slug',
  component: singleBlog,
})

router.addRoute(rootRoute)
router.addRoute(blogPageRoute)
router.addRoute(singleBlogRoute)

const node = createRoot(document.getElementById('root')!)
node.render(<Router router={router} />)
