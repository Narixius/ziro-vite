import { createHooks } from 'hookable'
import { ComponentType, createElement } from 'react'
import { FallbackProps as ErrorComponentProps } from 'react-error-boundary'
import { RouterContext, addRoute as addRou3Route, createRouter as createRou3Router, findRoute } from 'rou3'
import { joinURL } from 'ufo'
import { useHead } from 'unhead'
import { abort } from './abort'
import { RedirectError, isRedirectError } from './redirect'
export { ErrorComponentProps }

type ZeroRouteHooks<T, TParent> = {
  error: (error: Error) => void
  load: (data: T | {}, dataContext?: RouteDataContext<TParent>) => void
  paramsChanged: (params: Record<string, string>) => void
  match: (url: string, fullUrl: string) => void
}

const DEFAULT_ROOT_PATH = '_root'

export interface FileRoutesByPath {}

export type ParsePathParams<T extends string, TAcc = never> = T extends `${string}$${infer TPossiblyParam}`
  ? TPossiblyParam extends `${infer TParam}/${infer TRest}`
    ? ParsePathParams<TRest, TParam extends '' ? '_splat' : TParam | TAcc>
    : TPossiblyParam extends ''
      ? '_splat'
      : TPossiblyParam | TAcc
  : TAcc

export type RouteParams<TPath extends string> = Record<ParsePathParams<TPath>, string>

export type RouteDataContext<TRoute> = (TRoute extends ZiroRoute<any, any, infer TParentLoaderData> ? TParentLoaderData : {}) &
  (TRoute extends ZiroRoute<any, infer TParent, any> ? RouteDataContext<TParent> : {})

export type LoaderArgs<TPath extends string, TParent> = {
  params: RouteParams<TPath> & (TParent extends ZiroRoute<infer TParentFilePath, any, any> ? RouteParams<TParentFilePath> : {})
  dataContext: RouteDataContext<TParent>
}

export type LoaderProps<TPath extends keyof FileRoutesByPath> = LoaderArgs<TPath, FileRoutesByPath[TPath]['parent']>

export type LoaderType<TPath extends string, TLoaderData, TParent> = (args: LoaderArgs<TPath, TParent>) => Promise<TLoaderData>

export type MetaProps<TPath extends string> = TPath extends keyof FileRoutesByPath ? RouteProps<TPath> : {}

export type MetaFn<TPath extends keyof FileRoutesByPath> = (args: MetaProps<TPath>) => Promise<Parameters<typeof useHead>[0]>

export type RouteProps<TPath extends keyof FileRoutesByPath> = {
  params: RouteParams<TPath>
  loaderData: FileRoutesByPath[TPath]['loaderData']
  dataContext: RouteDataContext<FileRoutesByPath[TPath]['parent']>
}

export type ZiroRouteComponent<TPath extends keyof FileRoutesByPath> = ComponentType<RouteProps<TPath>>
export type AnyRoute<TPath extends string = any, TParent extends AnyRoute = any, TLoaderData = any> = ZiroRoute<TPath, TParent, TLoaderData>
export type ZiroRouteErrorComponent = ComponentType<ErrorComponentProps>

export class ZiroRoute<TPath extends string, TParentRoute, TLoaderData> {
  private hooks = createHooks<ZeroRouteHooks<TLoaderData, TParentRoute>>()

  constructor(
    public component: ComponentType<any>,
    public path: TPath,
    public parent?: TParentRoute,
    public loader?: LoaderType<TPath, TLoaderData, TParentRoute>,
    public loadingComponent?: ComponentType,
    public errorComponent?: ZiroRouteErrorComponent,
    public meta?: (args: MetaProps<TPath>) => Promise<Parameters<typeof useHead>[0]>,
  ) {
    if (parent) {
      // @ts-ignore
      parent.on('load', (parentData, dataContext = {}) => {
        this.setDataContext({
          ...dataContext,
          ...parentData,
        })
      })
    }
    this.hooks.hook('match', (url, fullUrl) => {
      this.fullUrl = fullUrl
    })
  }

  private data?: TLoaderData | {}
  public getData() {
    return this.data
  }
  public setData(data: TLoaderData | {}) {
    this.data = data
    this.hooks.callHook('load', data, this.dataContext)
  }

  private dataContext?: RouteDataContext<TParentRoute>
  public getDataContext() {
    return this.dataContext
  }
  public setDataContext(data: RouteDataContext<TParentRoute>) {
    this.dataContext = data
  }

  private fullUrl?: string
  public setFullUrl(fullUrl: string) {
    this.fullUrl = fullUrl
  }
  public getFullUrl() {
    return this.fullUrl
  }
  public matchedUrl?: string
  public generateMatchedUrlFromParams(params: Record<string, string>) {
    if (params && Object.keys(params).length) {
      this.matchedUrl = this.path
      Object.keys(params).map(key => {
        // @ts-ignore
        this.matchedUrl = this.matchedUrl.replace(`$${key}`, params[key])
      })
    }
  }

