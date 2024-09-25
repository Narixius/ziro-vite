import { Head, Unhead } from '@unhead/schema'
import { NodeEventContext } from 'h3'
import { createHooks } from 'hookable'
import { isArray, last } from 'lodash-es'
import { ComponentType } from 'react'
import { FallbackProps as ReactErrorBoundaryComponentProps } from 'react-error-boundary'
import { RouterContext, addRoute as addRou3Route, createRouter as createRou3Router, findRoute } from 'rou3'
import { getQuery, joinURL, parsePath } from 'ufo'
import { createHead } from 'unhead'
import { ZodSchema, z } from 'zod'
import { abort } from './abort.js'
import { SWRCache } from './cache/swr.js'
import DefaultErrorComponent from './default-error-component.js'
import DefaultRootRoute from './default-root.js'
import { RedirectError, isRedirectError } from './redirect.js'
import { Cookies } from './storage/cookies.js'
import { createValidationErrors } from './utils/zod.js'

export const clientLoader = (routeId: string, router: ZiroRouter) => (props: RouteProps<''>) => {
  if (window)
    return fetch(ZiroRoute.fillRouteParams(routeId, props.params), {
      method: 'GET',
      headers: {
        Accept: 'application/json',
      },
    }).then(async r => {
      if (r.redirected) {
        const url = new URL(r.url)
        router.replace(url.pathname + url.search)
        return
      }
      const data = await r.json()
      if (r.ok) return data
      throw new Error(data.error ? data.error : data)
    })
}

type ActionHandler<TBody, TResult> = (body: TBody, actionArgs: any) => Promise<TResult>

type ActionHandlerWithZod<TBodySchema extends z.ZodSchema, TResult> = {
  input: TBodySchema
  handler: ActionHandler<TBodySchema extends z.ZodSchema ? z.infer<TBodySchema> : any, TResult>
}
type DefineActionArgs<T extends z.ZodSchema, TResult> = ActionHandlerWithZod<T, TResult>

export function defineAction<TBodySchema extends z.ZodSchema, TResult>(
  args: DefineActionArgs<TBodySchema, TResult>,
): {
  input: TBodySchema
  handler: ActionHandler<TBodySchema extends z.ZodSchema ? z.infer<TBodySchema> : any, TResult>
} {
  return args
}

export type ActionSchema<T> = T extends { input: infer TSchema; handler: (body: any, ctx: any) => Promise<any> } ? (TSchema extends z.ZodSchema ? z.infer<TSchema> : any) : unknown
export type ActionResult<T> = T extends { input: any; handler: (body: any, ctx: any) => Promise<infer TResult> } ? TResult : unknown

export type Action<TInput extends any> = { input: TInput; handler: (body: TInput extends z.ZodSchema ? z.infer<TInput> : any, ctx: any) => Promise<any> }
export type Actions = Record<string, Action<any>>

type ZeroRouteHooks<TLoaderData, TActions, TPath extends RouteId> = {
  error: (error: Error) => void
  load: (data: TLoaderData | TActions | {}, dataContext?: GetRouteDataContext<TPath>) => void
  paramsChanged: (params: Record<string, string>) => void
  match: (url: string, fullUrl: string) => void
}

type ZiroRouteMethod = 'POST' | 'GET'

export const DEFAULT_ROOT_PATH = '_root'

export interface FileRoutesByPath {}

export type GetRouteLoader<TRoute extends AnyRoute> = TRoute extends AnyRoute<any, any, infer TLoaderData> ? TLoaderData : {}
export type GetRouteActions<TRoute extends AnyRoute> = TRoute extends AnyRoute<any, any, any, infer Actions> ? Actions : {}

export type ParsePathParams<T extends string, TAcc = never> = T extends `${string}:${infer TPossiblyParam}`
  ? TPossiblyParam extends `${infer TParam}/${infer TRest}`
    ? ParsePathParams<TRest, TParam extends '' ? '_splat' : TParam | TAcc>
    : TPossiblyParam extends ''
    ? '_splat'
    : TPossiblyParam | TAcc
  : TAcc

