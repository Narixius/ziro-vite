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

export type AnyRoute = Route<any, any, any, any, any>

export class Route<RouteId extends AlsoAllowString<keyof FileRoutesByPath>, TLoaderResult, TActions extends Record<string, Action> = {}, TMiddlewares extends Middleware[] = [], TProps = {}> {
  private paramsKeys: string[] = []
  constructor(
    private id: string,
    private parent?: AnyRoute,
    private loader?: (ctx: { dataContext: DataContext; request: Request; params: Record<string, string> }) => Promise<TLoaderResult>,
    private actions?: TActions,
    private middlewares?: TMiddlewares,
    private props?: TProps,
  ) {
    this.paramsKeys = id.match(/:[a-zA-Z0-9]+/g) || []
  }
  getId() {
    return this.id
  }
  getParent() {
    return this.parent
  }
  getMeta() {
    return this.props
  }
  parsePath(params?: Record<string, string>) {
    return omit(params, this.paramsKeys)
  }
  generateCacheKey(params?: Record<string, string>): string {
    const paramString = this.paramsKeys.map(key => `${key}:${params?.[key] ?? ''}`).join('|')
    return `${this.id}|${paramString}`
  }
  async loadMiddlewares(dataContext: DataContext, request: Request, params: Record<string, string>, cache?: Cache) {
    if (!this.middlewares) return

    for (const middleware of this.middlewares) {
      await middleware.execute(dataContext, request, params, cache)
    }
  }
  async load(dataContext: DataContext, request: Request, params?: Record<string, string>, cache?: Cache) {
    params = this.parsePath(params)

    await this.loadMiddlewares(dataContext, request, params)

    const cachedData = cache?.get(this.generateCacheKey(params)) as TLoaderResult | undefined
    if (cachedData) {
      return cachedData
    }
    const data = await this.loader?.({
      dataContext,
      params,
      request,
    })
    // update the cache
    if (data) {
      cache?.set(this.generateCacheKey(params), data, Infinity)
    }
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
