export class Cache {
  private cache: Map<string, { value: any; expiry: number }>

  constructor() {
    this.cache = new Map()
  }

  set(key: string, value: any, ttl: number): void {
    const expiry = Date.now() + ttl
    this.cache.set(key, { value, expiry })
  }

  get(key: string): any | undefined {
    const cachedItem = this.cache.get(key)
    if (!cachedItem) return undefined

    if (Date.now() > cachedItem.expiry) {
      this.cache.delete(key)
      return undefined
    }

    return cachedItem.value
  }

  delete(key: string): boolean {
    return this.cache.delete(key)
  }

  clear(): void {
    this.cache.clear()
  }
}
