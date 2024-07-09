export * from '@tanstack/react-router'
export * from '@tanstack/start'

import { FileRoutesByPath, LoaderFnContext, ParsePathParams } from '@tanstack/react-router'

export type LoaderContext<TURL extends keyof FileRoutesByPath = '/'> = LoaderFnContext<Record<ParsePathParams<TURL>>>
export type LoaderFn<TURL extends keyof FileRoutesByPath = '/', TResponse = {}> = (ctx: LoaderFnContext<Record<ParsePathParams<TURL>, string>>) => Promise<TResponse> | TResponse

export type MetaFunction<TURL extends keyof FileRoutesByPath = '/'> = (ctx: { params: Record<ParsePathParams<TURL>>; loaderData: any }) => Array<React.JSX.IntrinsicElements['meta']>