  private params?: LoaderArgs<TPath, TParentRoute>['params']
  public setParams(params: LoaderArgs<TPath, TParentRoute>['params']) {
    this.params = params
    this.generateMatchedUrlFromParams(this.params)
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

  private getRouteUniqueKey() {
    return `${this.path}-${this.matchedUrl || this.path}`
  }

  public getLoaderStatus() {
    return loaderCache[this.getRouteUniqueKey()]
  }

  private router?: ZiroRouter
  public setRouter(router: ZiroRouter) {
    this.router = router
  }

  public async load() {
    const routeKey = this.getRouteUniqueKey()
    if (!this.loader) {
      loaderCache[routeKey] = {
        status: 'success',
        data: {},
      }
      this.setData({})
      return loaderCache[routeKey]
    }
    const cachedData = this.getLoaderStatus()
    if (cachedData) {
      this.setData(cachedData.data)
      return cachedData
    }

    loaderCache[routeKey] = {
      status: 'pending',
      data: null,
    }
    try {
      const data = await this.loader({
        params: this.params!,
        dataContext: this.dataContext!,
      })
      loaderCache[routeKey] = {
        status: 'success',
        data,
      }
      this.setData(data)
      return data
    } catch (data) {
      loaderCache[routeKey] = {
        status: 'error',
        data,
      }

      if (data instanceof Error && isRedirectError(data)) {
        this.router!.replace((data as RedirectError).getPath())
        console.log('route replaced with', (data as RedirectError).getPath())
      } else {
        throw data
      }
    }
  }
}

const loaderCache: Record<string, { status: 'error' | 'success' | 'pending'; data: any }> = {}

type CreateRouterOptions = {
  initialUrl: string
}
const hooks = createHooks<Record<ZiroRouterHooks, (router: ZiroRouter) => void>>()

export type ZiroRouterHooks = 'change-url'

export type ZiroRouter = {
  url: string
  setUrl: (url: string) => void
  tree: RouterContext<AnyRoute>
  addRoute: (this: ZiroRouter, route: AnyRoute) => void
  findRoute: (this: ZiroRouter, url: string) => AnyRoute | undefined
  _flatLookup: (this: ZiroRouter, path: string, fullUrl: string) => any
  flatLookup: (this: ZiroRouter, path: string) => AnyRoute[]
  hook: (hook: ZiroRouterHooks, callback: (router: ZiroRouter) => void) => void
  removeHook: (hook: ZiroRouterHooks, callback: (router: ZiroRouter) => void) => void
  push: (url: string, options?: ZiroRouterPushOptions) => void
  replace: (url: string, options?: Omit<ZiroRouterPushOptions, 'replace'>) => void
  createRoute: typeof createRoute
  createRootRoute: typeof createRootRoute
  createLayoutRoute: typeof createLayoutRoute
}

type ZiroRouterPushOptions = {
  replace?: boolean
  state?: Record<string, unknown>
}

export const createRouter = (opts: CreateRouterOptions): ZiroRouter => {
  const router: ZiroRouter = {
    url: opts.initialUrl,
    tree: createRou3Router<AnyRoute>(),
    hook(hook, cb) {
      return hooks.hook(hook, cb)
    },
    removeHook(hook, cb) {
      return hooks.removeHook(hook, cb)
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
      const serializedPath = route.path.replaceAll('$', ':')
      if (serializedPath !== DEFAULT_ROOT_PATH) {
        addRou3Route(this.tree, '', serializedPath, route)
        route.setRouter(this)
      }

      // check parent to add wildcard
      if (route.parent) {
        if ((route.parent as AnyRoute).errorComponent) {
          let parentRoutePath = route.parent.path
          if (parentRoutePath === DEFAULT_ROOT_PATH) parentRoutePath = '/'
          const notFoundRoutePath = joinURL(parentRoutePath, '**')
          const notFoundRoute = createRoute({
            path: notFoundRoutePath,
            parent: route.parent,
            loader: async () => abort(404, 'page not found'),
            component: () => createElement('span', {}, 'error'),
          })
          addRou3Route(this.tree, '', notFoundRoutePath, notFoundRoute)
          notFoundRoute.setRouter(this)
        }
      }
    },
    findRoute(url: string) {
      const route = findRoute(this.tree, '', url)
      if (route) {
        if (route.params) route.data.setParams(route.params)
        return route.data
      }
      return undefined
    },
    _flatLookup(path) {
      let route = this.findRoute(path)
      let params: any = {}
      const tree = []
      if (route) {
        tree.push(route)
        params = route.getParams()
      }
      while (route?.parent) {
        tree.push(route.parent)
        route = route.parent
        route?.setParams(params)
      }
      return tree
    },
    flatLookup(path) {
      return this._flatLookup(path, path).reverse()
    },
    createRoute(options) {
      const route = createRoute(options)
      this.addRoute(route)
      return route
    },
    createLayoutRoute(options) {
      const route = createLayoutRoute(options)
      route.setRouter(this)
      return route
    },
    createRootRoute(options) {
      const route = createRootRoute(options)
      route.setRouter(this)
      return route
    },
  }
  if (typeof window !== 'undefined')
    window.addEventListener('popstate', e => {
      router.setUrl(window.location.pathname)
    })
  return router
}

const createRoute = <TFilePath extends string, TParentRoute extends AnyRoute, TLoaderData = {}>(
  options: Pick<ZiroRoute<TFilePath, TParentRoute, TLoaderData>, 'path' | 'parent' | 'component' | 'loader' | 'loadingComponent' | 'errorComponent' | 'meta'>,
) => {
  return new ZiroRoute(options.component, options.path, options.parent, options.loader, options.loadingComponent, options.errorComponent, options.meta)
}

const createRootRoute = <TLoaderData = {}>(options: Pick<ZiroRoute<'_root', undefined, TLoaderData>, 'component' | 'loader' | 'loadingComponent' | 'errorComponent' | 'meta'>) => {
  return new ZiroRoute(options.component, '_root', undefined, options.loader, options.loadingComponent, options.errorComponent, options.meta)
}

const createLayoutRoute = <TParentRoute extends AnyRoute, TLoaderData = {}>(
  options: Pick<ZiroRoute<'', TParentRoute, TLoaderData>, 'parent' | 'component' | 'loader' | 'loadingComponent' | 'errorComponent' | 'meta'>,
) => {
  return new ZiroRoute(options.component, '', options.parent, options.loader, options.loadingComponent, options.errorComponent, options.meta)
}
