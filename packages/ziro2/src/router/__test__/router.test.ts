import { renderSSRHead } from '@unhead/ssr'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { z } from 'zod'
import { Action } from '../Action'
import { Cache } from '../Cache'
import { Middleware } from '../Middleware'
import { Route } from '../Route'
import { DataContext } from '../RouteDataContext'
import { Router } from '../Router'
import { abort } from '../utils/abort'
import { JsonError } from '../utils/json-error'
import { parseFormDataToObject } from '../utils/multipart'
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
  const redirectTestRoute = new Route('/redirect-test', {
    parent: rootRoute,
    loader: async ({ dataContext }) => {
      redirect('http://example.com')
    },
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
      const authHeader = ctx.request.headers.get('authorization')
      if (!!!authHeader) {
        throw new Error('User not authenticated')
      }
      return {
        user: authHeader,
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
      throw new JsonError(
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

  const actionRoute = new Route('/action-route', {
    async loader() {
      return {
        info: 'more info',
      }
    },
    actions: {
      signIn: new Action({
        input: z.object({
          username: z.string().min(8),
          password: z.string().min(8),
        }),
        async handler(body, ctx) {
          return { ok: true }
        },
      }),
    },
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
    router.addRoute(actionRoute)
  })

  afterEach(() => {
    vi.clearAllMocks()
    vi.restoreAllMocks()
  })

  it('should find the correct route tree for the homepage route', () => {
    const routeTree = router.findRouteTree('/')?.tree
    expect(routeTree).toContain(rootRoute)
    expect(routeTree).toContain(homepageRoute)
  })

  it('should find the correct route tree for the about route', () => {
    const routeTree = router.findRouteTree('/about')?.tree
    expect(routeTree).toContain(rootRoute)
    expect(routeTree).toContain(aboutRoute)
  })

  it('should find the correct route tree for the contact route', () => {
    const routeTree = router.findRouteTree('/contact')?.tree
    expect(routeTree).toContain(rootRoute)
    expect(routeTree).toContain(contactRoute)
  })

  it('should find the correct route tree for the single blog route', () => {
    const routeTree = router.findRouteTree('/blog/123')?.tree
    expect(routeTree).toContain(rootRoute)
    expect(routeTree).toContain(blogLayoutRoute)
    expect(routeTree).toContain(singleBlogRoute)
  })

  it('should return undefined for an unknown route', () => {
    const routeTree = router.findRouteTree('/unknown')?.tree
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
    const cacheSpy = vi.spyOn(cache, 'setLoaderCache')
    const req = new Request('http://localhost/')
    await router.onRequest(req, cache)
    expect(cacheSpy).toHaveBeenCalledWith(homepageRoute.getId(), req.url, expect.any(Object), Infinity)
  })

  it('should return cached data for the homepage route', async () => {
    const cachedData = { data: 'cachedData' }
    const req = new Request('http://localhost/')
    cache.setLoaderCache(homepageRoute.getId(), req.url, cachedData, Infinity)
    await router.onRequest(req, cache)
    expect(homepageLoader).not.toHaveBeenCalled()
  })

  it('should use the cache for the homepage route', async () => {
    const revalidateSpy = vi.spyOn(cache, 'setLoaderCache')
    await router.onRequest(new Request('http://localhost/'), cache)
    await router.onRequest(new Request('http://localhost/'), cache)
    expect(revalidateSpy).toHaveBeenCalledTimes(2)
  })

  it('should not set cache running load twice with same cache', async () => {
    const cacheSpy = vi.spyOn(cache, 'setLoaderCache')
    await router.onRequest(new Request('http://localhost/'), cache)
    await router.onRequest(new Request('http://localhost/'), cache)
    expect(cacheSpy).toHaveBeenCalledTimes(2)
  })

  it('should clear the cache', () => {
    cache.setLoaderCache('someKey', '/url', { data: 'someData' }, Infinity)
    cache.clear()
    expect(cache.getLoaderCache('someKey', '/url')).toBeUndefined()
  })

  it('should delete a specific cache entry', () => {
    cache.setLoaderCache('someKey', '/url', { data: 'someData' }, Infinity)
    cache.delete('loader', 'someKey', '/url')
    expect(cache.getLoaderCache('someKey', '/url')).toBeUndefined()
  })

  it('should return undefined for expired cache entry', () => {
    cache.setLoaderCache('someKey', '/url', { data: 'someData' }, -1)
    expect(cache.getLoaderCache('someKey', '/url')).toBeUndefined()
  })

  it('should not find a route that does not exist', () => {
    const routeTree = router.findRouteTree('/nonexistent')
    expect(routeTree.tree).toBeUndefined()
  })

  it('should call the correct loader for nested routes', async () => {
    await router.onRequest(new Request('http://localhost/blog/123'))
    expect(blogLayoutLoader).toHaveBeenCalled()
    expect(singleBlogLoader).toHaveBeenCalled()
  })

  it('should cache nested route data', async () => {
    const cacheSpy = vi.spyOn(cache, 'setLoaderCache')
    const req = new Request('http://localhost/blog/123')
    await router.onRequest(req, cache)
    expect(cacheSpy).toHaveBeenCalledWith(singleBlogRoute.getId(), req.url, expect.any(Object), Infinity)
  })

  it('should return cached data for nested routes', async () => {
    const cachedData = { data: 'cachedData' }
    const req = new Request('http://localhost/blog/123')
    cache.setLoaderCache(singleBlogRoute.getId(), req.url, cachedData, Infinity)
    await router.onRequest(req, cache)
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

  it('should return 400 for action route with no action specified', async () => {
    const request = new Request('http://localhost/action-route?action=signIn')
    const res = await router.handleAction(request)
    await router.onBeforeResponse(request, res)
    expect(res.status).toEqual(400)
  })

  it('should return 400 for action route with no JSON content-type', async () => {
    const res = await router.handleAction(
      new Request('http://localhost/action-route?action=signIn', {
        method: 'post',
        body: JSON.stringify({}),
      }),
    )
    expect(res.status).toEqual(400)
  })

  it('should return error for invalid input in action route', async () => {
    const res = await router.handleAction(
      new Request('http://localhost/action-route?action=signIn', {
        method: 'post',
        body: JSON.stringify({ username: 'yo' }),
        headers: {
          'content-type': 'application/json',
        },
      }),
    )
    const jsonResult = await res.json()
    expect(jsonResult.errors).toBeDefined()
    expect(jsonResult.input).not.toBeDefined()
  })

  it('should preserve value for invalid input in action route with preserve value flag', async () => {
    const res = await router.handleAction(
      new Request('http://localhost/action-route?action=signIn&pv=true', {
        method: 'post',
        body: JSON.stringify({ username: 'yo' }),
        headers: {
          'content-type': 'application/json',
        },
      }),
    )
    const jsonResult = await res.json()
    expect(jsonResult.errors).toBeDefined()
    expect(jsonResult.input).toBeDefined()
    expect(jsonResult.input).toHaveProperty('username')
  })

  it('should not preserve excluded fields', async () => {
    const res = await router.handleAction(
      new Request('http://localhost/action-route?action=signIn&pv=true&ex=username', {
        method: 'post',
        body: JSON.stringify({ username: 'yo' }),
        headers: {
          'content-type': 'application/json',
        },
      }),
    )
    const jsonResult = await res.json()
    expect(jsonResult.errors).toBeDefined()
    expect(jsonResult.input).not.toHaveProperty('username')
  })

  it('should return 200 for valid input in action route', async () => {
    const res = await router.handleAction(
      new Request('http://localhost/action-route?action=signIn', {
        method: 'post',
        body: JSON.stringify({ username: 'test1234', password: 'test1234' }),
        headers: {
          'content-type': 'application/json',
        },
      }),
    )
    expect(res.status).toEqual(200)
  })

  it('should return 200 for valid form data input in action route', async () => {
    const formData = new FormData()
    formData.append('username', 'test1234')
    formData.append('password', 'test1234')
    const res = await router.handleAction(
      new Request('http://localhost/action-route?action=signIn', {
        method: 'post',
        body: formData,
      }),
    )
    expect(res.status).toEqual(200)
  })

  it('should parse multiple same query keys to array of json', async () => {
    const formData = new FormData()
    formData.append('tag', 'cat')
    formData.append('tag', 'dog')
    const obj = parseFormDataToObject(formData)
    expect(obj).toHaveProperty('tag')
  })

  it('should return 404 for unknown action', async () => {
    const res = await router.handleAction(
      new Request('http://localhost/action-route?action=unknown', {
        method: 'post',
      }),
    )
    expect(res.status).toEqual(404)
  })

  it('it should abort action request to unknown route', async () => {
    const res = await router.handleAction(new Request('http://localhost/unknown?action=signIn'))
    expect(res.status).toEqual(404)
  })

  it('should return 200 for valid input in action route', async () => {
    const dataContext = new DataContext()

    const req = new Request('http://localhost/action-route?action=signIn', {
      method: 'post',
      body: JSON.stringify({ username: 'test1234', password: 'test1234' }),
      headers: {
        'content-type': 'application/json',
      },
    })

    await router.handleAction(req, cache, dataContext)
    await router.onRequest(req, cache, dataContext)
    // TODO: check the serializer
    console.log(cache.serialize())
  })

  it('should clear the cache for a specific category', () => {
    cache.setLoaderCache('someKey', '/url', { data: 'someData' }, Infinity)
    cache.clear()
    expect(cache.getLoaderCache('someKey', '/url')).toBeUndefined()
  })

  it('should delete cache for a specific category and key', () => {
    cache.setLoaderCache('someKey', '/url', { data: 'someData' }, Infinity)
    cache.delete('loader', 'someKey', '/url')
    expect(cache.getLoaderCache('someKey', '/url')).toBeUndefined()
  })

  it('should cache the action data', async () => {
    const cacheSpy = vi.spyOn(cache, 'setActionCache')
    const req = new Request('http://localhost/action-route?action=signIn', {
      method: 'post',
      body: JSON.stringify({ username: 'test1234', password: 'test1234' }),
      headers: {
        'content-type': 'application/json',
      },
    })
    await router.handleAction(req, cache)
    expect(cacheSpy).toHaveBeenCalledWith('signIn', req.url, expect.any(Object))
  })

  it('should return cached data for the action route', async () => {
    const cachedData = { data: 'cachedData' }
    const req = new Request('http://localhost/action-route?action=signIn', {
      method: 'post',
      body: JSON.stringify({ username: 'test1234', password: 'test1234' }),
      headers: {
        'content-type': 'application/json',
      },
    })
    cache.setActionCache(actionRoute.getId(), req.url, cachedData, Infinity)
    await router.handleAction(req, cache)
    expect(cache.getActionCache(actionRoute.getId(), req.url)).toEqual(cachedData)
  })
})
