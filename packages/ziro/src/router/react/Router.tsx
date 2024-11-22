import { createHooks } from 'hookable'
import { isEqual } from 'lodash-es'
import React, { FC, Fragment, memo, PropsWithChildren, ReactNode, Suspense, useCallback, useContext, useMemo, useRef, useState, useSyncExternalStore } from 'react'
import { ErrorBoundary, FallbackProps } from 'react-error-boundary'
import { parseURL } from 'ufo'
import { RouteFilesByRouteId } from 'ziro/router'
import { AlsoAllowString } from '../../types'
import { Cache } from '../Cache'
import { AnyRoute, GetRouteDataContext } from '../Route'
import { DataContext } from '../RouteDataContext'
import { Router as RouterObj } from '../Router'
import { isRedirectResponse } from '../utils/redirect'
import { OutletContext } from './contexts/OutletContext'
import { NavigateFn, RouterContext } from './contexts/RouterContext'
import { proxyHistoryApi } from './utils/browser-api-override'

export type RouteProps<RouteId extends keyof RouteFilesByRouteId> = {
  loaderData: RouteFilesByRouteId[RouteId]['route'] extends AnyRoute<any, infer TLoaderResult> ? TLoaderResult : unknown
  dataContext: GetRouteDataContext<RouteId>
}

export type ErrorBoundaryProps = FallbackProps

export type TRouteProps = {
  component?: FC<{ loaderData: any; dataContext: any }>
  LoadingComponent?: FC
  ErrorBoundary?: FC<FallbackProps>
  Layout?: FC<PropsWithChildren>
}
type RouterProps = {
  router: RouterObj<TRouteProps>
  dataContext?: DataContext
  cache?: Cache
  initialUrl?: string
  layoutOptions?: {
    body?: ReactNode
    head?: ReactNode
  }
}

const routerHook = createHooks<{
  onUrlChange: () => void
}>()

export const navigate = (to: string, options: { replace?: boolean }) => {
  if (canUseDOM) {
    let destinationUrl = parseURL(to)
    const destination = destinationUrl.host !== window.location.host ? to : destinationUrl.pathname
    window.history[options.replace ? 'replaceState' : 'pushState']({}, '', destination)
  }
}

export const loadClientRouter = async (router: RouterObj<TRouteProps>, dataContext: DataContext<any>, cache: Cache, navigate: NavigateFn, url?: string) => {
  const request = getCurrentBrowserURLRequest(url)
  const response = await router.handleRequest(request, new Response(), cache, dataContext).catch(e => {
    if (e instanceof Response && isRedirectResponse(e)) {
      return e
    }
    throw e
  })
  if (response instanceof Response && isRedirectResponse(response)) navigate(response.headers.get('Location') || response.url, { replace: true })
}

const getCurrentBrowserURLRequest = (fullUrl?: string) => {
  const url = fullUrl ? new URL(fullUrl) : new URL(window.location.pathname, window.location.origin)
  const req = new Request(url, {
    method: 'GET',
  })
  return req
}

export const Router: FC<RouterProps> = memo(({ router, layoutOptions, ...props }) => {
  const dataContext = useRef(props.dataContext || new DataContext())
  const cache = useRef(props.cache || new Cache())

  const url = props.initialUrl ? parseURL(props.initialUrl).pathname : typeof window !== 'undefined' ? window.location.pathname : ''
  const [treeInfo, setTreeInfo] = useState(router.findRouteTree(url))

  if (!canUseDOM) {
    loadClientRouter(router, dataContext.current, cache.current, navigate, props.initialUrl)
  }

  const onUrlChanges = useCallback(
    (url: string) => {
      const currentUrlTreeInfo = router.findRouteTree(url)
      if (currentUrlTreeInfo.tree !== treeInfo.tree || !isEqual(currentUrlTreeInfo.params, treeInfo.params)) {
        console.log('changing url', new URL(url, window.location.origin).href)
        setTreeInfo(currentUrlTreeInfo)
        loadClientRouter(router, dataContext.current, cache.current, navigate, new URL(url, window.location.origin).href)
        routerHook.callHook('onUrlChange')
      }
    },
    [treeInfo],
  )

  useLayoutEffect(() => {
    // load cache
    const tempCache = new Cache()
    cache.current.loadFromWindow()
    const proxiedCache = new Proxy(tempCache, {
      get(target: Cache, prop: keyof Cache, receiver: any) {
        if (typeof target[prop] === 'function' && prop.startsWith('get')) {
          return target[prop].bind(target)
        }
        return cache.current[prop].bind(cache.current)
      },
    })
    // load router using cached data
    loadClientRouter(router, dataContext.current, cache.current, navigate)
    // proxy the history api to trigger the onUrlChanges
    proxyHistoryApi(onUrlChanges)
  }, [])

  const revalidateTree = useCallback(() => {
    return loadClientRouter(router, dataContext.current, cache.current, navigate)
  }, [router])

  const outletContextValue = useMemo(() => {
    return {
      tree: treeInfo.tree!,
      params: treeInfo.params || {},
      dataContext: dataContext.current,
      cache: cache.current,
      level: 0,
    }
  }, [treeInfo])

  const routerContextValue = useMemo(() => {
    return { router, navigate, revalidateTree, layoutOptions }
  }, [revalidateTree, layoutOptions])

  return (
    <RouterContext.Provider value={routerContextValue}>
      <OutletContext.Provider value={outletContextValue}>
        <Outlet />
      </OutletContext.Provider>
    </RouterContext.Provider>
  )
})