export type SafeRouteParams<TPath extends string> = keyof RouteParams<TPath> extends never ? undefined : RouteParams<TPath>

export type RouteParams<TPath extends string> = Record<ParsePathParams<TPath>, string>

export type RouteLoaderDataContext<TRoute> = (TRoute extends ZiroRoute<any, any, infer TParentLoaderData, any, any> ? TParentLoaderData : {}) &
  (TRoute extends ZiroRoute<any, infer TParent, any, any, any> ? RouteLoaderDataContext<TParent> : {})

export type RouteMiddlewareDataContext<TRoute> = (TRoute extends ZiroRoute<infer TPath, any, any, any, any>
  ? TPath extends keyof FileRoutesByPath
    ? IntersectionOfMiddlewareReturns<FileRoutesByPath[TPath]['middlewares']>
    : {}
  : {}) &
  (TRoute extends ZiroRoute<any, infer TParent, any, any, any> ? RouteMiddlewareDataContext<TParent> : {})

export type RouteDataContext<TRoute> = RouteLoaderDataContext<TRoute> & RouteMiddlewareDataContext<TRoute>

export type ZiroUtils = {
  storage: {
    cookies?: Cookies
  }
}

export type GetRouteDataContext<TPath extends RouteId> = TPath extends keyof FileRoutesByPath ? FileRoutesByPath[TPath]['dataContext'] : {}
export type GetRouteLoaderData<TPath extends RouteId> = TPath extends keyof FileRoutesByPath ? FileRoutesByPath[TPath]['loaderData'] : {}

export type LoaderArgs<TPath extends RouteId> = {
  params: RouteParams<TPath>
  dataContext: GetRouteDataContext<TPath>
  utils: ZiroUtils
  serverContext?: ServerContext
}

export type ActionArgs<TPath extends RouteId> = LoaderArgs<TPath>

export type MetaArgs<TPath extends RouteId> = {
  params: RouteParams<TPath>
  loaderData: GetRouteLoaderData<TPath>
  dataContext: GetRouteDataContext<TPath>
}
export type MetaReturnType = Promise<Head>
export type MetaFn<TPath extends RouteId> = (args: MetaArgs<TPath>) => Promise<Head>

export type AlsoAllowString<T> = T | (string & {})

export type RouteId = AlsoAllowString<keyof FileRoutesByPath>

export type LoaderProps<TPath extends RouteId> = LoaderArgs<TPath>

export type MiddlewareProps<TPath extends RouteId> = LoaderProps<TPath>
export type Middleware<TPath extends RouteId = '_root', ReturnType = unknown> = {
  name: string
  handler: (props: LoaderProps<TPath>) => Promise<ReturnType>
}
export type Middlewares<TPath extends RouteId = '_root'> = Middleware<TPath>[]
export const createMiddleware = <TPath extends RouteId, ReturnType = unknown>(options: { name: string; handler: (props: LoaderProps<TPath>) => Promise<ReturnType> }) => {
  return options
}

export type LoaderType<TPath extends RouteId, TLoaderData, TParent> = (args: LoaderArgs<TPath>) => Promise<TLoaderData>
export type ActionType<TPath extends RouteId, TActionData, TParent> = (args: LoaderArgs<TPath>) => Promise<TActionData>

type ExtractReturnTypesFromMiddleware<T extends readonly Middleware<any>[]> = {
  [K in keyof T]: T[K] extends Middleware<any> ? Awaited<ReturnType<T[K]['handler']>> : {}
}
type UnionToIntersection<U> = (U extends unknown ? (k: U) => void : never) extends (k: infer I) => void ? I : never
export type IntersectionOfMiddlewareReturns<T extends readonly Middleware<any>[]> = UnionToIntersection<ExtractReturnTypesFromMiddleware<T>[number]>

export type RouteProps<TPath extends RouteId> = {
  params: RouteParams<TPath>
  loaderData: TPath extends keyof FileRoutesByPath ? (FileRoutesByPath[TPath]['route'] extends AnyRoute<any, any, infer LoaderData> ? LoaderData : any) : any
  dataContext: TPath extends keyof FileRoutesByPath ? RouteDataContext<FileRoutesByPath[TPath]['parent']> & IntersectionOfMiddlewareReturns<FileRoutesByPath[TPath]['middlewares']> : any
}

