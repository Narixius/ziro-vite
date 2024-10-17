import { renderSSRHead } from '@unhead/ssr'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { Cache } from '../Cache'
import { Middleware } from '../Middleware'
import { Route } from '../Route'
import { DataContext } from '../RouteDataContext'
import { Router } from '../Router'
import { abort } from '../utils/abort'
import { JsonError } from '../utils/json-error'
import { redirect } from '../utils/redirect'

describe('Router', () => {
  let rootLoader = vi.fn(async () => {
    return {
      data: 'yo',
    }
  })
  const rootRoute = new Route('_root', {
    loader: rootLoader,
  })
  let homepageLoader = vi.fn(async () => {
    return {
      i18n: {
        language: 'krypton',
      },
    }
  })
  const homepageRoute = new Route('/', {
    parent: rootRoute,
    loader: homepageLoader,
  })
  let aboutLoader = vi.fn()
  const aboutRoute = new Route('/about', {
    parent: rootRoute,
    loader: aboutLoader,
  })
  let contactLoader = vi.fn()
  const contactRoute = new Route('/contact', { parent: rootRoute, loader: contactLoader })
  let blogLayoutLoader = vi.fn()
  const blogLayoutRoute = new Route('_blog_layout', { parent: rootRoute, loader: blogLayoutLoader })
  let singleBlogLoader = vi.fn(async ctx => {
    return {
      title: ctx.params.blogId,
    }
  })
  const singleBlogRoute = new Route('/blog/:blogId', { parent: blogLayoutRoute, loader: singleBlogLoader })

  // Define the auth route
  let authLoader = vi.fn(async () => {
    return {
      user: 'authenticatedUser',
    }
  })
  const authRoute = new Route('/auth', {
    parent: rootRoute,
    loader: authLoader,
  })

  // Define the middleware to check if the user is authenticated
  const authMiddleware = new Middleware('authMiddleware', {
    onRequest: async ctx => {
      if (!!!ctx.request.headers.get('authorization')) {
        throw new Error('User not authenticated')
      }
    },
  })

  // Define the dashboard route with the middleware
  let dashboardLoader = vi.fn(async () => {
    return {
      dashboardData: 'dashboardData',
    }
  })
  const dashboardRoute = new Route('/dashboard', { parent: rootRoute, loader: dashboardLoader, middlewares: [authMiddleware] })

  const redirectTestRoute = new Route('/redirect-test', {
    parent: rootRoute,
    loader: async () => {
      redirect('http://example.com')
    },
  })

  const abortTestRoute = new Route('/abort/:status', {
    parent: rootRoute,
    loader: async ({ params }) => {
      if (params.status === '404') {
        abort(404, 'not found')
      }
      if (params.status === '404-json') {
        abort(404, { message: 'not found' })
      }
      return {}
    },
  })

  const jsonErrorTestRoute = new Route('/json-error-test', {
    parent: rootRoute,
    loader: async () => {
      throw JsonError(
        {
          message: 'invalid data',
        },
        400,
      )
      return {}
    },
  })

  const headTestRoute = new Route('/head/:title/:description', {
    parent: rootRoute,
    loader: async ({ params }) => {
      return {
        ...params,
      }
    },
    meta: async ({ loaderData }) => {
      return {
        title: loaderData.title,
        meta: [
          {
            name: 'description',
            content: loaderData.description,
          },
        ],
      }
    },
  })

  const headTestChildRoute = new Route('/head/:title/:description/override', {
    parent: headTestRoute,
    loader: async ({ params }) => {
      return {
        title: 'overridden',
      }
    },
    meta: async ({ loaderData }) => {
      return {
        title: loaderData.title,
      }
    },
  })

  const propsTestRoute = new Route('/props-test', {
    parent: rootRoute,
    loader: async () => {
      return {
        message: 'Hello, world!',
      }
    },
    props: {
      customProp: 'customValue',
    },
  })

  const dataFetchingMiddleware = new Middleware('data-fetching', {
    onRequest: async () => {
      return { data: 'from-middleware' }
    },
  })

  const dataFetchingRoute = new Route('/data-fetching', {
    middlewares: [dataFetchingMiddleware],
  })

  const dataFetchingFromMiddlewareCacheRoute = new Route('/data-fetching/child', {
    middlewares: [dataFetchingMiddleware],
  })

  let router: Router
  let cache: Cache

  beforeEach(() => {
    vi.useFakeTimers()
    router = new Router('http://google.com')
    cache = new Cache()
    router.addRoute(homepageRoute)
    router.addRoute(aboutRoute)
    router.addRoute(contactRoute)
    router.addRoute(singleBlogRoute)
    router.addRoute(authRoute)
    router.addRoute(dashboardRoute)
    router.addRoute(redirectTestRoute)
    router.addRoute(abortTestRoute)
    router.addRoute(jsonErrorTestRoute)
    router.addRoute(headTestRoute)
    router.addRoute(headTestChildRoute)
    router.addRoute(dataFetchingRoute)
    router.addRoute(dataFetchingFromMiddlewareCacheRoute)
  })

  afterEach(() => {
    vi.clearAllMocks()
    vi.restoreAllMocks()
  })

  it('should find the correct route tree for the homepage route', () => {
    const routeTree = router.findRouteTree('/')?.data
    expect(routeTree).toContain(rootRoute)
    expect(routeTree).toContain(homepageRoute)
  })

  it('should find the correct route tree for the about route', () => {
    const routeTree = router.findRouteTree('/about')?.data
    expect(routeTree).toContain(rootRoute)
    expect(routeTree).toContain(aboutRoute)
  })

  it('should find the correct route tree for the contact route', () => {
    const routeTree = router.findRouteTree('/contact')?.data
    expect(routeTree).toContain(rootRoute)
    expect(routeTree).toContain(contactRoute)
  })

  it('should find the correct route tree for the single blog route', () => {
    const routeTree = router.findRouteTree('/blog/123')?.data
    expect(routeTree).toContain(rootRoute)
    expect(routeTree).toContain(blogLayoutRoute)
    expect(routeTree).toContain(singleBlogRoute)
  })

  it('should return undefined for an unknown route', () => {
    const routeTree = router.findRouteTree('/unknown')?.data
    expect(routeTree).toBeUndefined()
  })

  it('should call the root loader when loading the root route', async () => {
    await router.onRequest(new Request('http://localhost/'))
    expect(rootLoader).toHaveBeenCalled()
  })

  it('should call the homepage loader when loading the homepage route', async () => {
    await router.onRequest(new Request('http://localhost/'))
    expect(homepageLoader).toHaveBeenCalled()
  })

  it('should call the about loader when loading the about route', async () => {
    await router.onRequest(new Request('http://localhost/about'))
    expect(aboutLoader).toHaveBeenCalled()
  })

  it('should call the contact loader when loading the contact route', async () => {
    await router.onRequest(new Request('http://localhost/contact'))
    expect(contactLoader).toHaveBeenCalled()
  })

  it('should call the single blog loader when loading the single blog route', async () => {
    await router.onRequest(new Request('http://localhost/blog/123'))
    expect(singleBlogLoader).toHaveBeenCalled()
  })

  it('should not call any loader for an unknown route', async () => {
    await router.onRequest(new Request('http://localhost/unknown'))
    expect(rootLoader).not.toHaveBeenCalled()
    expect(homepageLoader).not.toHaveBeenCalled()
    expect(aboutLoader).not.toHaveBeenCalled()
    expect(contactLoader).not.toHaveBeenCalled()
    expect(singleBlogLoader).not.toHaveBeenCalled()
  })

  it('should call the homepage loader when loading the homepage route and print the parameters', async () => {
    await router.onRequest(new Request('http://localhost/'))
    expect(homepageLoader).toHaveBeenCalled()
    // @ts-ignore
    expect(homepageLoader.mock.calls[0][0].dataContext).toHaveProperty('data')
  })

  it('should cache the homepage loader data', async () => {
    const cacheSpy = vi.spyOn(cache, 'set')
    await router.onRequest(new Request('http://localhost/'), cache)
    expect(cacheSpy).toHaveBeenCalledWith(homepageRoute.generateCacheKey(), expect.any(Object), Infinity)
  })

  it('should return cached data for the homepage route', async () => {
    const cachedData = { data: 'cachedData' }
    cache.set(homepageRoute.generateCacheKey(), cachedData, Infinity)
    await router.onRequest(new Request('http://localhost/'), cache)
    expect(homepageLoader).not.toHaveBeenCalled()
  })

  it('should revalidate the cache for the homepage route', async () => {
    const revalidateSpy = vi.spyOn(cache, 'set')
    await router.onRequest(new Request('http://localhost/'), cache)
    await router.onRequest(new Request('http://localhost/'), cache)
    expect(revalidateSpy).toHaveBeenCalledTimes(2)
  })

  it('should not set cache running load twice with same cache', async () => {
    const cacheSpy = vi.spyOn(cache, 'set')
    await router.onRequest(new Request('http://localhost/'), cache)
    await router.onRequest(new Request('http://localhost/'), cache)
    expect(cacheSpy).toHaveBeenCalledTimes(2)
  })

  it('should clear the cache', () => {
    cache.set('someKey', { data: 'someData' }, Infinity)
    cache.clear()
    expect(cache.get('someKey')).toBeUndefined()
  })

  it('should delete a specific cache entry', () => {
    cache.set('someKey', { data: 'someData' }, Infinity)
    cache.delete('someKey')
    expect(cache.get('someKey')).toBeUndefined()
  })

  it('should return undefined for expired cache entry', () => {
    cache.set('someKey', { data: 'someData' }, -1)
    expect(cache.get('someKey')).toBeUndefined()
  })

  it('should not find a route that does not exist', () => {
    const routeTree = router.findRouteTree('/nonexistent')
    expect(routeTree).toBeUndefined()
  })

  it('should call the correct loader for nested routes', async () => {
    await router.onRequest(new Request('http://localhost/blog/123'))
    expect(blogLayoutLoader).toHaveBeenCalled()
    expect(singleBlogLoader).toHaveBeenCalled()
  })

  it('should cache nested route data', async () => {
    const cacheSpy = vi.spyOn(cache, 'set')
    await router.onRequest(new Request('http://localhost/blog/123'), cache)
    expect(cacheSpy).toHaveBeenCalledWith(singleBlogRoute.generateCacheKey(), expect.any(Object), Infinity)
  })

  it('should return cached data for nested routes', async () => {
    const cachedData = { data: 'cachedData' }
    cache.set(singleBlogRoute.generateCacheKey(), cachedData, Infinity)

    const data = await router.onRequest(new Request('http://localhost/blog/123'), cache)

    expect(singleBlogLoader).not.toHaveBeenCalled()
  })

  it('should call the auth loader when loading the auth route', async () => {
    await router.onRequest(new Request('http://localhost/auth'))
    expect(authLoader).toHaveBeenCalled()
  })

  it('should call the dashboard loader when loading the dashboard route if authenticated', async () => {
    await router.onRequest(
      new Request('http://localhost/dashboard', {
        headers: {
          authorization: 'Bearer token',
        },
      }),
      cache,
    )
    expect(dashboardLoader).toHaveBeenCalled()
  })

  it('should throw an error when loading the dashboard route if not authenticated', async () => {
    await expect(router.onRequest(new Request('http://localhost/dashboard'))).rejects.toThrow('User not authenticated')
    expect(true).toBe(true)
  })

  it('should redirect to the correct URL for the redirect route', async () => {
    try {
      await router.onRequest(new Request('http://localhost/redirect-test'))
    } catch (e) {
      expect(e).instanceOf(Response)
      expect((e as Response).headers.get('Location')).equal('http://example.com')
    }
  })

  it('should abort with 404 status and message for /abort/404', async () => {
    try {
      await router.onRequest(new Request('http://localhost/abort/404'))
    } catch (e) {
      expect(e).toBeInstanceOf(Response)
      expect((e as Response).status).toBe(404)
      expect((e as Response).statusText).toBe('not found')
    }
  })

  it('should abort with 404 status and JSON message for /abort/404-json', async () => {
    try {
      await router.onRequest(new Request('http://localhost/abort/404-json'))
    } catch (e) {
      expect(e).toBeInstanceOf(Response)
      expect((e as Response).status).toBe(404)
      const json = await (e as Response).json()
      expect(json).toEqual({ message: 'not found' })
    }
  })

  it('should throw a JsonError for the json-error-test route', async () => {
    try {
      await router.onRequest(new Request('http://localhost/json-error-test'))
    } catch (e) {
      expect(e).toBeInstanceOf(Response)
      expect((e as Response).status).toBe(400)
      const json = await (e as Response).json()
      expect(json).toEqual({ message: 'invalid data' })
    }
  })

  it('should return the correct title and meta for headTestRoute', async () => {
    const dataContext = new DataContext()
    await router.onRequest(new Request('http://localhost/head/testTitle/testDescription'), cache, dataContext)
    const { headTags } = await renderSSRHead(dataContext.head)
    expect(headTags).toContain('<title>testTitle</title>')
    expect(headTags).toContain('<meta name="description" content="testDescription">')
  })

  it('should return the correct title for headTestChildRoute', async () => {
    const dataContext = new DataContext()
    await router.onRequest(new Request('http://localhost/head/testTitle/testDescription/override'), cache, dataContext)
    const { headTags } = await renderSSRHead(dataContext.head)
    expect(headTags).toContain('<title>overridden</title>')
  })

  it('should return the correct props for propsTestRoute', async () => {
    const dataContext = new DataContext()
    await router.onRequest(new Request('http://localhost/props-test'), cache, dataContext)
    expect(propsTestRoute.getProps()).toEqual({ customProp: 'customValue' })
  })

  it('it should load middleware data from cache', async () => {
    const middlewareHandlerSpy = vi.spyOn(dataFetchingMiddleware.handlers, 'onRequest')
    await router.onRequest(new Request('http://localhost/data-fetching'), cache)
    await router.onRequest(new Request('http://localhost/data-fetching/child'), cache)
    expect(middlewareHandlerSpy).toHaveBeenCalledTimes(1)
  })

  it('it should load middleware with onBeforeResponse', async () => {
    const responseTimeMiddleware = new Middleware('request-time', {
      time: null,
      async onRequest() {
        this.time = Date.now()
      },
      async onBeforeResponse(ctx) {
        ctx.response.headers.set('X-Response-Time', String(Date.now() - this.time))
      },
    })
    const routeWithMiddleware = new Route('/response-time-route', {
      loader: async () => {
        await new Promise(resolve => {
          setTimeout(resolve, 1000)
          vi.runAllTimers()
        })
        return { ok: true }
      },
      middlewares: [responseTimeMiddleware],
    })
    router.addRoute(routeWithMiddleware)
    const dataContext = new DataContext()
    const req = new Request('http://localhost/response-time-route')
    const res = new Response()
    await router.onRequest(req, cache, dataContext)
    await router.onBeforeResponse(req, res, cache, dataContext)
    expect(res.headers.get('X-Response-Time')).toBeDefined()
    expect(parseInt(res.headers.get('X-Response-Time')!)).toBeLessThan(1001)
  })
})
