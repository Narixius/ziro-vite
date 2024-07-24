import { createHooks } from 'hookable'
import { ComponentType, memo } from 'react'
import { addRoute as addRou3Route, createRouter as createRou3Router, findRoute as findRou3Route, RouterContext } from 'rou3'

export type ZiroRoute = {
  path: string
  parent: ZiroRoute | null
  component: ComponentType
  meta?: Record<string, unknown>
}

type CreateRouterOptions = {
  initialUrl: string
}
const hooks = createHooks<Record<ZiroRouterHooks, (router: ZiroRouter) => void>>()

export type ZiroRouterHooks = 'change-url'

export type ZiroRouter = {
  url: string
  setUrl: (url: string) => void
  tree: RouterContext<ZiroRoute>
  routes: ZiroRoute[]
  addRoute: (this: ZiroRouter, route: ZiroRoute) => void
  findRoute: (this: ZiroRouter, url: string) => ZiroRoute | undefined
  _lookupRoute: (this: ZiroRouter, path: string) => ZiroRoute[]
  lookupRoute: (this: ZiroRouter, path: string) => ZiroRoute[]
  hook: (hook: ZiroRouterHooks, callback: (router: ZiroRouter) => void) => void
  removeHook: (hook: ZiroRouterHooks, callback: (router: ZiroRouter) => void) => void
  push: (url: string, options?: ZiroRouterPushOptions) => void
  replace: (url: string, options?: Omit<ZiroRouterPushOptions, 'replace'>) => void
}

type ZiroRouterPushOptions = {
  replace?: boolean
  state?: Record<string, unknown>
}

export const createRouter = (opts: CreateRouterOptions): ZiroRouter => {
  return {
    url: opts.initialUrl,
    tree: createRou3Router<ZiroRoute>(),
    routes: [],
    hook(hook, cb) {
      hooks.hook(hook, cb)
    },
    removeHook(hook, cb) {
      hooks.removeHook(hook, cb)
    },
    push(url, options = {}) {
      this.setUrl(url)
      if (typeof window !== 'undefined') {
        if (options.replace) window.history.replaceState({}, '', url)
        else window.history.pushState({}, '', url)
      }
    },
    replace(url, options = {}) {
      this.setUrl(url)
      if (typeof window !== 'undefined') window.history.replaceState({}, '', url)
    },
    setUrl(url) {
      this.url = url
      hooks.callHook('change-url', this)
    },
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
  return {
    ...options,
    component: memo(options.component),
  }
}
