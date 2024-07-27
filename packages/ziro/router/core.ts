import { createHooks } from 'hookable'
import { ComponentType, memo } from 'react'
import { RouterContext, addRoute as addRou3Route, createRouter as createRou3Router, findRoute as findRou3Route } from 'rou3'

type ZeroRouteHooks<T> = {
  error: (error: Error) => void
  load: (data: T) => void
  paramsChanged: (params: Record<string, string>) => void
  match: (url: string, fullUrl: string) => void
}

export interface FileRoutesByPath {
  __root__: {
    parent: AnyRoute
  }
  ___root__: {
    parent: AnyRoute
  }
}

type RouteData<Route> = Route extends ZiroRoute<infer TParentFilePath, infer TParentLoaderData, infer TParentRoute> ? TParentLoaderData : any

export type LoaderArgs<TParent> = {
  params: Record<string, string>
  dataContext: TParent extends ZiroRoute<infer TParentFilePath, infer TParentLoaderData, infer TParentRoute> ? TParentLoaderData & RouteData<TParentRoute> : any
}

export type LoaderType<TLoaderData, TParent> = (args: LoaderArgs<TParent>) => Promise<TLoaderData>

export type ZiroRouteProps<T = any> = { params?: Record<string, string>; loaderData: T }
export type ZiroRouteComponent<T> = ComponentType<ZiroRouteProps<T>>
export type AnyRoute<TParent extends AnyRoute = any> = ZiroRoute<any, any, TParent>

export class ZiroRoute<TPath extends keyof FileRoutesByPath, TLoaderData, TParentRoute> {
  private hooks = createHooks<ZeroRouteHooks<TLoaderData>>()

  constructor(
    public component: ZiroRouteComponent<TLoaderData>,
    public path: TPath,
    public parent?: TParentRoute,
    public loader?: LoaderType<TLoaderData, TParentRoute>,
    public loadingComponent?: ComponentType,
    public errorComponent?: ComponentType,
    public meta?: Record<string, unknown>,
  ) {
    this.hooks.hook('match', (url, fullUrl) => {
      this.matchedUrl = url
      this.fullUrl = fullUrl
    })
  }

  private data?: TLoaderData
  public getData() {
    return this.data
  }
  public setData(data: TLoaderData) {
    this.data = data
  }

  private matchedUrl?: string
  public setMatchedUrl(matchedUrl: string) {
    this.matchedUrl = matchedUrl
  }
  public getMatchedUrl() {
    return this.matchedUrl
  }

  private fullUrl?: string
  public setFullUrl(fullUrl: string) {
    this.fullUrl = fullUrl
  }
  public getFullUrl() {
    return this.fullUrl
  }

  private params?: Record<string, string>
  public setParams(params: Record<string, string>) {
    this.params = params
  }
  public getParams() {
    return this.params
  }

  public on = this.hooks.hook
  public call = this.hooks.callHook
  public removeHook = this.hooks.removeHook
  public getHooks() {
    return this.hooks
  }
}

type CreateRouterOptions = {
  initialUrl: string
}
const hooks = createHooks<Record<ZiroRouterHooks, (router: ZiroRouter) => void>>()

export type ZiroRouterHooks = 'change-url'

export type ZiroRouter = {
  url: string
  setUrl: (url: string) => void
  tree: RouterContext<AnyRoute>
  routes: AnyRoute[]
  addRoute: (this: ZiroRouter, route: AnyRoute) => void
  findRoute: (this: ZiroRouter, url: string) => AnyRoute | undefined
  _lookupRoute: (this: ZiroRouter, path: string, fullUrl: string) => AnyRoute[]
  lookupRoute: (this: ZiroRouter, path: string) => AnyRoute[]
  hook: (hook: ZiroRouterHooks, callback: (router: ZiroRouter) => void) => void
  removeHook: (hook: ZiroRouterHooks, callback: (router: ZiroRouter) => void) => void
  push: (url: string, options?: ZiroRouterPushOptions) => void
  replace: (url: string, options?: Omit<ZiroRouterPushOptions, 'replace'>) => void
}

type ZiroRouterPushOptions = {
  replace?: boolean
  state?: Record<string, unknown>
}

export const createRouter = (opts: CreateRouterOptions): ZiroRouter => {
  return {
    url: opts.initialUrl,
    tree: createRou3Router<AnyRoute>(),
    routes: [],
    hook(hook, cb) {
      hooks.hook(hook, cb)
    },
    removeHook(hook, cb) {
      hooks.removeHook(hook, cb)
    },
    push(url, options = {}) {
      this.setUrl(url)
      if (typeof window !== 'undefined') {
        if (options.replace) window.history.replaceState({}, '', url)
        else window.history.pushState({}, '', url)
      }
    },
    replace(url, options = {}) {
      this.setUrl(url)
      if (typeof window !== 'undefined') window.history.replaceState({}, '', url)
    },
    setUrl(url) {
      this.url = url
      hooks.callHook('change-url', this)
    },
    addRoute(route) {
      addRou3Route(this.tree, 'GET', route.path!, route)
      this.routes.push(route)
    },
    findRoute(url: string) {
      const route = findRou3Route(this.tree, 'GET', url)
      if (route) {
        if (route[0].params) route[0].data.setParams(route[0].params)
        return route[0].data
      }
      return undefined
    },
    _lookupRoute(path, fullUrl: string) {
      const route = this.findRoute(path)
      if (route) {
        route.setMatchedUrl(path)
        route.setFullUrl(fullUrl)
      }
      if (route?.parent) {
        const parentRoute = this._lookupRoute(route.parent.path, fullUrl)
        return [route, ...(parentRoute ? parentRoute : [])]
      }
      if (route) return [route]
      return []
    },
    lookupRoute(path) {
      return this._lookupRoute(path, path).reverse()
    },
  }
}

export const createRoute = <TFilePath extends keyof FileRoutesByPath, TLoaderData = any, TParentRoute extends AnyRoute = FileRoutesByPath[TFilePath]['parent']>(
  options: Pick<ZiroRoute<TFilePath, TLoaderData, TParentRoute>, 'path' | 'parent' | 'component' | 'loader' | 'loadingComponent' | 'errorComponent' | 'meta'>,
) => {
  return new ZiroRoute(memo(options.component), options.path, options.parent, options.loader, options.loadingComponent, options.errorComponent, options.meta)
}

export const createRootRoute = <TLoaderData>(options: Pick<ZiroRoute<'__root__', TLoaderData, undefined>, 'component' | 'loader' | 'loadingComponent' | 'errorComponent' | 'meta'>) => {
  return new ZiroRoute(memo(options.component), '__root__', undefined, options.loader, options.loadingComponent, options.errorComponent, options.meta)
}
