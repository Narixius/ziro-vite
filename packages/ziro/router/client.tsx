import { createContext, FC, useContext } from 'react'
import { ZiroRoute, ZiroRouter } from './core.js'

type RouterProviderType = { router: ZiroRouter }
const RouterContext = createContext<ZiroRouter | null>(null)

export const useRouter = () => useContext(RouterContext)

export const Router: FC<RouterProviderType> = ({ router }) => {
  const routeTree = router?.lookupRoute(router.url)
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
  console.log(outletContext)
  if (outletContext) return <RouterEntryPoint routeTree={outletContext?.children} />
}
