import { createHooks } from 'hookable'

type CacheCategories = 'loader' | 'middleware' | 'action'
type CacheStatus = 'pending' | 'success' | 'error'

export class Cache {
  private cache: Map<string, { value: any; expiry: number; status: CacheStatus }>
  private hooks = createHooks()

  constructor() {
    this.cache = new Map()
  }

  private generateKey(category: CacheCategories, name: string, url: string): string {
    return JSON.stringify({ category, name, url })
  }

  public onDataCached(category: CacheCategories, name: string, url: string, callback: (data: any) => unknown, once: boolean = false) {
    this.hooks[once ? 'hookOnce' : 'hook'](this.generateKey(category, name, url), callback)
  }

  public removeHook(category: CacheCategories, name: string, url: string, callback: (data: any) => unknown) {
    this.hooks.removeHook(this.generateKey(category, name, url), callback)
  }

  private set(category: CacheCategories, name: string, url: string, value: any, ttl: number = Infinity): void {
    const expiry = Date.now() + ttl
    const key = this.generateKey(category, name, url)
    this.cache.set(key, { value, expiry, status: 'success' })
    this.hooks.callHook(this.generateKey(category, name, url), value)
  }

  private get(category: CacheCategories, name: string, url: string): any | undefined {
    const key = this.generateKey(category, name, url)
    const cachedItem = this.cache.get(key)
    if (!cachedItem) return undefined

    if (Date.now() > cachedItem.expiry) {
      this.cache.delete(key)
      return undefined
    }

    return cachedItem.value
  }

  delete(category: CacheCategories, name: string, url: string): boolean {
    const key = this.generateKey(category, name, url)
    return this.cache.delete(key)
  }

  clear(): void {
    this.cache.clear()
  }

  serialize(): string {
    const serializedCache: { [key: string]: { value: any; expiry: number } } = {}
    this.cache.forEach((value, key) => {
      serializedCache[key] = value
    })
    return JSON.stringify(serializedCache)
  }

  getMiddlewareCache(name: string): Promise<any | undefined> {
    return this.get('middleware', name, '')
  }

  setMiddlewareCache(name: string, value: any, ttl: number = Infinity): void {
    this.set('middleware', name, '', value, ttl)
  }

  getActionCache(name: string, url: string): Promise<any | undefined> {
    return this.get('action', name, url)
  }

  setActionCache(name: string, url: string, value: any, ttl: number = Infinity): void {
    this.set('action', name, url, value, ttl)
  }

  getLoaderCache(name: string, url: string): Promise<any | undefined> {
    return this.get('loader', name, url)
  }

  setLoaderCache(name: string, url: string, value: any, ttl: number = Infinity): void {
    this.set('loader', name, url, value, ttl)
  }
}