import { createHooks } from 'hookable'
import { createContext, FC, Suspense, useCallback, useContext, useEffect, useLayoutEffect, useMemo, useRef, useState, useSyncExternalStore, useTransition } from 'react'
import { ErrorBoundary, FallbackProps } from 'react-error-boundary'
import { RouteFilesByRouteId } from 'ziro2/router'
import { Cache } from '../Cache'
import { AnyRoute } from '../Route'
import { DataContext } from '../RouteDataContext'
import { Router as RouterObj } from '../Router'
import { isRedirectResponse } from '../utils/redirect'

export type RouteProps<RouteId extends keyof RouteFilesByRouteId> = {
  loaderData: RouteFilesByRouteId[RouteId]['route'] extends AnyRoute<any, infer TLoaderResult> ? TLoaderResult : unknown
}

type TRouteProps = {
  component?: FC<{ loaderData: any }>
  LoadingComponent?: FC
  ErrorBoundary?: FC<FallbackProps>
}
type RouterProps = {
  router: RouterObj<TRouteProps>
}

const routerHook = createHooks<{
  onUrlChange: () => void
}>()

type NavigateFn = (to: string, options: { replace?: boolean }) => void

const RouterContext = createContext<{ router: RouterObj; navigate: NavigateFn }>(null!)

export const Router: FC<RouterProps> = ({ router }) => {
  const [url, setUrl] = useState(window.location.pathname)
  const dataContext = useRef(new DataContext())
  const cache = useRef(new Cache())
  const treeInfo = useMemo(() => {
    routerHook.callHook('onUrlChange')
    return router.findRouteTree(url)
  }, [url])
  const [, startTransition] = useTransition()

  useEffect(() => {
    window.history.pushState = new Proxy(window.history.pushState, {
      apply: (target, thisArg, argArray) => {
        // trigger here what you need
        startTransition(() => {
          setUrl(argArray[2])
        })
        return target.apply(thisArg, argArray as [any, string, string?])
      },
    })
    window.addEventListener('popstate', e => {
      setUrl(window.location.pathname)
    })
  }, [])

  const navigate = useCallback((to: string, options: { replace?: boolean }) => {
    if (typeof window !== 'undefined') window.history[options.replace ? 'replaceState' : 'pushState']({}, '', to)
    else {
      startTransition(() => {
        setUrl(to)
      })
    }
  }, [])

  return (
    <RouterContext.Provider value={{ router, navigate }}>
      <OutletContext.Provider
        value={{
          tree: treeInfo.tree!,
          params: treeInfo.params || {},
          dataContext: dataContext.current,
          cache: cache.current,
          level: 0,
        }}
      >
        <Outlet />
      </OutletContext.Provider>
    </RouterContext.Provider>
  )
}

const OutletContext = createContext<{
  tree: AnyRoute<any, any, any, any, any, TRouteProps>[]
  route?: AnyRoute<any, any, any, any, any, TRouteProps>
  params: Record<string, string>
  dataContext: DataContext
  cache: Cache
  level: number
}>(null!)

const getCurrentBrowserURLRequest = () => {
  const url = new URL(window.location.href)
  const req = new Request(url, {
    method: 'GET',
  })
  return req
}

class SuspenseError {
  constructor(public value: any) {}
}

const promiseMaps: Record<
  string,
  {
    promise: Promise<any>
    resolve: (value: any) => void
    reject: (reason: unknown) => void
  }
> = {}

