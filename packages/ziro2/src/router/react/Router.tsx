import { createHooks } from 'hookable'
import { FC, Suspense, useCallback, useContext, useEffect, useLayoutEffect, useMemo, useRef, useState, useSyncExternalStore, useTransition } from 'react'
import { ErrorBoundary, FallbackProps } from 'react-error-boundary'
import { RouteFilesByRouteId } from 'ziro2/router'
import { AlsoAllowString } from '../../types'
import { Cache } from '../Cache'
import { AnyRoute } from '../Route'
import { DataContext } from '../RouteDataContext'
import { Router as RouterObj } from '../Router'
import { isRedirectResponse } from '../utils/redirect'
import { OutletContext } from './contexts/OutletContext'
import { NavigateFn, RouterContext } from './contexts/RouterContext'

export type RouteProps<RouteId extends keyof RouteFilesByRouteId> = {
  loaderData: RouteFilesByRouteId[RouteId]['route'] extends AnyRoute<any, infer TLoaderResult> ? TLoaderResult : unknown
}

export type TRouteProps = {
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

export const Router: FC<RouterProps> = ({ router }) => {
  const [url, setUrl] = useState(window.location.pathname)
  const dataContext = useRef(new DataContext())
  const cache = useRef(new Cache())

  const navigate = useCallback((to: string, options: { replace?: boolean }) => {
    if (typeof window !== 'undefined') window.history[options.replace ? 'replaceState' : 'pushState']({}, '', to)
    else {
      //   startTransition(() => {
      setUrl(to)
      //   })
    }
  }, [])

  const treeInfo = useMemo(() => {
    routerHook.callHook('onUrlChange')
    loadRouter(router, dataContext.current, cache.current, navigate)
    return router.findRouteTree(url)
  }, [url, navigate])

  const [, startTransition] = useTransition()

  useEffect(() => {
    window.history.pushState = new Proxy(window.history.pushState, {
      apply: (target, thisArg, argArray) => {
        // trigger here what you need
        // startTransition(() => {
        setUrl(argArray[2])
        // })
        return target.apply(thisArg, argArray as [any, string, string?])
      },
    })
    window.history.replaceState = new Proxy(window.history.replaceState, {
      apply: (target, thisArg, argArray) => {
        // trigger here what you need
        // startTransition(() => {
        setUrl(argArray[2])
        // })
        return target.apply(thisArg, argArray as [any, string, string?])
      },
    })
    window.addEventListener('popstate', e => {
      setUrl(window.location.pathname)
    })
  }, [])

  const revalidateTree = useCallback(() => {
    // proxy the cache, on get methods, return undefined because we want to recall the loaders
    // on set methods, we must call the original cache setter method
    const proxyCache = new Proxy(cache.current, {
      get(target, prop: keyof Cache) {
        if (typeof target[prop] === 'function') {
          return (...args: any[]) => {
            if (prop.startsWith('set')) {
              return (target[prop] as Function).apply(target, args)
            }
            return undefined
          }
        }
        return target[prop]
      },
    })
    return loadRouter(router, dataContext.current, proxyCache, navigate)
  }, [router, navigate])

  return (
    <RouterContext.Provider value={{ router, navigate, revalidateTree }}>
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

const loadRouter = async (router: RouterObj<TRouteProps>, dataContext: DataContext<any>, cache: Cache, navigate: NavigateFn) => {
  const request = getCurrentBrowserURLRequest()
  try {
    const response = await router.handleRequest(request, cache, dataContext).catch(e => {
      if (e instanceof Response && isRedirectResponse(e)) {
        return e
      }
    })
    if (response instanceof Response && isRedirectResponse(response)) navigate(response.headers.get('Location') || response.url, { replace: true })
  } catch (e) {
    console.log(e)
  }
}

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

function routeLoadedSuspense<T>(route: AnyRoute<any, any, any, any, any, TRouteProps>, params: Record<string, string>, dataContext: DataContext<any>, cache: Cache, navigate: NavigateFn): T | void {
  const { url: matchedUrl } = route.parsePath(params)

  const cachedData = cache.getLoaderCache(route.getId(), matchedUrl)
  const promiseKey = `${route.getId()}-${matchedUrl}`

  if (!cachedData && !promiseMaps[promiseKey]) {
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
    cache.hookOnce('loader', route.getId(), matchedUrl, data => {
      resolve(data)
      delete promiseMaps[promiseKey]
    })
    // async call load route
    // loadRoute(route, params, dataContext, cache).catch(e => {
    //   if (e instanceof Response) {
    //     if (isRedirectResponse(e)) {
    //       navigate(e.headers.get('Location') || e.url, { replace: true })
    //       return
    //     }
    //   }
    //   const error = new SuspenseError(e)
    //   cache.setLoaderCache(route.getId(), matchedUrl, error)
    //   reject(error)
    //   delete promiseMaps[promiseKey]
    // })
  }

  //   if (cachedData) {
  //     // todo: fix loop erroring
  //     // if (cachedData instanceof SuspenseError) {
  //     //   throw cachedData.value
  //     // }
  //     // async call load meta
  //     loadRouteMeta(route, params, dataContext, cache)
  //     return cachedData as T
  //   }
  if (!cachedData && promiseMaps[promiseKey]) {
    throw promiseMaps[promiseKey].promise
  }
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
  // TODO: create default error boundary
  return routeProps?.ErrorBoundary ? <routeProps.ErrorBoundary {...props} /> : <span>error</span>
}

const RouteRenderer: FC = () => {
  const { tree, params, dataContext, cache, level } = useContext(OutletContext)
  const route = tree[0]
  const routeProps = route.getProps()
  const theRestOfRoutes = useMemo(() => tree?.slice(1, tree.length), [tree])
  const { navigate } = useContext(RouterContext)

  routeLoadedSuspense(route, params, dataContext, cache, navigate)

  if (!routeProps?.component) return null
  return (
    <OutletContext.Provider value={{ tree: theRestOfRoutes, params, dataContext, cache, level: level + 1, route }}>
      <RouteComponent />
    </OutletContext.Provider>
  )
}

const RouteComponent: FC = () => {
  const { route, params, dataContext, cache } = useContext(OutletContext)
  const routeProps = route!.getProps()!
  const loaderData = useLoaderData()

  useEffect(() => {
    // todo: this should be improved, it has bug
    loadRouteMeta(route!, params, dataContext, cache)
  }, [])

  if (routeProps.component) return <routeProps.component loaderData={loaderData} />
  return null
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
