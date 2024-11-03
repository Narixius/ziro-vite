import { Head } from '@unhead/schema'
import { omit } from 'lodash-es'
import { parseQuery, parseURL } from 'ufo'
import { AlsoAllowString } from '../types'
import { Action } from './Action'
import { Cache } from './Cache'
import { Middleware } from './Middleware'
import { DataContext } from './RouteDataContext'
import { RouteFilesByRouteId } from './Router'
import { createAbortResponse } from './utils/abort'

export type ParsePathParams<T extends string, TAcc = never> = T extends `${string}:${infer TPossiblyParam}`
  ? TPossiblyParam extends `${infer TParam}/${infer TRest}`
    ? ParsePathParams<TRest, TParam extends '' ? '_splat' : TParam | TAcc>
    : TPossiblyParam extends ''
    ? '_splat'
    : TPossiblyParam | TAcc
  : TAcc
export type RouteParams<TPath extends string> = Record<ParsePathParams<TPath>, string>
export type AnyRoute<
  RouteId extends AlsoAllowString<keyof RouteFilesByRouteId> = any,
  TLoaderResult = any,
  TActions extends Record<string, Action> = {},
  TMiddlewares extends Middleware[] = any,
  TParent extends AnyRoute = any,
  TProps = any,
> = Route<RouteId, TLoaderResult, TActions, TMiddlewares, TParent, TProps, any, any>
export type GetRouteDataContext<TParent> = TParent extends Route<any, any, any, any, any, any, any, infer TParentDataContextToChild> ? TParentDataContextToChild : {}

type RouteContext<RouteId extends keyof RouteFilesByRouteId> = RouteFilesByRouteId[RouteId]['dataContext']
export type LoaderArgs<RouteId extends keyof RouteFilesByRouteId> = { request: Request; dataContext: RouteContext<RouteId>; head: DataContext['head']; params: RouteParams<RouteId> }
export type ActionArgs<RouteId extends keyof RouteFilesByRouteId> = { request: Request; dataContext: RouteContext<RouteId>; head: DataContext['head']; params: RouteParams<RouteId> }

export type MetaArgs<RouteId extends keyof RouteFilesByRouteId> = {
  request: Request
  dataContext: RouteContext<RouteId>
  head: DataContext['head']
  params: RouteParams<RouteId>
  loaderData: RouteFilesByRouteId[RouteId]['route'] extends AnyRoute<any, infer TLoaderResult> ? TLoaderResult : unknown
}

export type MetaFn<RouteId extends keyof RouteFilesByRouteId> = (args: MetaArgs<RouteId>) => Promise<Head>
export type LoaderReturnType<T extends (...args: any[]) => Promise<any>> = Awaited<ReturnType<T>>

type ExtractReturnTypesFromMiddleware<T extends readonly Middleware<any, any>[]> = {
  [K in keyof T]: T[K] extends Middleware<any, infer TOnRequestResult> ? TOnRequestResult : {}
}
type UnionToIntersection<U> = (U extends unknown ? (k: U) => void : never) extends (k: infer I) => void ? I : never
export type IntersectionOfMiddlewaresResult<T extends readonly Middleware<any, any>[]> = UnionToIntersection<ExtractReturnTypesFromMiddleware<T>[number]>

export class Route<
  RouteId extends AlsoAllowString<keyof RouteFilesByRouteId>,
  TLoaderResult,
  TActions extends Record<string, Action<any, any>> = {},
  TMiddlewares extends Middleware<TDataContext, any>[] = [],
  TParent extends AnyRoute | undefined = undefined,
  TProps = {},
  TDataContext = GetRouteDataContext<TParent> & IntersectionOfMiddlewaresResult<TMiddlewares>,
  TDataContextToChild = TDataContext & TLoaderResult,
> {
  private paramsKeys: string[] = []
  constructor(
    private id: RouteId,
    private options: {
      parent?: TParent
      loader?: (ctx: { dataContext: DataContext<TDataContext>['data']; head: DataContext<TDataContext>['head']; request: Request; params: RouteParams<RouteId> }) => Promise<TLoaderResult>
      actions?: TActions
      meta?: (ctx: {
        loaderData: TLoaderResult
        dataContext: DataContext<TDataContext>['data']
        head: DataContext<TDataContext>['head']
        request: Request
        params: RouteParams<RouteId>
      }) => Promise<Head>
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
    const matchedParams = omit(params, this.paramsKeys) as RouteParams<RouteId>
    const matchedUrl = this.id.replace(/:([a-zA-Z0-9]+)/g, (_, key) => {
      return params?.[key] || ''
    })
    return {
      params: matchedParams,
      url: matchedUrl,
    }
  }

  async loadMeta(dataContext: DataContext<TDataContext>, request: Request, fullParams: RouteParams<RouteId>, cache: Cache) {
    if (this.options.meta) {
      const { params, url: matchedUrl } = this.parsePath(fullParams)
      await this.options
        .meta({
          dataContext: dataContext.data,
          params,
          request,
          loaderData: cache.getLoaderCache(this.id, matchedUrl) as TLoaderResult,
          head: dataContext.head,
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

  async onRequest(request: Request, fullParams: Record<string, string>, dataContext: DataContext<any>, cache: Cache) {
    const { params, url: matchedUrl } = this.parsePath(fullParams)

    await this.loadMiddlewaresOnRequest(request, params as RouteParams<RouteId>, dataContext, cache)

    let data = cache?.getLoaderCache(this.id, matchedUrl) as TLoaderResult | undefined
    if (!data) {
      data = await this.options.loader?.({
        dataContext: dataContext.data,
        params: params as RouteParams<RouteId>,
        request,
        head: dataContext.head,
      })
    }

    // update the cache
    // if (data) {
    cache?.setLoaderCache(this.id, matchedUrl, data || {}, Infinity)
    // }

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