export function routeLoaderSuspense<T>(route: AnyRoute<any, any, any, any, any, TRouteProps>, params: Record<string, string>, dataContext: DataContext<any>, cache: Cache): T | void {
  const { url: matchedUrl } = route.parsePath(params)
  const promiseMaps = dataContext.suspensePromiseStore
  const cachedData = cache.getLoaderCache(route.getId(), matchedUrl, true)
  const promiseKey = `${route.getId()}-${matchedUrl}`

  if (!promiseMaps[promiseKey]) {
    let resolve = (value: unknown) => {},
      reject = (reason: unknown) => {}
    const promise = new Promise(async (r, rr) => {
      resolve = (data: any) => {
        if ('errors' in data) {
          // throw data
          promiseMaps[promiseKey].errorData = data.errors
        }
        promiseMaps[promiseKey].status = 'fetched'
        r(data)
      }
      rr = reject
    })
    if (cachedData && !canUseDOM) {
      promiseMaps[promiseKey] = {
        promise,
        reject,
        resolve,
        status: 'fetched',
      }
    } else {
      promiseMaps[promiseKey] = {
        promise,
        reject,
        resolve,
        status: 'pending',
      }
      //   if (canUseDOM)
      // set hook to notify when data has fetched.
      cache.hookOnce('loader', route.getId(), matchedUrl, data => {
        resolve(data)
      })
    }
  }

  if (promiseMaps[promiseKey].status !== 'fetched') {
    throw promiseMaps[promiseKey].promise
  }

  if (promiseMaps[promiseKey].status === 'fetched') {
    if (cachedData && promiseMaps[promiseKey] && promiseMaps[promiseKey].errorData) {
      throw 'root' in promiseMaps[promiseKey].errorData ? new Error(promiseMaps[promiseKey].errorData.root) : promiseMaps[promiseKey].errorData
    }
    if (cachedData && cachedData.status === 'error' && 'errors' in cachedData.value) {
      const errorData = cachedData.value.errors
      throw 'root' in errorData ? new Error(errorData.root) : errorData
    }
    if (cachedData) return cachedData.value
  }
}

export const Outlet: FC = () => {
  const { tree } = useContext(OutletContext)
  const route = tree[0]!
  if (!route) return null

  const routeProps = route.getProps()
  const Layout = routeProps?.Layout || Fragment
  // wrap route with suspense before load the route
  return (
    <Suspense>
      <Layout>
        <Suspense
          fallback={
            <Suspense>
              <RouteLoading routeProps={routeProps || {}} />
            </Suspense>
          }
        >
          <ErrorBoundary FallbackComponent={ErrorBoundaryFallback}>
            <RouteRenderer />
          </ErrorBoundary>
        </Suspense>
      </Layout>
    </Suspense>
  )
}

const RouteLoading: FC<{ routeProps: TRouteProps }> = ({ routeProps }) => {
  return routeProps.LoadingComponent ? <routeProps.LoadingComponent /> : null
}

const canUseDOM = !!(typeof window !== 'undefined' && window.document && window.document.createElement)

const useLayoutEffect = canUseDOM ? React.useLayoutEffect : () => {}

const ErrorBoundaryFallback: FC<FallbackProps> = props => {
  const { tree } = useContext(OutletContext)
  const route = tree[0]
  if (!route) return null
  const routeProps = route!.getProps()
  useLayoutEffect(() => {
    routerHook.hookOnce('onUrlChange', props.resetErrorBoundary)
    return props.resetErrorBoundary
  }, [tree])
  // TODO: create default error boundary
  if (routeProps?.ErrorBoundary) return <routeProps.ErrorBoundary {...props} />
  throw props.error
}

const RouteRenderer: FC = () => {
  const { tree, params, dataContext, cache, level } = useContext(OutletContext)
  const route = tree[0]
  if (!route) return null
  const routeProps = route.getProps()
  const theRestOfRoutes = useMemo(() => tree?.slice(1, tree.length), [tree])

  routeLoaderSuspense(route, params, dataContext, cache)

  if (!routeProps?.component) return null
  return (
    <OutletContext.Provider value={{ tree: theRestOfRoutes, params, dataContext, cache, level: level + 1, route }}>
      <RouteComponent />
    </OutletContext.Provider>
  )
}

const RouteComponent: FC = () => {
  const { route, dataContext } = useContext(OutletContext)
  const routeProps = route!.getProps()! as Required<TRouteProps>
  const loaderData = useLoaderData()

  return <routeProps.component loaderData={loaderData} dataContext={dataContext.data} />
}

export type GetLoaderData<RouteId extends AlsoAllowString<keyof RouteFilesByRouteId>> = RouteId extends keyof RouteFilesByRouteId
  ? RouteFilesByRouteId[RouteId]['route'] extends AnyRoute<any, infer TLoaderResult>
    ? TLoaderResult
    : unknown
  : any

export const useLoaderData = <RouteId extends AlsoAllowString<keyof RouteFilesByRouteId>>() => {
  const { route, params, cache } = useContext(OutletContext)
  const { url } = route!.parsePath(params)

  const subscribe = (onStoreChange: () => void) => {
    cache.hook('loader', route!.getId(), url, onStoreChange)
    return () => cache.removeHook('loader', route!.getId(), url, onStoreChange)
  }

  const getSnapshot = (): Promise<GetLoaderData<RouteId>> => {
    return cache.getLoaderCache(route!.getId(), url)
  }

  return useSyncExternalStore(subscribe, getSnapshot, getSnapshot)
}
