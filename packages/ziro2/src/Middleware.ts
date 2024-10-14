import { Cache } from './Cache'
import { DataContext } from './RouteDataContext'

export class Middleware {
  constructor(public name: string, private handler: (ctx: { dataContext: DataContext; request: Request; params: Record<string, string> }) => Promise<any>) {}

  generateCacheKey(params?: Record<string, string>): string {
    const paramString = Object.entries(params || {})
      .map(([key, value]) => `${key}:${value}`)
      .join('|')
    return `${this.name}|${paramString}`
  }

  async execute(dataContext: DataContext, request: Request, params?: Record<string, string>, cache?: Cache) {
    const cacheKey = this.generateCacheKey(params)
    const cachedData = cache?.get(cacheKey)

    if (cachedData) {
      return cachedData
    }

    await this.handler({
      dataContext,
      params: params || {},
      request,
    }).then(data => {
      cache?.set(cacheKey, data, Infinity)
    })
  }
}
