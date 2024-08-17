import { Head, Unhead } from '@unhead/schema'
import { createHooks } from 'hookable'
import { ComponentType } from 'react'
import { FallbackProps as ReactErrorBoundaryComponentProps } from 'react-error-boundary'
import { RouterContext, addRoute as addRou3Route, createRouter as createRou3Router, findRoute } from 'rou3'
import { joinURL } from 'ufo'
import { createHead } from 'unhead'
import { abort } from './abort.js'
import { RedirectError, isRedirectError } from './redirect.js'

type ZeroRouteHooks<T, TParent> = {
  error: (error: Error) => void
  load: (data: T | {}, dataContext?: RouteDataContext<TParent>) => void
  paramsChanged: (params: Record<string, string>) => void
  match: (url: string, fullUrl: string) => void
}

const DEFAULT_ROOT_PATH = '_root'

export interface FileRoutesByPath {}

export type ParsePathParams<T extends string, TAcc = never> = T extends `${string}:${infer TPossiblyParam}`
  ? TPossiblyParam extends `${infer TParam}/${infer TRest}`
    ? ParsePathParams<TRest, TParam extends '' ? '_splat' : TParam | TAcc>
    : TPossiblyParam extends ''
    ? '_splat'
    : TPossiblyParam | TAcc
  : TAcc

export type RouteParams<TPath extends string> = Record<ParsePathParams<TPath>, string>

export type RouteLoaderDataContext<TRoute> = (TRoute extends ZiroRoute<any, any, infer TParentLoaderData> ? TParentLoaderData : {}) &
  (TRoute extends ZiroRoute<any, infer TParent, any> ? RouteLoaderDataContext<TParent> : {})

export type RouteMiddlewareDataContext<TRoute> = (TRoute extends ZiroRoute<infer TPath, any, any>
  ? TPath extends keyof FileRoutesByPath
    ? IntersectionOfMiddlewareReturns<FileRoutesByPath[TPath]['middlewares']>
    : {}
  : {}) &
  (TRoute extends ZiroRoute<any, infer TParent, any> ? RouteMiddlewareDataContext<TParent> : {})

export type RouteDataContext<TRoute> = RouteLoaderDataContext<TRoute> & RouteMiddlewareDataContext<TRoute>

export type LoaderArgs<TPath extends RouteId, TParent> = {
  params: RouteParams<TPath>
  dataContext: RouteDataContext<TParent>
}

type AlsoAllowString<T> = T | (string & {})

export type RouteId = AlsoAllowString<keyof FileRoutesByPath>

export type LoaderProps<TPath extends RouteId> = LoaderArgs<TPath, TPath extends keyof FileRoutesByPath ? FileRoutesByPath[TPath]['parent'] : AnyRoute>

export type MiddlewareProps<TPath extends RouteId> = LoaderProps<TPath>
export type Middleware<TPath extends RouteId, ReturnType = unknown> = {
  name: string
  handler: (props: LoaderProps<TPath>) => Promise<ReturnType>
}
export type Middlewares<TPath extends RouteId> = Middleware<TPath>[]
export const createMiddleware = <TPath extends RouteId, ReturnType = unknown>(options: { name: string; handler: (props: LoaderProps<TPath>) => Promise<ReturnType> }) => {
  return options
}

export type LoaderType<TPath extends RouteId, TLoaderData, TParent> = (args: LoaderArgs<TPath, TParent>) => Promise<TLoaderData>
export type MetaProps<TPath extends string> = TPath extends keyof FileRoutesByPath ? RouteProps<TPath> : {}
export type MetaFn<TPath extends RouteId> = (args: MetaProps<TPath>) => Promise<Head>

type ExtractReturnTypesFromMiddleware<T extends readonly Middleware<any>[]> = {
  [K in keyof T]: T[K] extends Middleware<any> ? Awaited<ReturnType<T[K]['handler']>> : {}
}
type UnionToIntersection<U> = (U extends unknown ? (k: U) => void : never) extends (k: infer I) => void ? I : never
type IntersectionOfMiddlewareReturns<T extends readonly Middleware<any>[]> = UnionToIntersection<ExtractReturnTypesFromMiddleware<T>[number]>

