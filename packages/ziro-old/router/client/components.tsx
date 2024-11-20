import { createContext, createElement, FC, PropsWithChildren, Suspense, useEffect, useState } from 'react'
import { ErrorBoundary } from 'react-error-boundary'
import { SWRCacheProvider } from '../cache/context.js'
import { useSWRStore } from '../cache/useSwr.js'
import { AnyRoute, DEFAULT_ROOT_PATH, ZiroRouter } from '../core.js'
import DefaultErrorComponent from '../default-error-component.js'
import { useOutlet } from '../hooks/useOutlet.js'
import { useRoute } from '../hooks/useRoute.js'
import { useRouter } from '../hooks/useRouter.js'

type RouterProviderType = { router: ZiroRouter }
export const RouterContext = createContext<ZiroRouter | null>(null)
export const RouteContext = createContext<AnyRoute | null>(null)
export const OutletRouteContext = createContext<{ route: AnyRoute; children: AnyRoute[] } | null>(null)

export const Router: FC<RouterProviderType> = ({ router }) => {
  const [routeTree, setRouteTree] = useState(router.flatLookup(router.url!))

  useEffect(() => {
    const callback = (router: ZiroRouter) => {
      setRouteTree(router.flatLookup(router.url!))
    }
    router.hook('change-url', callback)
  }, [])

  return (
    <RouterContext.Provider value={router}>
      <SWRCacheProvider cache={router.cache}>
        <RouterEntryPoint routeTree={routeTree} />
      </SWRCacheProvider>
    </RouterContext.Provider>
  )
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
  // TODO: show default error page here
}

export const Outlet: FC = () => {
  const outletContext = useOutlet()
  if (outletContext && outletContext?.children.length) return <RouterEntryPoint routeTree={outletContext?.children} />
}

const RouteComponentRenderer: FC<{ route: AnyRoute }> = ({ route }) => {
  return (
    <RouteContext.Provider value={route}>
      <RouteErrorBoundary>
        <RouteSuspenseFallback>
          <RouteComponentSuspense />
        </RouteSuspenseFallback>
      </RouteErrorBoundary>
    </RouteContext.Provider>
  )
}

const RouteErrorBoundary: FC<PropsWithChildren> = ({ children }) => {
  const route = useRoute()
  const router = useRouter()
  try {
    // if (router?.dehydrate) {
    const data = router!.cache.getCacheManager().get(route.getRouteUniqueKey())

    if (data && data.isError && route.errorComponent) {
      const error = data.data
      //   if (isRedirectError(data.data) && router?.dehydrate) {
      //     throw data.data
      //   }
      const isRootRendered = route.path !== DEFAULT_ROOT_PATH
      const props: any = {
        error,
        status: error.status,
      }
      if (route.errorComponent === DefaultErrorComponent) props.isRootRendered = isRootRendered
      if (route.errorComponent) return <route.errorComponent {...props} />
    }
    // }
  } catch (data: any) {}

  if (!route.errorComponent) return children

  return (
    <ErrorBoundary
      FallbackComponent={function FC({ error, resetErrorBoundary }) {
        const router = useRouter()
        useEffect(() => {
          return router?.hook('change-url', resetErrorBoundary)
        }, [])
        if (route.errorComponent) {
          let passedError: any = error
          return <route.errorComponent error={passedError} resetErrorBoundary={resetErrorBoundary} status={passedError.status} />
        }
        throw error
      }}
    >
      {children}
    </ErrorBoundary>
  )
}
const RouteSuspenseFallback: FC<PropsWithChildren> = ({ children }) => {
  const route = useRoute()
  return <Suspense fallback={route.loadingComponent ? createElement(route.loadingComponent) : ''}>{children}</Suspense>
}

const RouteComponentSuspense: FC = () => {
  const route = useRoute()
  console.log(route.path, route.load)
  const routeStore = useSWRStore(route.getRouteUniqueKey(), route.load.bind(route))
  console.log(routeStore)
  if (routeStore?.isError) {
    throw routeStore.data
  }
  useEffect(() => {
    route.loadMeta()
  }, [])
  console.log(route.path, routeStore)
  return createElement(route.component, {
    params: route.getParams(),
    loaderData: routeStore?.data,
    dataContext: route.getDataContext(),
  })
}
