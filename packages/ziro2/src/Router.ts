import * as rou3 from 'rou3'
import { parseURL } from 'ufo'
import { Cache } from './Cache'
import { AnyRoute } from './Route'
import { DataContext } from './RouteDataContext'

export interface FileRoutesByPath {}

export class Router {
  tree = rou3.createRouter<AnyRoute[]>()
  constructor(private hostname: string, private baseUrl?: string) {}
  addRoute(route: AnyRoute) {
    let tree = [route]
    while (true) {
      if (!tree[0].getParent()) break
      const parentRoute = tree[0].getParent()
      if (parentRoute) tree.unshift(parentRoute)
    }
    rou3.addRoute(this.tree, '', route.getId(), tree)
  }

  findRouteTree(path: string) {
    const tree = rou3.findRoute(this.tree, '', path)
    return tree
  }

  async onRequest(request: Request, cache: Cache = new Cache(), dataContext: DataContext = new DataContext()) {
    const tree = this.findRouteTree(parseURL(request.url).pathname)
    if (tree) {
      const routeTree = tree.data
      // load each of the routes from the first one to the last one
      for (let i = 0; i < routeTree.length; i++) {
        const route = routeTree[i]
        await route.onRequest(dataContext, request, tree.params || {}, cache)
      }
    }

    return dataContext
  }

  async onBeforeResponse(request: Request, response: Response, cache: Cache = new Cache(), dataContext: DataContext = new DataContext()) {
    const tree = this.findRouteTree(parseURL(request.url).pathname)
    if (tree) {
      const routeTree = tree.data
      // load each of the routes from the first one to the last one
      for (let i = 0; i < routeTree.length; i++) {
        const route = routeTree[i]
        await route.onBeforeResponse(dataContext, request, response, tree.params || {}, cache)
      }
    }
  }
}