export type RouteProps<TPath extends RouteId> = {
  params: RouteParams<TPath>
  loaderData: TPath extends keyof FileRoutesByPath ? (FileRoutesByPath[TPath]['route'] extends AnyRoute<any, any, infer LoaderData> ? LoaderData : any) : any
  dataContext: TPath extends keyof FileRoutesByPath ? RouteDataContext<FileRoutesByPath[TPath]['parent']> & IntersectionOfMiddlewareReturns<FileRoutesByPath[TPath]['middlewares']> : any
}

export type ErrorComponentProps = Pick<ReactErrorBoundaryComponentProps, 'error'> & Partial<Pick<ReactErrorBoundaryComponentProps, 'resetErrorBoundary'>> & { status?: number | string }
export type ZiroRouteComponent<TPath extends keyof FileRoutesByPath> = ComponentType<RouteProps<TPath>>
export type AnyRoute<TPath extends string = any, TParent extends AnyRoute = any, TLoaderData = any> = ZiroRoute<TPath, TParent, TLoaderData>
export type ZiroRouteErrorComponent = ComponentType<ErrorComponentProps>

export class ZiroRoute<TPath extends RouteId, TParentRoute, TLoaderData> {
  private hooks = createHooks<ZeroRouteHooks<TLoaderData, TParentRoute>>()

  constructor(
    public component: ComponentType<any>,
    public path: TPath,
    public parent?: TParentRoute,
    public loader?: LoaderType<TPath, TLoaderData, TParentRoute>,
    public loadingComponent?: ComponentType,
    public errorComponent?: ZiroRouteErrorComponent,
    public meta?: (args: MetaProps<TPath>) => Promise<Head>,
    public middlewares?: { name: string; handler: (props: LoaderArgs<TPath, TParentRoute>) => Promise<unknown> }[],
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

    if (!middlewares) this.middlewares = []
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
    this.setLoaderStatus({
      data,
    })
    this.hooks.callHook('load', data, this.dataContext)
  }

  private dataContext: RouteDataContext<TParentRoute> = {} as RouteDataContext<TParentRoute>
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
        this.matchedUrl = this.matchedUrl!.replace(`:${key}`, params[key])
      })
    }
  }

  private params?: RouteProps<TPath>['params']
  public setParams(params: RouteProps<TPath>['params']) {
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

  public getRouteUniqueKey() {
    return `${this.path}-${this.matchedUrl || this.path}`
  }

  private router?: ZiroRouter
  public setRouter(router: ZiroRouter) {
    this.router = router
    this.loadCachedData()
  }

  private loadCachedData() {
    if (this.getLoaderStatus() && this.getLoaderStatus().status === 'success') {
      //   if (typeof this.dataContext === 'undefined' || typeof this.data === 'undefined') {
      if (this.middlewares && this.middlewares.length)
        for (const middleware of this.middlewares) {
          const middlewareData = this.router!.cache[this.getRouteUniqueKey() + '-middleware:' + middleware.name]
          this.setDataContext({
            ...this.dataContext,
            ...middlewareData,
          })
        }

      this.setDataContext({
        ...this.dataContext,
        ...{ ...(this.parent as AnyRoute)?.getData(), ...(this.parent as AnyRoute)?.getDataContext() },
      })
      this.setData(this.getLoaderStatus().data)
      //   }
      return
    }
  }

  public async loadMeta() {
    if (this.meta) {
      await this.meta({
        params: this.params,
        loaderData: this.data,
        dataContext: this.dataContext,
      } as MetaProps<TPath>).then(this.router!.head.push)
    }
  }

  public getLoaderStatus() {
    return this.router!.cache[this.getRouteUniqueKey()]
  }
  public setLoaderStatus(options: Partial<RouteCacheValue>) {
    this.router!.cache[this.getRouteUniqueKey()] = {
      ...this.router!.cache[this.getRouteUniqueKey()],
      ...options,
    }
  }
  public async load() {
    if (this.getLoaderStatus() && (this.getLoaderStatus().status === 'success' || this.getLoaderStatus().status === 'error')) {
      this.loadCachedData()
      return
    }
    this.setLoaderStatus({
      loaderStatus: 'pending',
      middlewaresStatus: 'pending',
      status: 'pending',
    })
    try {
      await this.loadMiddlewares()
        .then(() => {
          this.setLoaderStatus({
            middlewaresStatus: 'success',
          })
        })
        .then(() => this.loadData())
        .then(() => {
          this.setLoaderStatus({
            loaderStatus: 'success',
          })
        })
        .then(() => this.loadMeta())
        .then(async () => {
          this.setLoaderStatus({
            status: 'success',
          })
        })
    } catch (data) {
      this.setLoaderStatus({
        loaderStatus: 'error',
        middlewaresStatus: 'error',
        status: 'error',
      })

      this.setData(data as TLoaderData)
      if (data instanceof Error && isRedirectError(data)) {
        if (this.router?.dehydrate) throw data
        this.router!.replace((data as RedirectError).getPath())
      } else {
        throw data
      }
    }
  }

  public async loadData() {
    if (!this.loader) {
      this.setData({})
      return
    }
    const cachedData = this.getLoaderStatus()
    if (cachedData['loaderStatus'] !== 'pending') {
      this.setData(cachedData.data)
      return cachedData
    }
    await this.loader({
      params: this.params!,
      dataContext: this.dataContext!,
    }).then(data => {
      this.setData(data)
    })
  }

  public async loadMiddlewares() {
    const middlewaresResponse = {}
    const middlewares = this.middlewares || []
    if (middlewares.length) {
      for (const middleware of middlewares) {
        await middleware
          .handler({
            dataContext: this.dataContext!,
            params: this.params!,
          })
          .then(data => {
            this.router!.cache[this.getRouteUniqueKey() + '-middleware:' + middleware.name] = data
            if (data) {
              Object.assign(middlewaresResponse, data)
            }
          })
      }

      this.dataContext = {
        ...this.dataContext!,
        ...middlewaresResponse,
      }
    }
  }
}