export type ErrorComponentProps = Pick<ReactErrorBoundaryComponentProps, 'error'> & Partial<Pick<ReactErrorBoundaryComponentProps, 'resetErrorBoundary'>> & { status?: number | string }
export type ZiroRouteComponent<TPath extends keyof FileRoutesByPath> = ComponentType<RouteProps<TPath>>
export type AnyRoute<
  TPath extends string = any,
  TParent extends AnyRoute = any,
  TLoaderData = any,
  TActionData extends Actions = {},
  TMiddlewares extends RouteMiddleware<TPath, TParent>[] = RouteMiddleware<TPath, TParent>[],
> = ZiroRoute<TPath, TParent, TLoaderData, TActionData, TMiddlewares>

export type ZiroRouteErrorComponent = ComponentType<ErrorComponentProps>
type RouteMiddleware<TPath extends RouteId, TParentRoute> = { name: string; handler: (props: LoaderArgs<TPath>) => Promise<unknown> }

export class ZiroRoute<TPath extends RouteId, TParentRoute, TLoaderData, TActions extends Actions, TMiddlewares extends RouteMiddleware<TPath, TParentRoute>[]> {
  private hooks = createHooks<ZeroRouteHooks<TLoaderData, TActions, TPath>>()

  constructor(
    public component: ComponentType<any>,
    public path: TPath,
    public parent?: TParentRoute,
    public loader?: LoaderType<TPath, TLoaderData, TParentRoute>,
    public actions?: Actions,
    public loadingComponent?: ComponentType,
    public errorComponent?: ZiroRouteErrorComponent,
    public meta?: (args: MetaArgs<TPath>) => Promise<Head>,
    public middlewares?: TMiddlewares,
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

    if (!middlewares) this.middlewares = [] as unknown as TMiddlewares
    this.hooks.hook('match', (url, fullUrl) => {
      this.fullUrl = fullUrl
    })
  }

  public revalidate() {
    this.router!.cache.revalidate(this.getRouteUniqueKey(), this.load.bind(this))
  }
  private data?: TLoaderData | {}
  public getData() {
    return this.data
  }
  public setData(data: TLoaderData | {}) {
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
  private actionData?: any
  public getActionData() {
    return this.actionData
  }
  public setActionData(data: any) {
    this.actionData = data
  }

  private dataContext: GetRouteDataContext<TPath> = {} as GetRouteDataContext<TPath>
  public getDataContext() {
    return this.dataContext
  }
  public setDataContext(data: GetRouteDataContext<TPath>) {
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
  public static fillRouteParams(url: string, params: Record<string, string>) {
    let result = url
    if (params && Object.keys(params).length) {
      Object.keys(params).map(key => {
        result = result.replace(`:${key}`, params[key])
      })
    }
    return result
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

  static generateRouteUniqueKey(path: string, matchedUrl: string) {
    return `${path}-${matchedUrl}`
  }

  public getRouteUniqueKey() {
    return ZiroRoute.generateRouteUniqueKey(this.path, this.matchedUrl || this.path)
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
      } as MetaArgs<TPath>).then(this.router!.head.push)
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
      this.setData(data as TLoaderData | {})
      if (data instanceof Error && isRedirectError(data)) {
        if (this.router?.dehydrate) throw data
        this.router!.replace((data as RedirectError).getPath())
      } else {
        throw data
      }
    }
  }

  public async loadAction({ isTargetRoute, ignoreCache = false, actionName }: { isTargetRoute?: boolean; ignoreCache?: boolean; actionName: string }) {
    try {
      return await this.loadMiddlewares(ignoreCache)
        .then(async () => {
          if (isTargetRoute) await this.loadActionData(actionName, ignoreCache)
        })
        .then(() => {
          return this.data
        })
    } catch (data) {
      this.setActionData(data)
      if (data instanceof Error && isRedirectError(data)) {
        if (this.router?.dehydrate) throw data
        this.router!.replace((data as RedirectError).getPath())
      } else {
        throw data
      }
    }
  }

