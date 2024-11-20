import SuperJSON from 'superjson'
import { AbortError, isAbortError } from '../abort.js'
import { isRedirectError, RedirectError } from '../redirect.js'

SuperJSON.registerCustom<AbortError, string>(
  {
    isApplicable: (v): v is AbortError => isAbortError(v),
    serialize: v => v.serialize(),
    deserialize: v => AbortError.fromJson(v),
  },
  'AbortError',
)

SuperJSON.registerCustom<RedirectError, string>(
  {
    isApplicable: (v): v is RedirectError => isRedirectError(v),
    serialize: v => v.serialize(),
    deserialize: v => RedirectError.fromJson(v),
  },
  'RedirectError',
)

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
      for (const [key, entry] of this.cache.entries()) {
        if (key.includes('action:')) serializedCache.push([key, entry])
      }
    } else {
      // Serialize the entire cache
      for (const [key, entry] of this.cache.entries()) {
        serializedCache.push([key, entry])
      }
    }
    return SuperJSON.stringify(serializedCache)
  }

  deserialize(serializedData: string): void {
    const entries = new Map<string, RouteCacheEntry<T>>(SuperJSON.parse(serializedData))
    this.cache = entries
  }
}
