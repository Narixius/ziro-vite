import reactServer from 'react-dom/server.node'
import { Outlet, Router as ReactRouter } from 'ziro/react'
import { Cache, DataContext, Route, Router } from 'ziro/router'
import { createElement as h } from 'react'

const router = new Router()
const rootRoute = new Route('_root', {
  parent: undefined,
  async loader() {
    const db = useDatabase()
    return {
      users: [],
    }
  },
  props: {
    Layout: ({ children }) => {
      return (
        <html>
          <head></head>
          <body>{children}</body>
        </html>
      )
    },
    component: () => {
      return (
        <div className="root">
          <Outlet />
        </div>
      )
    },
  },
})
const indexRoute = new Route('/', {
  parent: rootRoute,
  props: {
    component: () => {
      return <div>hello world</div>
    },
  },
})

router.addRoute(indexRoute)

export default defineEventHandler(event => {
  const cache = new Cache()
  const dataContext = new DataContext()
  return reactServer.renderToPipeableStream(<ReactRouter initialUrl="http://localhost:3000/" router={router} dataContext={dataContext} cache={cache} />)
})