type CreateRouterOptions = {
  initialUrl?: string
}
const hooks = createHooks<Record<ZiroRouterHooks, (router: ZiroRouter) => void>>()

export type ZiroRouterHooks = 'change-url'

type LoadingStatus = 'error' | 'success' | 'pending'
type RouteCacheValue = { data: any; middlewaresStatus: LoadingStatus; loaderStatus: LoadingStatus; status: LoadingStatus }
export type ZiroRouter = {
  statusCode: number
  statusMessage: string
  head: Unhead
  cache: Record<string, RouteCacheValue> | Record<string, any>
  dehydrate: boolean
  setDehydration: (this: ZiroRouter, dehydrate: boolean) => void
  url?: string
  setUrl: (url: string) => void
  tree: RouterContext<AnyRoute>
  initializeRoute: (this: ZiroRouter, route: AnyRoute) => void
  findRoute: (this: ZiroRouter, url: string) => AnyRoute | undefined
  _flatLookup: (this: ZiroRouter, path: string, fullUrl: string) => any
  flatLookup: (this: ZiroRouter, path: string) => AnyRoute[]
  hook: (hook: ZiroRouterHooks, callback: (router: ZiroRouter) => void) => void
  removeHook: (hook: ZiroRouterHooks, callback: (router: ZiroRouter) => void) => void
  push: (url: string, options?: ZiroRouterPushOptions) => void
  replace: (url: string, options?: Omit<ZiroRouterPushOptions, 'replace'>) => void
  addRoute: typeof createRoute
  setRootRoute: typeof createRootRoute
  addLayoutRoute: typeof createLayoutRoute
  load: () => Promise<void>
}

type ZiroRouterPushOptions = {
  replace?: boolean
  state?: Record<string, unknown>
}

