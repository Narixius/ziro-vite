import { Head } from '@unhead/schema'
import { omit } from 'lodash-es'
import { parseQuery, parseURL } from 'ufo'
import { AlsoAllowString } from '../types'
import { Action } from './Action'
import { Cache } from './Cache'
import { Middleware } from './Middleware'
import { DataContext } from './RouteDataContext'
import { FileRoutesByPath } from './Router'
import { createAbortResponse } from './utils/abort'

export type ParsePathParams<T extends string, TAcc = never> = T extends `${string}:${infer TPossiblyParam}`
  ? TPossiblyParam extends `${infer TParam}/${infer TRest}`
    ? ParsePathParams<TRest, TParam extends '' ? '_splat' : TParam | TAcc>
    : TPossiblyParam extends ''
    ? '_splat'
    : TPossiblyParam | TAcc
  : TAcc
export type RouteParams<TPath extends string> = Record<ParsePathParams<TPath>, string>

export type AnyRoute = Route<any, any, any, any, any>

export class Route<
  RouteId extends AlsoAllowString<keyof FileRoutesByPath>,
  TLoaderResult,
  TActions extends Record<string, Action<any, any>> = {},
  TMiddlewares extends Middleware[] = [],
  TProps = {},
> {
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

  async loadMeta(dataContext: DataContext<any>, request: Request, params: RouteParams<RouteId>, cache: Cache) {
    if (this.options.meta) {
      await this.options
        .meta({
          dataContext,
          params,
          request,
          loaderData: cache.getLoaderCache(this.id, request.url) as TLoaderResult,
        })
        .then(head => {
          dataContext.head.push(head)
        })
    }
  }

  async loadMiddlewaresOnRequest(request: Request, params: RouteParams<RouteId>, dataContext: DataContext<any>['data'], cache?: Cache) {
    if (!this.options.middlewares) return

    for (const middleware of this.options.middlewares) {
      await middleware.onRequest(request, params, dataContext, cache)
    }
  }

  async loadMiddlewaresOnBeforeResponse(request: Request, response: Response, params: RouteParams<RouteId>, dataContext: DataContext<any>['data'], cache?: Cache) {
    if (!this.options.middlewares) return

    for (const middleware of this.options.middlewares) {
      await middleware.onBeforeResponse(request, response, params, dataContext, cache)
    }
  }

  async onRequest(request: Request, params: Record<string, string>, dataContext: DataContext<any>, cache: Cache) {
    params = this.parsePath(params)

    await this.loadMiddlewaresOnRequest(request, params as RouteParams<RouteId>, dataContext, cache)

    const cachedData = cache?.getLoaderCache(this.id, request.url) as TLoaderResult | undefined
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
      cache?.setLoaderCache(this.id, request.url, data, Infinity)
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

  async onBeforeResponse(request: Request, response: Response, params: Record<string, string>, dataContext: DataContext<any>, cache: Cache) {
    await this.loadMiddlewaresOnBeforeResponse(request, response, params as RouteParams<RouteId>, dataContext, cache)
  }

  async handleAction(request: Request, params: RouteParams<RouteId>, dataContext: DataContext<any>, cache: Cache) {
    const query = parseQuery(String(parseURL(request.url).search))
    const actionName = String(query.action)
    const action = this.options.actions?.[actionName]

    if (action) {
      await this.loadMiddlewaresOnRequest(request, params, dataContext, cache)
      return action.handle(
        {
          routeId: this.id,
          actionName,
        },
        request,
        params,
        dataContext,
        cache,
      )
    }

    return createAbortResponse(404, 'Not Found')
  }
}