  public async loadActionData(actionName: string, ignoreCache: boolean = false) {
    if (!this.actions) {
      this.setActionData({})
      return
    }

    const handler = async () => {
      const data = await this.router?.serverContext?.getBody()
      const schema = this.actions![actionName].input as ZodSchema
      const validation = schema.safeParse(data)
      if (!validation.success) {
        this.router!.statusMessage = 'Invalid input'
        this.router!.statusCode = 400
        const res = {
          errors: createValidationErrors(validation.error),
          input: data,
        }
        this.setActionData(res)
        return res
      }
      return this.actions![actionName].handler(validation.data, {
        params: this.params!,
        dataContext: this.dataContext!,
        utils: this.router!.context,
        serverContext: this.router!.serverContext,
      }).then(data => {
        if ('errors' in data) {
          this.router!.statusMessage = 'Invalid input'
          this.router!.statusCode = 400
        }
        this.setActionData(data)
        return data
      })
      // TODO: handle selected action
    }

    if (!ignoreCache) return await this.router!.cache.getData('action:' + this.getRouteUniqueKey(), handler)
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
    if (!ignoreCache) {
      return (await this.router!.cache.getData(this.getRouteUniqueKey(), handler)).data
    } else return await handler()
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
  req: NodeEventContext['req']
  res: NodeEventContext['res']
  getBody: () => any
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
        if (route.actions) {
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
      path = parsePath(path).pathname
      const lookupResult = this._flatLookup(path, method).reverse() as Array<any>
      if (path === '/_root') return [this.getRootRoute()]
      if (path.endsWith('_layout') && (lookupResult[lookupResult.length - 1] as AnyRoute).parent!.path === path) lookupResult.pop()
      return lookupResult
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
          if (tree[tree.length - 1].actions) {
            const queryActionName = getQuery(this.url).action
            let actionName = getQuery(this.url).action || 'default'
            if (isArray(queryActionName)) actionName = last(queryActionName)!
            this.serverContext = serverContext
            for (const route of tree) {
              const isTargetRoute = route === tree[tree.length - 1]
              await route.loadAction({ isTargetRoute, ignoreCache, actionName: String(actionName) }).then(data => {
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

const createRoute = <TPath extends string, TParentRoute extends AnyRoute, TLoaderData = {}, TActions extends Actions = {}, TMiddlewares extends RouteMiddleware<TPath, TParentRoute>[] = []>(
  options: Pick<
    ZiroRoute<TPath, TParentRoute, TLoaderData, TActions, TMiddlewares>,
    'path' | 'parent' | 'component' | 'loader' | 'loadingComponent' | 'errorComponent' | 'meta' | 'middlewares' | 'actions'
  >,
) => {
  return new ZiroRoute<TPath, TParentRoute, TLoaderData, TActions, TMiddlewares>(
    options.component,
    options.path,
    options.parent,
    options.loader,
    options.actions,
    options.loadingComponent,
    options.errorComponent,
    options.meta,
    options.middlewares,
  )
}

const createRootRoute = <TLoaderData = {}, TMiddlewares extends RouteMiddleware<'_root', undefined>[] = []>(
  options: Pick<ZiroRoute<'_root', undefined, TLoaderData, {}, TMiddlewares>, 'component' | 'loader' | 'loadingComponent' | 'errorComponent' | 'meta' | 'middlewares'>,
) => {
  return new ZiroRoute(options.component, '_root', undefined, options.loader, undefined, options.loadingComponent, options.errorComponent, options.meta, options.middlewares)
}

const createLayoutRoute = <TParentRoute extends AnyRoute, TLoaderData = {}, TMiddlewares extends RouteMiddleware<'', TParentRoute>[] = []>(
  options: Pick<ZiroRoute<string, TParentRoute, TLoaderData, {}, TMiddlewares>, 'parent' | 'component' | 'loader' | 'loadingComponent' | 'errorComponent' | 'meta' | 'middlewares'> & {
    id: string
  },
) => {
  return new ZiroRoute(options.component, options.id, options.parent, options.loader, undefined, options.loadingComponent, options.errorComponent, options.meta, options.middlewares)
}
