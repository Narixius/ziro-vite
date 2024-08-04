import { createContext, createElement, FC, HTMLAttributes, MouseEvent, PropsWithChildren, Suspense, useContext, useEffect, useState } from 'react'
import { ErrorBoundary } from 'react-error-boundary'
import { createHead, useHead } from 'unhead'
import { AnyRoute, FileRoutesByPath, ZiroRoute, ZiroRouter } from './core.js'

createHead()

type RouterProviderType = { router: ZiroRouter }
const RouterContext = createContext<ZiroRouter | null>(null)

export const useRouter = () => useContext(RouterContext)

export const Router: FC<RouterProviderType> = ({ router }) => {
  const [routeTree, setRouteTree] = useState(router.flatLookup(router.url))

  useEffect(() => {
    const callback = (router: ZiroRouter) => {
      setRouteTree(router.flatLookup(router.url))
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

const createRouteSuspender = <TPath extends keyof FileRoutesByPath, TLoaderData, TParentRoute extends AnyRoute = FileRoutesByPath[TPath]['parent']>(
  route: ZiroRoute<TPath, TParentRoute, TLoaderData>,
) => {
  const suspender = route.load()

  return {
    read() {
      const routeStatus = route.getLoaderStatus()
      if (routeStatus.status === 'pending') {
        throw suspender
      } else if (routeStatus.status === 'error') {
        throw routeStatus.data
      } else if (routeStatus.status === 'success') {
        return routeStatus.data
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
        <ErrorBoundary
          FallbackComponent={function FC({ error, resetErrorBoundary }) {
            const router = useRouter()
            router?.hook('change-url', resetErrorBoundary)
            if (route.errorComponent) return <route.errorComponent error={error} resetErrorBoundary={resetErrorBoundary} />
            return <></>
          }}
        >
          <RouteComponentSuspense />
        </ErrorBoundary>
      </RouteSuspenseFallback>
    </RouteContext.Provider>
  )
}
const RouteSuspenseFallback: FC<PropsWithChildren> = ({ children }) => {
  const route = useRoute()
  return <Suspense fallback={route.loadingComponent ? createElement(route.loadingComponent) : '...'}>{children}</Suspense>
}

const RouteComponentSuspense: FC = () => {
  const route = useRoute()
  createRouteSuspender(route).read()
  return (
    <RouteMetaTags route={route}>
      <route.component params={route.getParams()} loaderData={route.getData()} dataContext={route.getDataContext()} />
    </RouteMetaTags>
  )
}

const RouteMetaTags: FC<PropsWithChildren<{ route: AnyRoute }>> = ({ route, children }) => {
  useEffect(() => {
    if (route.meta) {
      route
        .meta({
          dataContext: route.getDataContext()!,
          params: route.getParams()!,
          loaderData: route.getData()!,
        })
        .then(useHead)
    }
  })
  return children
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
