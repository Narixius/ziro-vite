import { CacheManager } from './cache-manager.js'

export class SWRCache<T = any> {
  private cacheManager: CacheManager<T>
  private listeners: Map<string, Set<() => void>>

  constructor(ttl = 5000) {
    this.cacheManager = new CacheManager<T>(ttl)
    this.listeners = new Map()
  }

  subscribe(key: string, callback: () => void): () => void {
    if (!this.listeners.has(key)) {
      this.listeners.set(key, new Set())
    }
    this.listeners.get(key)?.add(callback)

    return () => {
      this.listeners.get(key)?.delete(callback)
      if (this.listeners.get(key)?.size === 0) {
        this.listeners.delete(key)
      }
    }
  }

  private notifySubscribers(key: string): void {
    if (this.listeners.has(key)) {
      this.listeners.get(key)?.forEach(callback => callback())
    }
  }

  public getCacheManager() {
    return this.cacheManager
  }

  public revalidate(key: string, fetchFunction: () => Promise<T>) {
    return this.cacheManager.fetchAndCache(key, fetchFunction).finally(() => {
      this.notifySubscribers(key)
    })
  }

  async getData(key: string, fetchFunction: () => Promise<T>) {
    const cachedData = this.cacheManager.get(key)

    if (cachedData !== null) {
      return cachedData
    } else {
      const data = await this.cacheManager.fetchAndCache(key, fetchFunction)
      this.notifySubscribers(key)
      return data
    }
  }

  serialize(keysToInclude?: string[]): string {
    return this.cacheManager.serialize(keysToInclude)
  }

  deserialize(serializedData: string): void {
    this.cacheManager.deserialize(serializedData)
  }
}
