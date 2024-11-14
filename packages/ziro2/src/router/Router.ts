import * as rou3 from 'rou3'
import { parseURL } from 'ufo'
import { Cache } from './Cache'
import { AnyRoute } from './Route'
import { DataContext } from './RouteDataContext'
import { wrapErrorAsResponse } from './utils'
import { createAbortResponse } from './utils/abort'
import { createResponse } from './utils/response'

export interface RoutesByRouteId {}
export interface RouteFilesByRouteId {}

export class Router<RouteProps = {}> {
  tree = rou3.createRouter<AnyRoute<any, any, any, any, any, RouteProps>[]>()

  constructor(private baseUrl?: string) {}
  addRoute(route: AnyRoute<string, any, any, any, any, RouteProps>) {
    let tree = [route]
    while (true) {
      if (!tree[0].getParent()) break
      const parentRoute = tree[0].getParent()
      if (parentRoute) tree.unshift(parentRoute)
    }
    let routePath = route.getId()
    if (route.getId().endsWith('_layout') || route.getId().endsWith('_root')) {
      routePath = route.getId().replace(/\/(_layout|_root)$/, '/**')
    }
    rou3.addRoute(this.tree, '', routePath, tree)
  }

  findRouteTree(path: string) {
    const tree = rou3.findRoute(this.tree, '', path)
    return {
      tree: tree?.data,
      params: tree?.params,
    }
  }

  async handleRequest(request: Request, cache: Cache = new Cache(), dataContext: DataContext = new DataContext()): Promise<Response> {
    const { tree, params } = this.findRouteTree(parseURL(request.url).pathname)
    const routesStack: AnyRoute[] = []
    let response = new Response()
    if (tree) {
      try {
        for (let i = 0; i < tree.length; i++) {
          const route = tree[i]
          await route.onRequest(request, params || {}, dataContext, cache)
          // stack the routes
          routesStack.push(route)
        }
      } catch (e) {
        if (e instanceof Response) {
          response = e
        }
        if (e instanceof Error) {
          response = wrapErrorAsResponse(e).response
        }
      }
      // run middlewares on before esponse
      while (routesStack.length > 0) {
        const route = routesStack.pop()
        if (route && route.onBeforeResponse) {
          await route.onBeforeResponse(request, response, params || {}, dataContext, cache)
        }
      }
    }

    return response
  }

  async partiallyHandleRequest(request: Request, cache: Cache = new Cache(), dataContext: DataContext = new DataContext()): Promise<Response> {
    const { tree, params } = this.findRouteTree(parseURL(request.url).pathname)
    const routesStack: AnyRoute[] = []
    let response = new Response()
    if (tree) {
      try {
        for (let i = 0; i < tree.length; i++) {
          const route = tree[i]
          if (i === tree.length - 1) {
            await route.onRequest(request, params as any, dataContext, cache)
          } else {
            await route.loadMiddlewaresOnRequest(request, params as any, dataContext, cache)
          }
          // stack the routes
          routesStack.push(route)
        }
      } catch (e) {
        if (e instanceof Response) {
          response = e
        }
        if (e instanceof Error) {
          response = wrapErrorAsResponse(e).response
        }
      }
      // run middlewares on before esponse
      while (routesStack.length > 0) {
        const route = routesStack.pop()
        if (route && route.onBeforeResponse) {
          await route.onBeforeResponse(request, response, params || {}, dataContext, cache)
        }
      }
    }

    return response
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

  async handleAction(request: Request, cache: Cache = new Cache(), dataContext: DataContext = new DataContext()): Promise<Response> {
    const { tree, params } = this.findRouteTree(parseURL(request.url).pathname)

    if (tree) {
      const actionRoute = tree[tree.length - 1]
      // todo: load parent route middlewares, then load action route

      const actionResult = await actionRoute.handleAction(request, params || {}, dataContext, cache)
      if (actionResult instanceof Response) return actionResult
      return createResponse(actionResult)
    }
    return createAbortResponse(404, 'Not Found')
  }
}