export const createRouter = (opts: CreateRouterOptions = {}): ZiroRouter => {
  let cache = {}
  if (typeof window !== 'undefined') {
    opts.initialUrl = window.location.pathname
    cache = (window as any).__ZIRO_DATA__ || {}
  }
  const router: ZiroRouter = {
    statusCode: 200,
    statusMessage: 'success',
    cache,
    dehydrate: false,
    head: createHead(),
    setDehydration(dehydrate) {
      this.dehydrate = dehydrate
    },
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
    initializeRoute(route) {
      //   const serializedPath = route.path.replaceAll('$', ':')
      const serializedPath = route.path
      if (serializedPath !== DEFAULT_ROOT_PATH) {
        addRou3Route(this.tree, '', serializedPath, route)
        route.setRouter(this)
      }
      // check parent to add wildcard
      //   if (route.parent) {
      if ((route.parent as AnyRoute)?.errorComponent) {
        let parentRoutePath = route.parent.path || '/'
        if (parentRoutePath === DEFAULT_ROOT_PATH) parentRoutePath = '/'
        const notFoundRoutePath = joinURL(parentRoutePath, '**')
        const r = this.findRoute(notFoundRoutePath)
        if (!r) {
          const notFoundRoute = createRoute({
            path: notFoundRoutePath,
            parent: route.parent,
            loader: async () => abort(404, 'page not found'),
            component: (route.parent as AnyRoute).errorComponent!,
            errorComponent: (route.parent as AnyRoute).errorComponent!,
          })
          addRou3Route(this.tree, '', notFoundRoutePath, notFoundRoute)
          notFoundRoute.setRouter(this)
        }
      }
      //   }
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
    addRoute(options) {
      const route = createRoute(options)
      this.initializeRoute(route)
      return route
    },
    addLayoutRoute(options) {
      const route = createLayoutRoute(options)
      route.setRouter(this)

      if ((route.parent as AnyRoute)?.errorComponent) {
        let parentRoutePath = route.parent?.path || '/'
        if (parentRoutePath === DEFAULT_ROOT_PATH) parentRoutePath = '/'
        const notFoundRoutePath = joinURL(parentRoutePath, '**')
        const r = this.findRoute(notFoundRoutePath)
        if (!r) {
          const notFoundRoute = createRoute({
            path: notFoundRoutePath,
            parent: route.parent,
            loader: async () => abort(404, 'page not found'),
            component: (route.parent as AnyRoute).errorComponent!,
            errorComponent: (route.parent as AnyRoute).errorComponent!,
          })
          addRou3Route(this.tree, '', notFoundRoutePath, notFoundRoute)
          notFoundRoute.setRouter(this)
        }
      }
      return route
    },
    setRootRoute(options) {
      const route = createRootRoute(options)
      route.setRouter(this)
      return route
    },
    async load() {
      this.dehydrate = true
      if (this.url) {
        const tree = this.flatLookup(this.url)
        let errorHandlerRoute = null
        for (const route of tree) {
          try {
            await route.load()
          } catch (e: any) {
            if (router.dehydrate && isRedirectError(e)) throw e
            if (errorHandlerRoute && !route.errorComponent) {
              errorHandlerRoute.setLoaderStatus({
                data: e,
                loaderStatus: 'error',
                middlewaresStatus: 'error',
                status: 'error',
              })
            }
            if (e.status) this.statusCode = e.status
            if (e.message) this.statusMessage = e.message
          }
          if (route.errorComponent) errorHandlerRoute = route
        }
      }
    },
  }
  if (typeof window !== 'undefined')
    window.addEventListener('popstate', e => {
      router.setUrl(window.location.pathname)
    })
  return router
}

const createRoute = <TFilePath extends string, TParentRoute extends AnyRoute, TLoaderData = {}>(
  options: Pick<ZiroRoute<TFilePath, TParentRoute, TLoaderData>, 'path' | 'parent' | 'component' | 'loader' | 'loadingComponent' | 'errorComponent' | 'meta' | 'middlewares'>,
) => {
  return new ZiroRoute(options.component, options.path, options.parent, options.loader, options.loadingComponent, options.errorComponent, options.meta, options.middlewares)
}

const createRootRoute = <TLoaderData = {}>(options: Pick<ZiroRoute<'_root', undefined, TLoaderData>, 'component' | 'loader' | 'loadingComponent' | 'errorComponent' | 'meta' | 'middlewares'>) => {
  return new ZiroRoute(options.component, '_root', undefined, options.loader, options.loadingComponent, options.errorComponent, options.meta, options.middlewares)
}

const createLayoutRoute = <TParentRoute extends AnyRoute, TLoaderData = {}>(
  options: Pick<ZiroRoute<'', TParentRoute, TLoaderData>, 'parent' | 'component' | 'loader' | 'loadingComponent' | 'errorComponent' | 'meta' | 'middlewares'>,
) => {
  return new ZiroRoute(options.component, '', options.parent, options.loader, options.loadingComponent, options.errorComponent, options.meta, options.middlewares)
}
