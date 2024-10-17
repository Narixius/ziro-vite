import { Cache } from './Cache'
import { DataContext } from './RouteDataContext'

export class Middleware {
  constructor(
    public name: string,
    public handlers: {
      onRequest?: (ctx: { dataContext: DataContext; request: Request; params: Record<string, string> }) => Promise<any>
      onBeforeResponse?: (ctx: { dataContext: DataContext; request: Request; response: Response; params: Record<string, string> }) => Promise<any>
      [key: string]: any
    },
  ) {}

  generateCacheKey(): string {
    return `${this.name}`
  }

  async onRequest(request: Request, params: Record<string, string> = {}, dataContext: DataContext, cache?: Cache) {
    const cacheKey = this.generateCacheKey()
    const cachedData = cache?.get(cacheKey)
    if (cachedData) {
      dataContext.data = {
        ...dataContext.data,
        ...cachedData,
      }
      return cachedData
    }

    if (this.handlers?.onRequest)
      await this.handlers
        .onRequest({
          dataContext,
          params,
          request,
        })
        .then(data => {
          if (data) {
            dataContext.data = {
              ...dataContext.data,
              ...cachedData,
            }
            cache?.set(cacheKey, data, Infinity)
          }
        })
  }
  async onBeforeResponse(request: Request, response: Response, params: Record<string, string> = {}, dataContext: DataContext, cache?: Cache) {
    if (this.handlers?.onBeforeResponse)
      await this.handlers.onBeforeResponse({
        dataContext,
        params,
        request,
        response,
      })
  }
}
