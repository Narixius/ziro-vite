import { toLower } from 'lodash-es'
import * as rou3 from 'rou3'
import { parseURL } from 'ufo'
import { Cache } from './Cache'
import { AnyRoute } from './Route'
import { DataContext } from './RouteDataContext'

export interface FileRoutesByPath {}

export class Router {
  tree = rou3.createRouter<AnyRoute[]>()
  constructor(private hostname: string, private baseUrl?: string) {}
  addRoute(method: string, route: AnyRoute) {
    let tree = [route]
    while (true) {
      if (!tree[0].getParent()) break
      const parentRoute = tree[0].getParent()
      if (parentRoute) tree.unshift(parentRoute)
    }
    rou3.addRoute(this.tree, method, route.getId(), tree)
  }
  findRouteTree(method: string, path: string) {
    const tree = rou3.findRoute(this.tree, toLower(method), path)
    return tree
  }

  async load(request: Request, cache?: Cache) {
    const tree = this.findRouteTree(request.method, parseURL(request.url).pathname)
    if (tree) {
      const treeDataContext = new DataContext()
      const routeTree = tree.data
      // load each of the routes from the first one to the last one
      for (let i = 0; i < routeTree.length; i++) {
        const route = routeTree[i]
        await route.load(treeDataContext, request, tree.params, cache)
      }
    }
    return tree
  }
}
