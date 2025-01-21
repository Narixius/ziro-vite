import { Head } from '@unhead/schema'
import { omit } from 'lodash-es'
import { AlsoAllowString } from '../types'
import { Action } from './Action'
import { Cache, CacheStatus } from './Cache'
import { Middleware } from './Middleware'
import { DataContext } from './RouteDataContext'
import { RouteFilesByRouteId } from './Router'
import { JsonError, wrapErrorAsResponse } from './utils'
import { createAbortResponse } from './utils/abort'
import { parseFormDataToObject } from './utils/multipart'

export type ParsePathParams<T extends string, TAcc = never> = T extends `${string}:${infer TPossiblyParam}`
  ? TPossiblyParam extends `${infer TParam}/${infer TRest}`
    ? ParsePathParams<TRest, TParam extends '' ? '_splat' : TParam | TAcc>
    : TPossiblyParam extends ''
    ? '_splat'
    : TPossiblyParam | TAcc
  : TAcc
export type RouteParams<TPath extends string> = Record<ParsePathParams<TPath>, string>
export type SafeRouteParams<TPath extends string> = keyof RouteParams<TPath> extends never ? undefined : RouteParams<TPath>

export type AnyRoute<
  RouteId extends AlsoAllowString<keyof RouteFilesByRouteId> = any,
  TLoaderResult = any,
  TActions extends Record<string, Action<any, any>> = {},
  TMiddlewares extends Middleware[] = any,
  TParent extends AnyRoute = any,
  TProps = any,
> = Route<RouteId, TLoaderResult, TActions, TMiddlewares, TParent, TProps, any, any>
export type GetRouteDataContextByParent<TParent> = TParent extends Route<any, any, any, any, any, any, any, infer TParentDataContextToChild> ? TParentDataContextToChild : {}

export type GetRouteDataContext<RouteId extends keyof RouteFilesByRouteId> = RouteFilesByRouteId[RouteId]['dataContext']
export type LoaderArgs<RouteId extends keyof RouteFilesByRouteId> = { request: Request; dataContext: GetRouteDataContext<RouteId>; head: DataContext['head']; params: RouteParams<RouteId> }
export type ActionArgs<RouteId extends keyof RouteFilesByRouteId> = { request: Request; dataContext: GetRouteDataContext<RouteId>; head: DataContext['head']; params: RouteParams<RouteId> }

export type MetaArgs<RouteId extends keyof RouteFilesByRouteId> = {
  request: Request
  dataContext: GetRouteDataContext<RouteId>
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
  TLoaderResult = {},
  TActions extends Record<string, Action<any, any>> = {},
  TMiddlewares extends Middleware<TDataContext, any>[] = [],
  TParent extends AnyRoute | undefined = undefined,
  TProps = {},
  TDataContext = GetRouteDataContextByParent<TParent> & IntersectionOfMiddlewaresResult<TMiddlewares>,
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

  getMiddlewares() {
    return this.options.middlewares
  }

  getId(): string {
    return this.id
  }
  getParent() {
    return this.options.parent
  }
  getProps() {
    return this.options.props
  }
  static fillRouteParams(routeId: string, params: Record<string, string>) {
    return routeId.replace(/:([a-zA-Z0-9]+)/g, (_, key) => {
      return params?.[key] || ''
    })
  }
  parsePath(params: Record<string, string>) {
    const matchedParams = omit(params, this.paramsKeys) as RouteParams<RouteId>
    const matchedUrl = Route.fillRouteParams(this.id, params)
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

    const middlewares = dataContext.chargedRouteMiddlewareMap[this.getId()]
    if (middlewares && middlewares.length) {
      middlewares.forEach(middlewareName => {
        dataContext.data = {
          ...dataContext.data,
          ...(cache?.getMiddlewareCache(middlewareName) || {}),
        }
      })
    }

    let data = cache?.getLoaderCache(this.id, matchedUrl) as TLoaderResult | undefined

    let fullCachedData = cache?.getLoaderCache(this.id, matchedUrl, true)
    let cacheStatus: CacheStatus = fullCachedData?.status || 'success'

    if (!data) {
      data = await this.options
        .loader?.({
          dataContext: dataContext.data,
          params: params as RouteParams<RouteId>,
          request,
          head: dataContext.head,
        })
        .catch(async e => {
          cacheStatus = 'error'
          let errorPayload = {}
          if (e instanceof Error) {
            errorPayload = wrapErrorAsResponse(e).getPayload()
          }
          if (e instanceof JsonError) {
            errorPayload = e.getPayload()
          }
          // TODO: check response content
          if (e instanceof Response) {
            const res = e.clone()
            if (res.headers.get('Content-Type')?.includes('application/json')) {
              await res.json().then(data => {
                errorPayload = data
              })
            } else if (res.headers.get('Content-Type')?.includes('text/plain')) {
              await res.text().then(data => {
                errorPayload = {
                  errors: {
                    root: data,
                  },
                }
              })
            }
            // check for other content types
          }
          cache?.setLoaderCache(this.id, matchedUrl, errorPayload, 'error')
          throw e
        })
    }

    cache?.setLoaderCache(this.id, matchedUrl, data || {}, cacheStatus, false)

    await this.loadMeta(dataContext, request, params as RouteParams<RouteId>, cache)

    cache?.updateProcessedStatus('loader', this.id, matchedUrl, true)

    // update the data context
    dataContext.data = {
      ...dataContext.data,
      ...(data || {}),
    }

    cache.callHook(cache.generateKey('loader', this.id, matchedUrl), data || {})
    return data
  }

  async onBeforeResponse(request: Request, response: Response, params: Record<string, string>, dataContext: DataContext<any>, cache: Cache) {
    await this.loadMiddlewaresOnBeforeResponse(request, response, params as RouteParams<RouteId>, dataContext, cache)
  }

  async handleAction(request: Request, params: RouteParams<RouteId>, dataContext: DataContext<any>, cache: Cache) {
    const contentType = request.headers.get('content-type') || ''

    let data
    if (['multipart/form-data', 'application/x-www-form-urlencoded'].some(value => contentType.includes(value))) {
      data = parseFormDataToObject(await request.formData())
    } else if (contentType?.includes('application/json')) {
      data = await request.json()
    }

    const actionName = data.__action
    const action = this.options.actions?.[actionName]

    if (action) {
      await this.loadMiddlewaresOnRequest(request, params, dataContext, cache)
      return action.handle(request, data, params, dataContext, cache)
    }

    return createAbortResponse(404, 'Not Found')
  }
}
