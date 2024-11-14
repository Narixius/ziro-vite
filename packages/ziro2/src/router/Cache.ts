import { createHooks } from 'hookable'

type CacheCategories = 'loader' | 'middleware' | 'action'
export type CacheStatus = 'pending' | 'success' | 'error'

export class Cache {
  private cache: Map<string, { value: any; expiry: number; status: CacheStatus }>
  private hooks = createHooks()

  constructor() {
    if (typeof window !== 'undefined' && (window as any).__routerCache) {
      const serializedCache = (window as any).__routerCache
      this.cache = new Map(Object.entries(serializedCache))
    } else {
      this.cache = new Map()
    }
  }

  private generateKey(category: CacheCategories, name: string, url: string): string {
    return JSON.stringify({ category, name, url })
  }

  public hookOnce(category: CacheCategories, name: string, url: string, callback: (data: any) => unknown) {
    this.hooks.hookOnce(this.generateKey(category, name, url), callback)
  }
  public hook(category: CacheCategories, name: string, url: string, callback: (data: any) => unknown) {
    this.hooks.hook(this.generateKey(category, name, url), callback)
  }

  public removeHook(category: CacheCategories, name: string, url: string, callback: (data: any) => unknown) {
    this.hooks.removeHook(this.generateKey(category, name, url), callback)
  }

  private set(category: CacheCategories, name: string, url: string, value: any, ttl: number = Infinity, status: CacheStatus = 'success'): void {
    const expiry = Date.now() + ttl
    const key = this.generateKey(category, name, url)
    this.cache.set(key, { value, expiry, status })
    this.hooks.callHook(this.generateKey(category, name, url), value)
  }

  private get(category: CacheCategories, name: string, url: string, full: boolean = false): any | undefined {
    const key = this.generateKey(category, name, url)
    const cachedItem = this.cache.get(key)

    if (!cachedItem) return undefined

    // if (Date.now() > cachedItem.expiry) {
    //   this.cache.delete(key)
    //   return undefined
    // }
    if (!full) return cachedItem.value
    return cachedItem
  }

  delete(category: CacheCategories, name: string, url: string): boolean {
    const key = this.generateKey(category, name, url)
    return this.cache.delete(key)
  }

  clear(): void {
    const tmpCache = this.cache.keys()
    this.cache.clear()
    tmpCache.forEach(key => {
      this.hooks.callHook(key)
    })
  }

  serialize(): string {
    const serializedCache: { [key: string]: { value: any; expiry: number } } = {}
    this.cache.forEach((value, key) => {
      serializedCache[key] = value
    })
    return JSON.stringify(serializedCache)
  }

  getMiddlewareCache(name: string): any | undefined {
    return this.get('middleware', name, '')
  }

  setMiddlewareCache(name: string, value: any, ttl: number = Infinity): void {
    this.set('middleware', name, '', value, ttl)
  }

  getActionCache(name: string, url: string, full: boolean = false): any | undefined {
    return this.get('action', name, url, full)
  }

  setActionCache(name: string, url: string, value: any, ttl: number = Infinity, status: CacheStatus = 'success'): void {
    this.set('action', name, url, value, ttl, status)
  }

  getLoaderCache(name: string, url: string): any | undefined {
    return this.get('loader', name, url)
  }

  setLoaderCache(name: string, url: string, value: any, ttl: number = Infinity, status: CacheStatus = 'success'): void {
    this.set('loader', name, url, value, ttl, status)
  }
}
