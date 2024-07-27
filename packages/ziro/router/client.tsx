import { createContext, createElement, FC, HTMLAttributes, MouseEvent, PropsWithChildren, Suspense, useContext, useEffect, useState } from 'react'
import { ErrorBoundary } from 'react-error-boundary'
import { AnyRoute, FileRoutesByPath, ZiroRoute, ZiroRouter } from './core.js'

type RouterProviderType = { router: ZiroRouter }
const RouterContext = createContext<ZiroRouter | null>(null)

export const useRouter = () => useContext(RouterContext)

export const Router: FC<RouterProviderType> = ({ router }) => {
  const [url, setUrl] = useState(router.url)
  const routeTree = router?.lookupRoute(url)

  useEffect(() => {
    const callback = (router: ZiroRouter) => {
      setUrl(router.url)
    }
    router.hook('change-url', callback)
    return () => router.removeHook('change-url', callback)
  }, [])

  return (
    <RouterContext.Provider value={router}>
      <RouterEntryPoint routeTree={routeTree} />
    </RouterContext.Provider>
  )
}

const suspenderMap: Record<string, { status: string; result: any }> = {}
const createRouteSuspender = <TPath extends keyof FileRoutesByPath, TLoaderData, TParentRoute extends AnyRoute = FileRoutesByPath[TPath]['parent']>(
  path: string,
  route: ZiroRoute<TPath, TLoaderData, TParentRoute>,
) => {
  const fn = route.loader
  if (!fn) return { read() {} }
  if (!suspenderMap[path])
    suspenderMap[path] = {
      status: 'pending',
      result: null,
    }
  // @ts-ignore
  const suspender = fn().then(
    data => {
      suspenderMap[path] = {
        status: 'success',
        result: data,
      }
    },
    error => {
      suspenderMap[path] = {
        status: 'error',
        result: error,
      }
    },
  )
  return {
    read() {
      const { status, result } = suspenderMap[path]
      if (status === 'pending') {
        throw suspender
      } else if (status === 'error') {
        route.call('error', result)
        throw result
      } else if (status === 'success') {
        route.setData(result)
        return result
      }
    },
  }
}

const RouterEntryPoint: FC<{ routeTree: AnyRoute[] }> = ({ routeTree }) => {
  if (routeTree?.length) {
    const route = routeTree[0]
    const children = routeTree.filter((_, i) => i > 0)
    return (
      <OutletRouteContext.Provider
        value={{
          route,
          children,
        }}
      >
        <RouteComponentRenderer route={route} />
      </OutletRouteContext.Provider>
    )
  }
}

export const Outlet: FC = () => {
  const outletContext = useContext(OutletRouteContext)
  if (outletContext) return <RouterEntryPoint routeTree={outletContext?.children} />
}

const RouteContext = createContext<AnyRoute | null>(null)
export const useRoute = () => useContext(RouteContext)!

const RouteComponentRenderer: FC<{ route: AnyRoute }> = ({ route }) => {
  return (
    <RouteContext.Provider value={route}>
      <RouteSuspenseFallback>
        <ErrorBoundary fallback={route.errorComponent ? <route.errorComponent /> : <></>}>
          <RouteComponentSuspense />
        </ErrorBoundary>
      </RouteSuspenseFallback>
    </RouteContext.Provider>
  )
}
const RouteSuspenseFallback: FC<PropsWithChildren> = ({ children }) => {
  const route = useRoute()
  return <Suspense fallback={route.loadingComponent ? createElement(route.loadingComponent) : ''}>{children}</Suspense>
}

const RouteComponentSuspense: FC = () => {
  const route = useRoute()
  if (route.loader) createRouteSuspender(route.getMatchedUrl()!, route).read()
  return <route.component params={route.getParams()} loaderData={route.getData()} />
}

export const useLoaderData = () => useRoute().getData()

const OutletRouteContext = createContext<{ route: AnyRoute; children: AnyRoute[] } | null>(null)

export const Link: FC<HTMLAttributes<HTMLAnchorElement> & { href: string }> = props => {
  const router = useRouter()
  const onClick = (e: MouseEvent) => {
    e.preventDefault()
    if (router) router.push(props.href)
  }
  return createElement('a', { ...props, onClick })
}
