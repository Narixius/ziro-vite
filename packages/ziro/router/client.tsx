/// <reference types="vite/client" />

import { createContext, createElement, FC, HTMLAttributes, HTMLProps, MouseEvent, PropsWithChildren, Suspense, useCallback, useContext, useEffect, useState } from 'react'
import { ErrorBoundary } from 'react-error-boundary'
import { createHead, useHead } from 'unhead'
import { AnyRoute, ZiroRoute, ZiroRouter } from './core.js'

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
  }, [])
  return (
    <RouterContext.Provider value={router}>
      <ErrorBoundary fallback={<span>error</span>}>
        <RouterEntryPoint routeTree={routeTree} />
      </ErrorBoundary>
    </RouterContext.Provider>
  )
}

const createRouteSuspender = <TPath extends string, TLoaderData, TParentRoute extends AnyRoute>(route: ZiroRoute<TPath, TParentRoute, TLoaderData>) => {
  const suspender = route.load()

  const routeStatus = route.getLoaderStatus()
  if (routeStatus.status === 'pending') {
    throw suspender
  } else if (routeStatus.status === 'error') {
    throw routeStatus.data
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

export const Outlet: FC = () => {
  const outletContext = useContext(OutletRouteContext)
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
  if (!route.errorComponent) return children
  return (
    <ErrorBoundary
      FallbackComponent={function FC({ error, resetErrorBoundary }) {
        const router = useRouter()
        useEffect(() => {
          return router?.hook('change-url', resetErrorBoundary)
        }, [])
        if (route.errorComponent) {
          return <route.errorComponent error={error} resetErrorBoundary={resetErrorBoundary} status={error.getStatus && error.getStatus()} />
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
  createRouteSuspender(route)
  return (
    <>
      <RouteMetaTags route={route} />
      <route.component params={route.getParams()} loaderData={route.getData()} dataContext={route.getDataContext()} />
    </>
  )
}

const RouteMetaTags: FC<PropsWithChildren<{ route: AnyRoute }>> = ({ route, children }) => {
  const onLoad = useCallback(() => {
    if (route.meta)
      route
        .meta({
          dataContext: route.getDataContext()!,
          params: route.getParams()!,
          loaderData: route.getData()!,
        })
        .then(useHead)
  }, [route])

  useEffect(() => {
    onLoad()
    return route.on('load', onLoad)
  }, [])

  return null
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

export const Html: FC<PropsWithChildren<HTMLProps<HTMLHtmlElement>>> = ({ children }) => {
  if (!import.meta.env.SSR) return <>{children}</>
  return <html>{children}</html>
}

export const Body: FC<PropsWithChildren> = ({ children }) => {
  if (!import.meta.env.SSR) return <>{children}</>
  return <body>{children}</body>
}

export const Head: FC<PropsWithChildren> = ({ children }) => {
  if (!import.meta.env.SSR) return <>{children}</>
  return <head>{children}</head>
}
