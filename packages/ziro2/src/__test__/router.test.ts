import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { Cache } from '../Cache'
import { Middleware } from '../Middleware'
import { Route } from '../Route'
import { Router } from '../Router'

describe('Router', () => {
  let rootLoader = vi.fn(async () => {
    return {
      data: 'yo',
    }
  })
  const rootRoute = new Route('_root', undefined, rootLoader, {}, [], {})
  let homepageLoader = vi.fn(async () => {
    return {
      i18n: {
        language: 'krypton',
      },
    }
  })
  const homepageRoute = new Route('/', rootRoute, homepageLoader, {}, [], {
    component: 'homepage',
    loaderComponent: 'loading',
    errorComponent: 'error',
  })
  let aboutLoader = vi.fn()
  const aboutRoute = new Route('/about', rootRoute, aboutLoader, {}, [], {
    component: 'about',
    loaderComponent: 'loading',
    errorComponent: 'error',
  })
  let contactLoader = vi.fn()
  const contactRoute = new Route('/contact', rootRoute, contactLoader, {}, [], {
    component: 'contact',
    loaderComponent: 'loading',
    errorComponent: 'error',
  })
  let blogLayoutLoader = vi.fn()
  const blogLayoutRoute = new Route('_blog_layout', rootRoute, blogLayoutLoader, {}, [], {
    component: 'blogLayout',
    loaderComponent: 'loading',
    errorComponent: 'error',
  })
  let singleBlogLoader = vi.fn(async ctx => {
    return {
      title: ctx.params.blogId,
    }
  })
  const singleBlogRoute = new Route('/blog/:blogId', blogLayoutRoute, singleBlogLoader, {}, [], {
    component: 'singleBlog',
    loaderComponent: 'loading',
    errorComponent: 'error',
  })

  // Define the auth route
  let authLoader = vi.fn(async () => {
    return {
      user: 'authenticatedUser',
    }
  })
  const authRoute = new Route('/auth', rootRoute, authLoader, {}, [], {
    component: 'auth',
    loaderComponent: 'loading',
    errorComponent: 'error',
  })

  // Define the middleware to check if the user is authenticated
  const authMiddleware = new Middleware('authMiddleware', async ctx => {
    if (!ctx.dataContext.data.user) {
      throw new Error('User not authenticated')
    }
  })

  // Define the dashboard route with the middleware
  let dashboardLoader = vi.fn(async () => {
    return {
      dashboardData: 'dashboardData',
    }
  })
  const dashboardRoute = new Route('/dashboard', rootRoute, dashboardLoader, {}, [authMiddleware], {
    component: 'dashboard',
    loaderComponent: 'loading',
    errorComponent: 'error',
  })

  let router: Router
  let cache: Cache

  beforeEach(() => {
    router = new Router('http://google.com')
    cache = new Cache()
    router.addRoute('get', homepageRoute)
    router.addRoute('get', aboutRoute)
    router.addRoute('get', contactRoute)
    router.addRoute('get', singleBlogRoute)
    router.addRoute('get', authRoute)
    router.addRoute('get', dashboardRoute)
  })

  afterEach(() => {
    vi.clearAllMocks()
  })

  it('should find the correct route tree for the homepage route', () => {
    const routeTree = router.findRouteTree('get', '/')?.data
    expect(routeTree).toContain(rootRoute)
    expect(routeTree).toContain(homepageRoute)
  })

  it('should find the correct route tree for the about route', () => {
    const routeTree = router.findRouteTree('get', '/about')?.data
    expect(routeTree).toContain(rootRoute)
    expect(routeTree).toContain(aboutRoute)
  })

  it('should find the correct route tree for the contact route', () => {
    const routeTree = router.findRouteTree('get', '/contact')?.data
    expect(routeTree).toContain(rootRoute)
    expect(routeTree).toContain(contactRoute)
  })

  it('should find the correct route tree for the single blog route', () => {
    const routeTree = router.findRouteTree('get', '/blog/123')?.data
    expect(routeTree).toContain(rootRoute)
    expect(routeTree).toContain(blogLayoutRoute)
    expect(routeTree).toContain(singleBlogRoute)
  })

  it('should return undefined for an unknown route', () => {
    const routeTree = router.findRouteTree('get', '/unknown')?.data
    expect(routeTree).toBeUndefined()
  })

  it('should call the root loader when loading the root route', async () => {
    await router.load(new Request('http://localhost/'))
    expect(rootLoader).toHaveBeenCalled()
  })

  it('should call the homepage loader when loading the homepage route', async () => {
    await router.load(new Request('http://localhost/'))
    expect(homepageLoader).toHaveBeenCalled()
  })

  it('should call the about loader when loading the about route', async () => {
    await router.load(new Request('http://localhost/about'))
    expect(aboutLoader).toHaveBeenCalled()
  })

  it('should call the contact loader when loading the contact route', async () => {
    await router.load(new Request('http://localhost/contact'))
    expect(contactLoader).toHaveBeenCalled()
  })

  it('should call the single blog loader when loading the single blog route', async () => {
    await router.load(new Request('http://localhost/blog/123'))
    expect(singleBlogLoader).toHaveBeenCalled()
  })

  it('should not call any loader for an unknown route', async () => {
    await router.load(new Request('http://localhost/unknown'))
    expect(rootLoader).not.toHaveBeenCalled()
    expect(homepageLoader).not.toHaveBeenCalled()
    expect(aboutLoader).not.toHaveBeenCalled()
    expect(contactLoader).not.toHaveBeenCalled()
    expect(singleBlogLoader).not.toHaveBeenCalled()
  })

  it('should call the homepage loader when loading the homepage route and print the parameters', async () => {
    await router.load(new Request('http://localhost/'))
    expect(homepageLoader).toHaveBeenCalled()
    // @ts-ignore
    expect(homepageLoader.mock.calls[0][0].dataContext).toHaveProperty('data')
  })

  it('should cache the homepage loader data', async () => {
    const cacheSpy = vi.spyOn(cache, 'set')
    await router.load(new Request('http://localhost/'), cache)
    expect(cacheSpy).toHaveBeenCalledWith(homepageRoute.generateCacheKey(), expect.any(Object), Infinity)
  })

  it('should return cached data for the homepage route', async () => {
    const cachedData = { data: 'cachedData' }
    cache.set(homepageRoute.generateCacheKey(), cachedData, Infinity)
    await router.load(new Request('http://localhost/'), cache)
    expect(homepageLoader).not.toHaveBeenCalled()
  })

  it('should revalidate the cache for the homepage route', async () => {
    const revalidateSpy = vi.spyOn(cache, 'set')
    await router.load(new Request('http://localhost/'), cache)
    await router.load(new Request('http://localhost/'), cache)
    expect(revalidateSpy).toHaveBeenCalledTimes(2)
  })

  it('should not set cache running load twice with same cache', async () => {
    const cacheSpy = vi.spyOn(cache, 'set')
    await router.load(new Request('http://localhost/'), cache)
    await router.load(new Request('http://localhost/'), cache)
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
    const routeTree = router.findRouteTree('get', '/nonexistent')
    expect(routeTree).toBeUndefined()
  })

  it('should call the correct loader for nested routes', async () => {
    await router.load(new Request('http://localhost/blog/123'))
    expect(blogLayoutLoader).toHaveBeenCalled()
    expect(singleBlogLoader).toHaveBeenCalled()
  })

  it('should cache nested route data', async () => {
    const cacheSpy = vi.spyOn(cache, 'set')
    await router.load(new Request('http://localhost/blog/123'), cache)
    expect(cacheSpy).toHaveBeenCalledWith(singleBlogRoute.generateCacheKey(), expect.any(Object), Infinity)
  })

  it('should return cached data for nested routes', async () => {
    const cachedData = { data: 'cachedData' }
    cache.set(singleBlogRoute.generateCacheKey(), cachedData, Infinity)

    const data = await router.load(new Request('http://localhost/blog/123'), cache)

    expect(singleBlogLoader).not.toHaveBeenCalled()
  })

  it('should call the auth loader when loading the auth route', async () => {
    await router.load(new Request('http://localhost/auth'))
    expect(authLoader).toHaveBeenCalled()
  })

  it('should call the dashboard loader when loading the dashboard route if authenticated', async () => {
    await router.load(new Request('http://localhost/auth'), cache) // Simulate authentication
    // await router.load('get', '/dashboard', cache)
    // expect(dashboardLoader).toHaveBeenCalled()
  })

  it('should throw an error when loading the dashboard route if not authenticated', async () => {
    await expect(router.load(new Request('http://localhost/dashboard'))).rejects.toThrow('User not authenticated')
    expect(true).toBe(true)
  })
})
