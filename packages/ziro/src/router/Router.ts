import defu from 'defu'
import * as rou3 from 'rou3'
import { parseURL } from 'ufo'
import { Cache } from './Cache'
import { AnyRoute, Route } from './Route'
import { DataContext } from './RouteDataContext'
import { wrapErrorAsResponse } from './utils'
import { abort, createAbortResponse } from './utils/abort'
import { createResponse } from './utils/response'

export interface RoutesByRouteId {}
export interface RouteFilesByRouteId {}

type RouterMode = 'ssr' | 'csr' | 'partially-ssr'
export type RouterOptions = {
  /**
   * Specifies the mode of the router.
   *
   * Available options:
   * - `ssr`: Full Server-Side Rendering.
   * - `csr`: Full Client-Side Rendering.
   * - `partially-ssr`: Executes middlewares first, then streams route loaders.
   *
   * @default "partially-ssr"
   */
  mode: RouterMode
}
export class Router<RouteProps = {}> {
  tree = rou3.createRouter<AnyRoute<any, any, any, any, any, RouteProps>[]>()
  private options: RouterOptions
  private environment: 'browser' | 'server' = !!(typeof window !== 'undefined' && window.document && window.document.createElement) ? 'browser' : 'server'

  constructor(_options?: RouterOptions) {
    this.options = defu(_options, {
      mode: 'partially-ssr',
    } as RouterOptions)
  }
  addRoute(route: AnyRoute<string, any, any, any, any, RouteProps>) {
    let tree = [route]
    let routePath = route.getId()
    if (route.getId().endsWith('_layout') || route.getId().endsWith('_root')) {
      routePath = route.getId().replace(/\/(_layout|_root)$/, '/**')
      const notFoundRoute = new Route('notFound', {
        loader: async () => abort(404, 'Page Not Found'),
      }) as AnyRoute
      tree = [route, notFoundRoute]
    }

    while (true) {
      if (!tree[0].getParent()) break
      const parentRoute = tree[0].getParent()
      if (parentRoute) tree.unshift(parentRoute)
    }

    rou3.addRoute(this.tree, '', routePath, tree)
  }

  findRouteTree(path: string) {
    const tree = rou3.findRoute(this.tree, '', String(path))
    return {
      tree: tree?.data,
      params: tree?.params,
    }
  }
  async handleRequestRemote(request: Request, cache: Cache = new Cache(), dataContext: DataContext = new DataContext()) {
    request.headers.append('accept', 'application/json')
    request.headers.append('X-ZIRO-Resolve-Remote-Data', '1')
    await fetch(request).then(async res => {
      const data = await res.clone().json()
      if (data) {
        cache.load(data.cache)
        dataContext.chargedRouteMiddlewareMap = data.middlewares
      }
      if (res.redirected) throw res
      return res
    })
  }
  async handleRequest(request: Request, response: Response = new Response(), cache: Cache = new Cache(), dataContext: DataContext = new DataContext()): Promise<Response> {
    const { tree, params } = this.findRouteTree(parseURL(request.url).pathname)

    if (this.environment === 'browser' && this.options.mode !== 'csr') {
      await this.handleRequestRemote(request, cache, dataContext)
    }

    if (tree) {
      try {
        for (let i = 0; i < tree.length; i++) {
          const route = tree[i]
          await route.onRequest(request, params || {}, dataContext, cache)
        }
      } catch (e) {
        if (e instanceof Response) {
          response = e
        }
        if (e instanceof Error) {
          response = wrapErrorAsResponse(e).response
        }
      }
      // run middlewares on before response
      while (dataContext.middlewaresStack.length > 0) {
        const middleware = dataContext.middlewaresStack.pop()
        if (middleware && middleware.onBeforeResponse) {
          await middleware.onBeforeResponse(request, response, params || {}, dataContext, cache)
        }
      }
    }

    return response
  }

  // in partially handle request, we only load middlewares and the target route loader
  // to have accurate response status code
  async partiallyHandleRequest(request: Request, response: Response, cache: Cache = new Cache(), dataContext: DataContext = new DataContext()): Promise<Response> {
    const { tree, params } = this.findRouteTree(parseURL(request.url).pathname)

    if (tree) {
      try {
        for (let i = 0; i < tree.length; i++) {
          const route = tree[i]
          if (i === tree.length - 1) {
            await route.onRequest(request, params as any, dataContext, cache)
          } else {
            await route.loadMiddlewaresOnRequest(request, params as any, dataContext, cache)
          }
        }
      } catch (e) {
        if (e instanceof Response) {
          response = e
        }
        if (e instanceof Error) {
          response = wrapErrorAsResponse(e).response
        }
      }
      // run middlewares on before response
      while (dataContext.middlewaresStack.length > 0) {
        const middleware = dataContext.middlewaresStack.pop()
        if (middleware) await middleware.onBeforeResponse(request, response, params || {}, dataContext, cache)
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
    if (this.environment === 'browser' && this.options.mode !== 'csr') {
      request.headers.append('accept', 'application/json')
      return fetch(request)
    }
    let actionResponse
    if (tree) {
      for (let i = 0; i < tree.length; i++) {
        const route = tree[i]
        if (i !== tree.length - 1) {
          route.loadMiddlewaresOnRequest(request, params || {}, dataContext, cache)
        } else {
          actionResponse = await route.handleAction(request, params || {}, dataContext, cache)
          if (!(actionResponse instanceof Response)) actionResponse = createResponse(actionResponse)
        }
      }
    } else {
      actionResponse = createAbortResponse(404, 'Not Found')
    }

    // run middlewares on before response
    while (dataContext.middlewaresStack.length > 0) {
      const middleware = dataContext.middlewaresStack.pop()
      if (middleware && middleware.onBeforeResponse) {
        await middleware.onBeforeResponse(request, actionResponse!, params || {}, dataContext, cache)
      }
    }
    return actionResponse!
  }
}