function useRouteLoader<T>(route: AnyRoute<any, any, any, any, any, TRouteProps>, params: Record<string, string>, dataContext: DataContext<any>, cache: Cache, navigate: NavigateFn): T | void {
  const { url: matchedUrl } = route.parsePath(params)

  const cachedData = cache.getLoaderCache(route.getId(), matchedUrl)
  const promiseKey = `${route.getId()}-${matchedUrl}`

  if (!cachedData) {
    let resolve = (value: unknown) => {},
      reject = (reason: unknown) => {}
    const promise = new Promise((r, rr) => {
      resolve = r
      rr = reject
    })
    promiseMaps[promiseKey] = {
      promise,
      reject,
      resolve,
    }
    // set hook to notify when data has fetched.
    cache.onDataCached(
      'loader',
      route.getId(),
      matchedUrl,
      data => {
        resolve(data)
        delete promiseMaps[promiseKey]
      },
      true,
    )
    // async call load route
    loadRoute(route, params, dataContext, cache).catch(e => {
      if (e instanceof Response) {
        if (isRedirectResponse(e)) {
          navigate(e.headers.get('Location') || e.url, { replace: true })
          return
        }
      }
      const error = new SuspenseError(e)
      cache.setLoaderCache(route.getId(), matchedUrl, error)
      reject(error)
      delete promiseMaps[promiseKey]
    })
  }

  if (cachedData) {
    // todo: fix this section
    if (cachedData instanceof SuspenseError) {
      throw cachedData.value
    }
    // async call load meta
    loadRouteMeta(route, params, dataContext, cache)
    return cachedData as T
  } else if (promiseMaps[promiseKey]) {
    throw promiseMaps[promiseKey].promise
  }
}

const loadRoute = async (route: AnyRoute<any, any, any, any, any, TRouteProps>, params: Record<string, string>, dataContext: DataContext<any>, cache: Cache) => {
  const request = getCurrentBrowserURLRequest()
  return await route.onRequest(request, params, dataContext, cache)
}

const loadRouteMeta = async (route: AnyRoute<any, any, any, any, any, TRouteProps>, params: Record<string, string>, dataContext: DataContext<any>, cache: Cache) => {
  const request = getCurrentBrowserURLRequest()
  return await route.loadMeta(dataContext, request, params, cache)
}

export const Outlet: FC = () => {
  const { tree } = useContext(OutletContext)
  const route = tree[0]
  const routeProps = route.getProps()
  // wrap route with suspense before load the route
  return (
    <Suspense fallback={routeProps?.LoadingComponent ? <routeProps.LoadingComponent /> : ``}>
      <ErrorBoundary FallbackComponent={ErrorBoundaryFallback}>
        <RouteRenderer />
      </ErrorBoundary>
    </Suspense>
  )
}

const ErrorBoundaryFallback: FC<FallbackProps> = props => {
  const { tree, ...rest } = useContext(OutletContext)
  const route = tree[0]
  const routeProps = route!.getProps()
  useLayoutEffect(() => {
    routerHook.hookOnce('onUrlChange', props.resetErrorBoundary)
    return props.resetErrorBoundary
  }, [tree])

  return routeProps?.ErrorBoundary ? <routeProps.ErrorBoundary {...props} /> : <span>error</span>
}

const RouteRenderer: FC = () => {
  const { tree, params, dataContext, cache, level } = useContext(OutletContext)
  const route = tree[0]
  const routeProps = route.getProps()
  const theRestOfRoutes = useMemo(() => tree?.slice(1, tree.length), [tree])
  const { navigate } = useContext(RouterContext)
  const data = useRouteLoader(route, params, dataContext, cache, navigate)
  if (!routeProps?.component) return null

  return (
    <OutletContext.Provider value={{ tree: theRestOfRoutes, params, dataContext, cache, level: level + 1, route }}>
      <routeProps.component loaderData={data} />
    </OutletContext.Provider>
  )
}

export const useLoaderData = () => {
  const { route, params, cache } = useContext(OutletContext)

  const { url } = route!.parsePath(params)
  const subscribe = (onStoreChange: () => void) => {
    cache.onDataCached('loader', route!.getId(), url, onStoreChange)
    return () => cache.removeHook('loader', route!.getId(), url, onStoreChange)
  }

  const getSnapshot = () => {
    return cache.getLoaderCache(route!.getId(), url)
  }

  return useSyncExternalStore(subscribe, getSnapshot, getSnapshot)
}
