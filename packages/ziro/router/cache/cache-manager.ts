export interface RouteCacheEntry<T> {
  data: T | null | Error
  isError: boolean
  timestamp: number
}

export class CacheManager<T> {
  private cache: Map<string, RouteCacheEntry<T>> = new Map()
  private ttl: number

  constructor(ttl = 5000) {
    this.ttl = ttl
  }

  get(key: string): RouteCacheEntry<T> | null {
    const entry = this.cache.get(key)
    if (!entry) return null

    // if (Date.now() > entry.timestamp) {
    //   this.cache.delete(key)
    //   return null
    // }

    return entry
  }

  async fetchAndCache(key: string, fetchFunction: () => Promise<T>): Promise<T> {
    try {
      const data = await fetchFunction()
      this.cache.set(key, { data, isError: false, timestamp: Date.now() + this.ttl })
      return data
    } catch (error) {
      const err = error instanceof Error ? error : new Error(String(error))
      this.cache.set(key, { data: err, isError: true, timestamp: Date.now() + this.ttl })
      throw err
    }
  }

  serialize(keysToInclude?: string[]): string {
    // return JSON.stringify(Array.from(this.cache.entries()))

    const serializedCache: Array<[string, RouteCacheEntry<T>]> = []
    if (keysToInclude) {
      // Only serialize entries for keys that are in the keysToInclude array
      for (const key of keysToInclude) {
        const entry = this.cache.get(key)
        if (entry) {
          serializedCache.push([key, entry])
        }
      }
    } else {
      // Serialize the entire cache
      for (const [key, entry] of this.cache.entries()) {
        serializedCache.push([key, entry])
      }
    }

    return JSON.stringify(serializedCache)
  }

  deserialize(serializedData: string): void {
    const entries = new Map<string, RouteCacheEntry<T>>(JSON.parse(serializedData))
    this.cache = entries
  }
}
