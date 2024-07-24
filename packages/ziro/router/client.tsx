import { createContext, createElement, FC, HTMLAttributes, MouseEvent, useContext, useEffect, useState } from 'react'
import { ZiroRoute, ZiroRouter } from './core.js'

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

const RouterEntryPoint: FC<{ routeTree: ZiroRoute[] }> = ({ routeTree }) => {
  if (routeTree?.length) {
    const route = routeTree[0]
    const Component = route.component
    const children = routeTree.filter((_, i) => i > 0)
    return (
      <OutletRouteContext.Provider
        value={{
          route,
          children,
        }}
      >
        <Component />
      </OutletRouteContext.Provider>
    )
  }
}

const OutletRouteContext = createContext<{ route: ZiroRoute; children: ZiroRoute[] } | null>(null)

export const useRoute = () => useContext(OutletRouteContext)?.route

export const Outlet: FC = () => {
  const outletContext = useContext(OutletRouteContext)
  if (outletContext) return <RouterEntryPoint routeTree={outletContext?.children} />
}

export const Link: FC<HTMLAttributes<HTMLAnchorElement> & { href: string }> = props => {
  const router = useRouter()
  const onClick = (e: MouseEvent) => {
    e.preventDefault()
    if (router) router.push(props.href)
  }
  return createElement('a', { ...props, onClick })
}
