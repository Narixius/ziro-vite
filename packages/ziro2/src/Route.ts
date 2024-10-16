import { Head } from '@unhead/schema'
import { omit } from 'lodash-es'
import { Action } from './Action'
import { Cache } from './Cache'
import { Middleware } from './Middleware'
import { DataContext } from './RouteDataContext'
import { FileRoutesByPath } from './Router'
import { AlsoAllowString } from './utils'

export type ParsePathParams<T extends string, TAcc = never> = T extends `${string}:${infer TPossiblyParam}`
  ? TPossiblyParam extends `${infer TParam}/${infer TRest}`
    ? ParsePathParams<TRest, TParam extends '' ? '_splat' : TParam | TAcc>
    : TPossiblyParam extends ''
    ? '_splat'
    : TPossiblyParam | TAcc
  : TAcc
export type RouteParams<TPath extends string> = Record<ParsePathParams<TPath>, string>

export type AnyRoute = Route<any, any, any, any, any>

export class Route<RouteId extends AlsoAllowString<keyof FileRoutesByPath>, TLoaderResult, TActions extends Record<string, Action> = {}, TMiddlewares extends Middleware[] = [], TProps = {}> {
  private paramsKeys: string[] = []
  constructor(
    private id: RouteId,
    private options: {
      parent?: AnyRoute
      loader?: (ctx: { dataContext: DataContext<any>['data']; request: Request; params: RouteParams<RouteId> }) => Promise<TLoaderResult>
      actions?: TActions
      meta?: (ctx: { loaderData: TLoaderResult; dataContext: DataContext<any>['data']; request: Request; params: RouteParams<RouteId> }) => Promise<Head>
      middlewares?: TMiddlewares
      props?: TProps
    },
  ) {
    this.paramsKeys = id.match(/:[a-zA-Z0-9]+/g) || []
  }
  getId() {
    return this.id
  }
  getParent() {
    return this.options.parent
  }
  getProps() {
    return this.options.props
  }
  parsePath(params?: Record<string, string>) {
    return omit(params, this.paramsKeys)
  }
  generateCacheKey(params?: Record<string, string>): string {
    const paramString = this.paramsKeys.map(key => `${key}:${params?.[key] ?? ''}`).join('|')
    return `${this.id}|${paramString}`
  }
  async loadMiddlewares(dataContext: DataContext<any>['data'], request: Request, params: RouteParams<RouteId>, cache?: Cache) {
    if (!this.options.middlewares) return

    for (const middleware of this.options.middlewares) {
      await middleware.execute(dataContext, request, params, cache)
    }
  }
  async loadMeta(dataContext: DataContext<any>, request: Request, params: RouteParams<RouteId>, cache: Cache) {
    if (this.options.meta) {
      await this.options
        .meta({
          dataContext,
          params,
          request,
          loaderData: cache.get(this.generateCacheKey(params)) as TLoaderResult,
        })
        .then(head => {
          dataContext.head.push(head)
        })
    }
  }
  async load(dataContext: DataContext<any>, request: Request, params: Record<string, string>, cache: Cache) {
    params = this.parsePath(params)

    await this.loadMiddlewares(dataContext, request, params as RouteParams<RouteId>, cache)

    const cachedData = cache?.get(this.generateCacheKey(params)) as TLoaderResult | undefined
    if (cachedData) {
      return cachedData
    }
    const data = await this.options.loader?.({
      dataContext: dataContext.data,
      params: params as RouteParams<RouteId>,
      request,
    })
    // update the cache
    if (data) {
      cache?.set(this.generateCacheKey(params), data, Infinity)
    }

    await this.loadMeta(dataContext, request, params as RouteParams<RouteId>, cache)

    // update the data context
    if (data) {
      dataContext.data = {
        ...dataContext.data,
        ...data,
      }
    }
    return data
  }
}
