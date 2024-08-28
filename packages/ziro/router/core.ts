import { Head, Unhead } from '@unhead/schema'
import { createHooks } from 'hookable'
import * as http from 'node:http'
import { ComponentType } from 'react'
import { FallbackProps as ReactErrorBoundaryComponentProps } from 'react-error-boundary'
import { RouterContext, addRoute as addRou3Route, createRouter as createRou3Router, findRoute } from 'rou3'
import { joinURL } from 'ufo'
import { createHead } from 'unhead'
import { Connect } from 'vite'
import { abort } from './abort.js'
import { RouteCacheEntry } from './cache/cache-manager.js'
import { SWRCache } from './cache/swr.js'
import DefaultErrorComponent from './default-error-component.js'
import DefaultRootRoute from './default-root.js'
import { RedirectError, isRedirectError } from './redirect.js'
import { Cookies } from './storage/cookies.js'

export const clientLoader = () => {
  if (window)
    return fetch(window.location.pathname, {
      method: 'GET',
      headers: {
        Accept: 'application/json',
      },
    }).then(async r => {
      const data = await r.json()
      if (r.ok) return data
      console.log(data.error ? data.error : data)
      throw new Error(data.error ? data.error : data)
    })
}

type ZeroRouteHooks<TLoaderData, TActionData, TParent> = {
  error: (error: Error) => void
  load: (data: TLoaderData | TActionData | {}, dataContext?: RouteDataContext<TParent>) => void
  paramsChanged: (params: Record<string, string>) => void
  match: (url: string, fullUrl: string) => void
}

type ZiroRouteMethod = 'POST' | 'GET'

export const DEFAULT_ROOT_PATH = '_root'

export interface FileRoutesByPath {}

export type ParsePathParams<T extends string, TAcc = never> = T extends `${string}:${infer TPossiblyParam}`
  ? TPossiblyParam extends `${infer TParam}/${infer TRest}`
    ? ParsePathParams<TRest, TParam extends '' ? '_splat' : TParam | TAcc>
    : TPossiblyParam extends ''
    ? '_splat'
    : TPossiblyParam | TAcc
  : TAcc

export type SafeRouteParams<TPath extends string> = keyof RouteParams<TPath> extends never ? undefined : RouteParams<TPath>

export type RouteParams<TPath extends string> = Record<ParsePathParams<TPath>, string>

export type RouteLoaderDataContext<TRoute> = (TRoute extends ZiroRoute<any, any, infer TParentLoaderData, any> ? TParentLoaderData : {}) &
  (TRoute extends ZiroRoute<any, infer TParent, any, any> ? RouteLoaderDataContext<TParent> : {})

export type RouteMiddlewareDataContext<TRoute> = (TRoute extends ZiroRoute<infer TPath, any, any, any>
  ? TPath extends keyof FileRoutesByPath
    ? IntersectionOfMiddlewareReturns<FileRoutesByPath[TPath]['middlewares']>
    : {}
  : {}) &
  (TRoute extends ZiroRoute<any, infer TParent, any, any> ? RouteMiddlewareDataContext<TParent> : {})

export type RouteDataContext<TRoute> = RouteLoaderDataContext<TRoute> & RouteMiddlewareDataContext<TRoute>

export type ZiroUtils = {
  storage: {
    cookies?: Cookies
  }
}

export type LoaderArgs<TPath extends RouteId, TParent> = {
  params: RouteParams<TPath>
  dataContext: RouteDataContext<TParent>
  utils: ZiroUtils
  serverContext?: ServerContext
}

export type AlsoAllowString<T> = T | (string & {})

export type RouteId = AlsoAllowString<keyof FileRoutesByPath>

export type LoaderProps<TPath extends RouteId> = LoaderArgs<TPath, TPath extends keyof FileRoutesByPath ? FileRoutesByPath[TPath]['parent'] : AnyRoute>

