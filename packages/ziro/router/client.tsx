import { createContext, createElement, FC, HTMLAttributes, HTMLProps, MouseEvent, PropsWithChildren, Suspense, useContext, useEffect, useState } from 'react'
import { ErrorBoundary } from 'react-error-boundary'
import { AnyRoute, ZiroRouter } from './core.js'
import { isRedirectError } from './redirect.js'

type RouterProviderType = { router: ZiroRouter }
const RouterContext = createContext<ZiroRouter | null>(null)

export const useRouter = () => useContext(RouterContext)

export const Router: FC<RouterProviderType> = ({ router }) => {
  const [routeTree, setRouteTree] = useState(router.url ? router.flatLookup(router.url) : [])

  useEffect(() => {
    const callback = (router: ZiroRouter) => {
      setRouteTree(router.flatLookup(router.url!))
    }
    router.hook('change-url', callback)
  }, [])

  return (
    <RouterContext.Provider value={router}>
      {/* <ErrorBoundary fallback={<span>error</span>}> */}
      <RouterEntryPoint routeTree={routeTree} />
      {/* </ErrorBoundary> */}
    </RouterContext.Provider>
  )
}

const createRouteSuspender = <TPath extends string, TLoaderData, TParentRoute extends AnyRoute>(route: AnyRoute<TPath, TParentRoute, TLoaderData>, router: ZiroRouter) => {
  const suspender = route.load()

  const routeStatus = route.getLoaderStatus()
  if (routeStatus.status === 'pending') {
    throw suspender
  } else if (routeStatus.status === 'error') {
    throw routeStatus
  } else if (routeStatus.status === 'success') {
    return routeStatus
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
  // TODO: show default error page here
}

export const useOutlet = () => useContext(OutletRouteContext)

export const Outlet: FC = () => {
  const outletContext = useOutlet()
  if (outletContext && outletContext?.children.length) return <RouterEntryPoint routeTree={outletContext?.children} />
}

const RouteContext = createContext<AnyRoute | null>(null)
export const useRoute = () => useContext(RouteContext)!

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
    const data = createRouteSuspender(route, router!)
    throw data
  } catch (data: any) {
    if (!(data instanceof Promise)) {
      if (data?.status === 'error' && route.errorComponent) {
        const error = JSON.parse(JSON.stringify(data.data))
        if (!router?.dehydrate) {
          delete router!.cache[route.getRouteUniqueKey()]
        }
        if (isRedirectError(data.data) && router?.dehydrate) {
          throw data.data
        }
        if (route.errorComponent) return <route.errorComponent error={error} status={error.status} />
      }
    }
  }

  if (!route.errorComponent) return children

  return (
    <ErrorBoundary
      FallbackComponent={function FC({ error, resetErrorBoundary }) {
        const router = useRouter()
        useEffect(() => {
          return router?.hook('change-url', resetErrorBoundary)
        }, [])
        if (route.errorComponent) {
          let passedError: any = error.data
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
  const router = useRouter()
  createRouteSuspender(route, router!)
  return createElement(route.component, {
    params: route.getParams(),
    loaderData: route.getData(),
    dataContext: route.getDataContext(),
  })
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

export const Html: FC<PropsWithChildren<HTMLProps<HTMLHtmlElement>>> = props => {
  return <html>{props.children}</html>
}

export const Body: FC<PropsWithChildren> = props => {
  return (
    <body>
      <div id="root">{props.children}</div>
    </body>
  )
}

export const Head: FC<PropsWithChildren> = props => {
  return <head suppressHydrationWarning>{props.children}</head>
}
