import * as rou3 from 'rou3'
import { parseURL } from 'ufo'
import { Cache } from './Cache'
import { AnyRoute } from './Route'
import { DataContext } from './RouteDataContext'
import { createAbortResponse } from './utils/abort'
import { createResponse } from './utils/response'

export interface RoutesByRouteId {}

export class Router {
  tree = rou3.createRouter<AnyRoute[]>()
  constructor(private baseUrl?: string) {}
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
    return {
      tree: tree?.data,
      params: tree?.params,
    }
  }

  async onRequest(request: Request, cache: Cache = new Cache(), dataContext: DataContext = new DataContext()) {
    const { tree, params } = this.findRouteTree(parseURL(request.url).pathname)
    if (tree) {
      // load each of the routes from the first one to the last one
      for (let i = 0; i < tree.length; i++) {
        const route = tree[i]
        await route.onRequest(request, params || {}, dataContext, cache)
      }
    }

    return dataContext
  }

  async onBeforeResponse(request: Request, response: Response, cache: Cache = new Cache(), dataContext: DataContext = new DataContext()) {
    const { tree, params } = this.findRouteTree(parseURL(request.url).pathname)
    if (tree) {
      // load each of the routes from the first one to the last one
      for (let i = 0; i < tree.length; i++) {
        const route = tree[i]
        await route.onBeforeResponse(request, response, params || {}, dataContext, cache)
      }
    }
  }

  async handleAction(request: Request, cache: Cache = new Cache(), dataContext: DataContext = new DataContext()) {
    const { tree, params } = this.findRouteTree(parseURL(request.url).pathname)
    if (tree) {
      const actionRoute = tree[tree.length - 1]
      // load each of the routes from the first one to the last one
      const actionResult = await actionRoute.handleAction(request, params || {}, dataContext, cache)
      return createResponse(actionResult)
    }
    return createAbortResponse(404, 'Not Found')
  }
}