export type MiddlewareProps<TPath extends RouteId> = LoaderProps<TPath>
export type Middleware<TPath extends RouteId = '_root', ReturnType = unknown> = {
  name: string
  handler: (props: LoaderProps<TPath>) => Promise<ReturnType>
}
export type Middlewares<TPath extends RouteId = '_root'> = Middleware<TPath>[]
export const createMiddleware = <TPath extends RouteId, ReturnType = unknown>(options: { name: string; handler: (props: LoaderProps<TPath>) => Promise<ReturnType> }) => {
  return options
}

export type LoaderType<TPath extends RouteId, TLoaderData, TParent> = (args: LoaderArgs<TPath, TParent>) => Promise<TLoaderData>
export type ActionType<TPath extends RouteId, TActionData, TParent> = (args: LoaderArgs<TPath, TParent>) => Promise<TActionData>

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
export type AnyRoute<TPath extends string = any, TParent extends AnyRoute = any, TLoaderData = any, TActionData = any> = ZiroRoute<TPath, TParent, TLoaderData, TActionData>
export type ZiroRouteErrorComponent = ComponentType<ErrorComponentProps>

export class ZiroRoute<TPath extends RouteId, TParentRoute, TLoaderData, TActionData> {
  private hooks = createHooks<ZeroRouteHooks<TLoaderData, TActionData, TParentRoute>>()

