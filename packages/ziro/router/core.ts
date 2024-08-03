import { createHooks } from 'hookable'
import { ComponentType } from 'react'
import { FallbackProps } from 'react-error-boundary'
import { RouterContext, addRoute as addRou3Route, createRouter as createRou3Router, findRoute } from 'rou3'
import { useHead } from 'unhead'
import { RedirectError, isRedirectError } from './redirect'

type ZeroRouteHooks<T, TParent> = {
  error: (error: Error) => void
  load: (data: T, dataContext?: RouteDataContext<TParent>) => void
  paramsChanged: (params: Record<string, string>) => void
  match: (url: string, fullUrl: string) => void
}

export interface FileRoutesByPath {
  __root__: {
    parent: AnyRoute
    route: AnyRoute
  }
  ___root__: {
    parent: AnyRoute
    route: AnyRoute
  }
}

type RouteData<Route> = Route extends ZiroRoute<infer TParentFilePath, infer TParentLoaderData, infer TParentRoute> ? TParentLoaderData : any

export type ParsePathParams<T extends string, TAcc = never> = T extends `${string}$${infer TPossiblyParam}`
  ? TPossiblyParam extends `${infer TParam}/${infer TRest}`
    ? ParsePathParams<TRest, TParam extends '' ? '_splat' : TParam | TAcc>
    : TPossiblyParam extends ''
      ? '_splat'
      : TPossiblyParam | TAcc
  : TAcc

export type RouteParams<TPath extends string> = Record<ParsePathParams<TPath>, string>
export type RouteDataContext<TRoute> = (TRoute extends ZiroRoute<any, any, infer TParentLoaderData> ? TParentLoaderData : unknown) &
  (TRoute extends ZiroRoute<any, infer TParentRoute, any> ? RouteDataContext<TParentRoute> : {})

export type LoaderArgs<TPath extends string, TParent> = {
  params: RouteParams<TPath> & (TParent extends ZiroRoute<infer TParentFilePath, any, any> ? RouteParams<TParentFilePath> : {})
  dataContext: RouteDataContext<TParent>
}

export type ZiroLoaderProps<TPath extends keyof FileRoutesByPath> = LoaderArgs<TPath, FileRoutesByPath[TPath]['parent']>

type LdJsonObject = { [Key in string]: LdJsonValue } & {
  [Key in string]?: LdJsonValue | undefined
}
type LdJsonArray = LdJsonValue[] | readonly LdJsonValue[]
type LdJsonPrimitive = string | number | boolean | null
type LdJsonValue = LdJsonPrimitive | LdJsonObject | LdJsonArray

export type LoaderType<TPath extends string, TLoaderData, TParent> = (args: LoaderArgs<TPath, TParent>) => Promise<TLoaderData>
export type MetaType<TPath extends string, TParent> = (args: LoaderArgs<TPath, TParent>) => Promise<Parameters<typeof useHead>[0]>

export type ZiroMetaProps<TPath extends keyof FileRoutesByPath> = LoaderArgs<TPath, FileRoutesByPath[TPath]['parent']>

export type ZiroRouteProps<TPath extends keyof FileRoutesByPath> = {
  params: RouteParams<TPath>
  loaderData: FileRoutesByPath[TPath]['route'] extends ZiroRoute<any, any, infer TLoaderData> ? TLoaderData : {}
}

export type ZiroRouteComponent<TPath extends keyof FileRoutesByPath> = ComponentType<ZiroRouteProps<TPath>>
export type AnyRoute<TParent extends AnyRoute = any> = ZiroRoute<any, any, TParent>
export type ZiroRouteErrorComponent = ComponentType<FallbackProps>
export class ZiroRoute<TPath extends keyof FileRoutesByPath, TParentRoute, TLoaderData> {
  private hooks = createHooks<ZeroRouteHooks<TLoaderData, TParentRoute>>()

  constructor(
    public component: ComponentType<any>,
    public path: TPath,
    public parent?: TParentRoute,
    public loader?: LoaderType<TPath, TLoaderData, TParentRoute>,
    public loadingComponent?: ComponentType,
    public errorComponent?: ZiroRouteErrorComponent,
    public meta?: MetaType<TPath, TParentRoute>,
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

  private data?: TLoaderData
  public getData() {
    return this.data
  }
  public setData(data: TLoaderData) {
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
    if (this.loader) {
      const cachedData = this.getLoaderStatus()
      if (!cachedData) {
        loaderCache[this.getRouteUniqueKey()] = {
          status: 'pending',
          data: null,
        }
        return await this.loader({
          params: this.params!,
          dataContext: this.dataContext!,
        })
          .then(data => {
            loaderCache[this.getRouteUniqueKey()] = {
              status: 'success',
              data,
            }
            this.setData(data)
            return data
          })
          .catch(data => {
            loaderCache[this.getRouteUniqueKey()] = {
              status: 'error',
              data,
            }
            if (data instanceof Error && isRedirectError(data)) {
              this.router!.replace((data as RedirectError).getPath())
            } else throw data
          })
      } else {
        this.setData(cachedData.data)
        return cachedData
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

type RouteWithChildren = { route: AnyRoute; child?: RouteWithChildren }

export type ZiroRouter = {
  url: string
  setUrl: (url: string) => void
  tree: RouterContext<AnyRoute>
  routes: AnyRoute[]
  addRoute: (this: ZiroRouter, route: AnyRoute) => void
  findRoute: (this: ZiroRouter, url: string) => AnyRoute | undefined
  _flatLookup: (this: ZiroRouter, path: string, fullUrl: string) => any
  flatLookup: (this: ZiroRouter, path: string) => AnyRoute[]
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
  const router: ZiroRouter = {
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
      const serializedPath = route.path.replaceAll('$', ':')
      addRou3Route(this.tree, '', serializedPath, route)
      route.setRouter(this)
      this.routes.push(route)
    },
    findRoute(url: string) {
      const routes = findRoute(this.tree, '', url)
      if (routes && routes.length) {
        routes.forEach(route => {
          if (route.params) route.data.setParams(route.params)
        })
        return routes[0].data
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
  }
  if (typeof window !== 'undefined')
    window.addEventListener('popstate', e => {
      router.setUrl(window.location.pathname)
    })
  return router
}

export const createRoute = <TFilePath extends keyof FileRoutesByPath, TParentRoute extends AnyRoute = FileRoutesByPath[TFilePath]['parent'], TLoaderData = {}>(
  options: Pick<ZiroRoute<TFilePath, TParentRoute, TLoaderData>, 'path' | 'parent' | 'component' | 'loader' | 'loadingComponent' | 'errorComponent' | 'meta'>,
) => {
  return new ZiroRoute(options.component, options.path, options.parent, options.loader, options.loadingComponent, options.errorComponent, options.meta)
}

export const createRootRoute = <TLoaderData>(options: Pick<ZiroRoute<'__root__', undefined, TLoaderData>, 'component' | 'loader' | 'loadingComponent' | 'errorComponent' | 'meta'>) => {
  return new ZiroRoute(options.component, '__root__', undefined, options.loader, options.loadingComponent, options.errorComponent, options.meta)
}
