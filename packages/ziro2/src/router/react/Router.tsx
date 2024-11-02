import { createContext, FC, Suspense, useContext, useEffect, useMemo, useRef, useState } from 'react'
import { Cache } from '../Cache'
import { AnyRoute } from '../Route'
import { DataContext } from '../RouteDataContext'
import { Router as RouterObj } from '../Router'

type RouteProps = {
  component?: FC<{ loaderData: any }>
  LoadingComponent?: FC
  ErrorBoundary?: FC
}
type RouterProps = {
  router: RouterObj<RouteProps>
}

const RouterContext = createContext<{ router: RouterObj }>(null!)
export const Router: FC<RouterProps> = ({ router }) => {
  const [url, setUrl] = useState(window.location.pathname)
  const dataContext = useRef(new DataContext())
  const cache = useRef(new Cache())
  const treeInfo = useMemo(() => router.findRouteTree(url), [url])
  useEffect(() => {
    window.history.pushState = new Proxy(window.history.pushState, {
      apply: (target, thisArg, argArray) => {
        // trigger here what you need
        setUrl(argArray[2])
        return target.apply(thisArg, argArray as [any, string, string?])
      },
    })
    window.addEventListener('popstate', e => {
      setUrl(window.location.pathname)
    })
  }, [])
  return (
    <RouterContext.Provider value={{ router }}>
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

export const OutletContext = createContext<{ tree: AnyRoute<any, any, any, any, any, RouteProps>[]; params: Record<string, string>; dataContext: DataContext; cache: Cache; level: number }>(null!)

const getCurrentBrowserURLRequest = () => {
  const url = new URL(window.location.href)
  const req = new Request(url, {
    method: 'GET',
  })
  return req
}

const promiseMaps: Record<
  string,
  {
    promise: Promise<any>
    resolve: (value: any) => void
    reject: (reason: unknown) => void
  }
> = {}

function useRouteLoader<T>(route: AnyRoute<any, any, any, any, any, RouteProps>, params: Record<string, string>, dataContext: DataContext<any>, cache: Cache): T {
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
    cache.on('loader', route.getId(), matchedUrl, data => {
      resolve(data)
      delete promiseMaps[promiseKey]
    })
    // async call load route
    loadRoute(route, params, dataContext, cache)
  }

  if (cachedData) {
    // async call load meta
    loadRouteMeta(route, params, dataContext, cache)
    return cachedData as T
  } else if (promiseMaps[promiseKey]) {
    throw promiseMaps[promiseKey].promise
  }

  throw new Error('Unexpected cache state')
}

const loadRoute = async (route: AnyRoute<any, any, any, any, any, RouteProps>, params: Record<string, string>, dataContext: DataContext<any>, cache: Cache) => {
  const request = getCurrentBrowserURLRequest()
  return await route.onRequest(request, params, dataContext, cache)
}

const loadRouteMeta = async (route: AnyRoute<any, any, any, any, any, RouteProps>, params: Record<string, string>, dataContext: DataContext<any>, cache: Cache) => {
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
      <RouteLoader />
    </Suspense>
  )
}

const RouteLoader: FC = () => {
  const { tree, params, dataContext, cache, level } = useContext(OutletContext)
  const route = tree[0]
  const routeProps = route.getProps()
  const theRestOfRoutes = useMemo(() => tree?.slice(1, tree.length), [tree])
  const data = useRouteLoader(route, params, dataContext, cache)
  if (!routeProps?.component) return null
  return (
    <OutletContext.Provider value={{ tree: theRestOfRoutes, params, dataContext, cache, level: level + 1 }}>
      <routeProps.component loaderData={data} />
    </OutletContext.Provider>
  )
}