  constructor(
    public component: ComponentType<any>,
    public path: TPath,
    public parent?: TParentRoute,
    public loader?: LoaderType<TPath, TLoaderData, TParentRoute>,
    public action?: ActionType<TPath, TActionData, TParentRoute>,
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

  public revalidate() {
    this.router!.cache.revalidate(this.getRouteUniqueKey(), this.load.bind(this))
  }
  private data?: TLoaderData | TActionData | {}
  public getData() {
    return this.data
  }
  public setData(data: TLoaderData | TActionData | {}) {
    if (data instanceof Error) {
      data = {
        name: data.name,
        message: data.message,
        stack: data.stack,
      }
    }

    this.data = data
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

  public async load(ignoreCache: boolean = false) {
    try {
      return await this.loadMiddlewares(ignoreCache)
        .then(this.loadData.bind(this, ignoreCache))
        .then(this.loadMeta.bind(this))
        .then(() => {
          return this.data
        })
    } catch (data) {
      this.setData(data as TLoaderData | TActionData | {})
      if (data instanceof Error && isRedirectError(data)) {
        if (this.router?.dehydrate) throw data
        this.router!.replace((data as RedirectError).getPath())
      } else {
        throw data
      }
    }
  }

  public async loadAction(loadAction?: boolean, ignoreCache: boolean = false) {
    try {
      return await this.loadMiddlewares(ignoreCache)
        .then(async () => {
          if (loadAction) await this.loadActionData(ignoreCache)
        })
        .then(() => {
          return this.data
        })
    } catch (data) {
      this.setData(data as RouteCacheEntry<TLoaderData | TActionData | {}>)
      if (data instanceof Error && isRedirectError(data)) {
        if (this.router?.dehydrate) throw data
        this.router!.replace((data as RedirectError).getPath())
      } else {
        throw data
      }
    }
  }

  public async loadActionData(ignoreCache: boolean = false) {
    if (!this.action) {
      this.setData({})
      return
    }

    const handler = async () => {
      return this.action!({
        params: this.params!,
        dataContext: this.dataContext!,
        utils: this.router!.context,
        serverContext: this.router!.serverContext,
      }).then(data => {
        this.setData(data)
        return data
      })
    }

    if (!ignoreCache) return await this.router!.cache.getData(this.getRouteUniqueKey(), handler)
    else await handler()
  }

  public async loadData(ignoreCache: boolean = false) {
    if (!this.loader) {
      this.setData({})
      return await this.router!.cache.getCacheManager().fetchAndCache(this.getRouteUniqueKey(), async () => ({}))
    }

    const handler = async () => {
      return await this.loader!({
        params: this.params!,
        dataContext: this.dataContext!,
        utils: this.router!.context,
        serverContext: this.router!.serverContext,
      }).then(data => {
        this.setData(data)
        return data
      })
    }
    if (!ignoreCache) return (await this.router!.cache.getData(this.getRouteUniqueKey(), handler)).data
    else return await handler()
  }

  public async loadMiddlewares(ignoreCache: boolean = false) {
    const middlewaresResponse = {}
    const middlewares = this.middlewares || []
    if (middlewares.length) {
      for (const middleware of middlewares) {
        const cacheKey = this.getRouteUniqueKey() + '-middleware:' + middleware.name
        const handler = async () =>
          await middleware
            .handler({
              dataContext: this.dataContext!,
              params: this.params!,
              utils: this.router!.context,
              serverContext: this.router!.serverContext,
            })
            .then(data => {
              if (data) {
                Object.assign(middlewaresResponse, data)
              }
              return data
            })
        if (!ignoreCache) await this.router!.cache.getData(cacheKey, handler)
        else await handler()
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
  storage?: ZiroContextStorage
}
const hooks = createHooks<Record<ZiroRouterHooks, (router: ZiroRouter) => void>>()

export type ZiroRouterHooks = 'change-url'

type LoadingStatus = 'error' | 'success' | 'pending'

export type ZiroContextStorage = {
  [key: string]: Storage
}

export type ServerContext = {
  req: Connect.IncomingMessage
  res: http.ServerResponse
}
export type ZiroRouter = {
  serverContext?: ServerContext
  context: ZiroUtils
  statusCode: number
  statusMessage: string
  head: Unhead
  cache: SWRCache
  clearCache: () => void
  dehydrate: boolean
  setDehydration: (this: ZiroRouter, dehydrate: boolean) => void
  url?: string
  setUrl: (url: string) => void
  tree: RouterContext<AnyRoute>
  initializeRoute: (this: ZiroRouter, route: AnyRoute) => void
  findRoute: (this: ZiroRouter, url: string, method?: ZiroRouteMethod) => AnyRoute | undefined
  _flatLookup: (this: ZiroRouter, path: string, method?: ZiroRouteMethod) => any
  flatLookup: (this: ZiroRouter, path: string, method?: ZiroRouteMethod) => AnyRoute[]
  hook: (hook: ZiroRouterHooks, callback: (router: ZiroRouter) => void) => void
  removeHook: (hook: ZiroRouterHooks, callback: (router: ZiroRouter) => void) => void
  push: (url: string, options?: ZiroRouterPushOptions) => void
  replace: (url: string, options?: Omit<ZiroRouterPushOptions, 'replace'>) => void
  addRoute: typeof createRoute
  setRootRoute: typeof createRootRoute
  getRootRoute: () => AnyRoute
  rootRoute: AnyRoute | null
  addLayoutRoute: typeof createLayoutRoute
  load: (serverContext?: ServerContext, ignoreCache?: boolean) => Promise<unknown>
  loadAction: (serverContext?: ServerContext, ignoreCache?: boolean) => Promise<unknown>
}

type ZiroRouterPushOptions = {
  replace?: boolean
  state?: Record<string, unknown>
}

export const createRouter = (opts: CreateRouterOptions = {}): ZiroRouter => {
  let cache = new SWRCache()
  if (typeof window !== 'undefined') {
    opts.initialUrl = window.location.pathname
    if ((window as any).__ZIRO_DATA__) cache.deserialize(JSON.stringify((window as any).__ZIRO_DATA__))
  }

  const router: ZiroRouter = {
    context: {
      storage: opts.storage || {},
    },
    rootRoute: null,
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
    clearCache() {
      this.cache = new SWRCache()
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
        addRou3Route(this.tree, 'GET', serializedPath, route)
        if (route.action) {
          addRou3Route(this.tree, 'POST', serializedPath, route)
        }
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
          addRou3Route(this.tree, 'GET', notFoundRoutePath, notFoundRoute)
          notFoundRoute.setRouter(this)
        }
      }
      //   }
    },
    findRoute(url: string, method = 'GET') {
      const route = findRoute(this.tree, method, url)
      if (route) {
        if (route.params) route.data.setParams(route.params)
        return route.data
      }
      return undefined
    },
    _flatLookup(path, method = 'GET') {
      let route = this.findRoute(path, method)
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
    flatLookup(path, method = 'GET') {
      return this._flatLookup(path, method).reverse()
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
      const currentRootRoute = this.rootRoute!
      if (!options.errorComponent)
        if (currentRootRoute.errorComponent) options.errorComponent = currentRootRoute.errorComponent
        else options.errorComponent = DefaultErrorComponent

      const route = createRootRoute(options)
      route.setRouter(this)
      this.rootRoute = route
      return route
    },
    getRootRoute() {
      return this.rootRoute!
    },
    async loadAction(serverContext, ignoreCache) {
      this.dehydrate = true
      let actionData = null
      try {
        if (this.url) {
          const tree = this.flatLookup(this.url, 'POST')
          if (tree[tree.length - 1].action) {
            this.serverContext = serverContext
            for (const route of tree) {
              const isTargetRoute = route === tree[tree.length - 1]
              await route.loadAction(isTargetRoute, ignoreCache).then(data => {
                if (isTargetRoute) actionData = data
              })
            }
          } else {
            abort(404, 'page not found')
          }
        }
      } catch (e: any) {
        if (router.dehydrate && isRedirectError(e)) throw e
        if (e.message) this.statusMessage = e.message
        if (e.status) this.statusCode = e.status
        if (!e.status && e.message) this.statusCode = 500
        throw e
      }
      return actionData
    },
    async load(serverContext, ignoreCache) {
      let loaderData = null
      this.dehydrate = true
      if (this.url) {
        const tree = this.flatLookup(this.url)
        let errorHandlerRoute = null
        this.serverContext = serverContext
        for (const route of tree) {
          try {
            const isTargetRoute = route === tree[tree.length - 1]
            await route.load(ignoreCache).then(data => {
              if (isTargetRoute) loaderData = data
            })
          } catch (e: any) {
            // console.error(e)
            if (router.dehydrate && isRedirectError(e)) throw e
            if (errorHandlerRoute && !route.errorComponent) {
              try {
                await this.cache.getCacheManager().fetchAndCache(errorHandlerRoute.getRouteUniqueKey(), async () => {
                  throw e
                })
              } catch (e) {}
            }
            if (e.message) this.statusMessage = e.message
            if (e.status) this.statusCode = e.status
            if (!e.status && e.message) this.statusCode = 500
          }
          if (route.errorComponent) errorHandlerRoute = route
        }
      }
      return loaderData
    },
  }

  router.setRootRoute({
    component: DefaultRootRoute,
    errorComponent: DefaultErrorComponent,
  })

  if (typeof window !== 'undefined')
    window.addEventListener('popstate', e => {
      router.setUrl(window.location.pathname)
    })
  return router
}

const createRoute = <TFilePath extends string, TParentRoute extends AnyRoute, TLoaderData = {}, TActionData = {}>(
  options: Pick<ZiroRoute<TFilePath, TParentRoute, TLoaderData, TActionData>, 'path' | 'parent' | 'component' | 'loader' | 'loadingComponent' | 'errorComponent' | 'meta' | 'middlewares' | 'action'>,
) => {
  return new ZiroRoute(options.component, options.path, options.parent, options.loader, options.action, options.loadingComponent, options.errorComponent, options.meta, options.middlewares)
}

const createRootRoute = <TLoaderData = {}>(options: Pick<ZiroRoute<'_root', undefined, TLoaderData, {}>, 'component' | 'loader' | 'loadingComponent' | 'errorComponent' | 'meta' | 'middlewares'>) => {
  return new ZiroRoute(options.component, '_root', undefined, options.loader, undefined, options.loadingComponent, options.errorComponent, options.meta, options.middlewares)
}

const createLayoutRoute = <TParentRoute extends AnyRoute, TLoaderData = {}, TActionData = {}>(
  options: Pick<ZiroRoute<string, TParentRoute, TLoaderData, TActionData>, 'parent' | 'component' | 'loader' | 'loadingComponent' | 'errorComponent' | 'meta' | 'middlewares' | 'action'> & {
    id: string
  },
) => {
  return new ZiroRoute(options.component, options.id, options.parent, options.loader, options.action, options.loadingComponent, options.errorComponent, options.meta, options.middlewares)
}
