import { addRoute as addRou3Route, createRouter as createRou3Router, findRoute as findRou3Route, RouterContext } from 'rou3'

export type ZiroRoute = {
  path: string
  parent: ZiroRoute | null
  component: () => JSX.Element
  meta?: Record<string, unknown>
}

type CreateRouterOptions = {
  initialUrl: string
}

export type ZiroRouter = {
  url: string
  tree: RouterContext<ZiroRoute>
  routes: ZiroRoute[]
  addRoute: (this: ZiroRouter, route: ZiroRoute) => void
  findRoute: (this: ZiroRouter, url: string) => ZiroRoute | undefined
  _lookupRoute: (this: ZiroRouter, path: string) => ZiroRoute[]
  lookupRoute: (this: ZiroRouter, path: string) => ZiroRoute[]
}

export const createRouter = (opts: CreateRouterOptions): ZiroRouter => {
  return {
    url: opts.initialUrl,
    tree: createRou3Router<ZiroRoute>(),
    routes: [],
    addRoute(route) {
      addRou3Route(this.tree, 'GET', route.path, route)
      this.routes.push(route)
    },
    findRoute(url: string) {
      const route = findRou3Route(this.tree, 'GET', url)
      if (route) return route[0].data
      return undefined
    },
    _lookupRoute(path) {
      const route = this.findRoute(path)
      if (route?.parent) {
        const parentRoute = this._lookupRoute(route.parent.path)
        return [route, ...(parentRoute ? parentRoute : [])]
      }
      if (route) return [route]
      return []
    },
    lookupRoute(path) {
      return this._lookupRoute(path).reverse()
    },
  }
}

export const createRoute = (options: ZiroRoute): ZiroRoute => {
  return options
}
