import { Cache } from './Cache'
import { DataContext } from './RouteDataContext'

export class Middleware {
  constructor(public name: string, public handler: (ctx: { dataContext: DataContext; request: Request; params: Record<string, string> }) => Promise<any>) {}

  generateCacheKey(): string {
    return `${this.name}`
  }

  async execute(dataContext: DataContext, request: Request, params: Record<string, string> = {}, cache?: Cache) {
    const cacheKey = this.generateCacheKey()
    const cachedData = cache?.get(cacheKey)
    console.log(cacheKey, cache, cache?.get(cacheKey))
    if (cachedData) {
      dataContext.data = {
        ...dataContext.data,
        ...cachedData,
      }
      return cachedData
    }

    await this.handler({
      dataContext,
      params,
      request,
    }).then(data => {
      if (data) {
        dataContext.data = {
          ...dataContext.data,
          ...cachedData,
        }
        cache?.set(cacheKey, data, Infinity)
      }
    })
  }
}
