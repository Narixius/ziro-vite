import { Cache } from './Cache'
import { DataContext } from './RouteDataContext'

export class Middleware<TDataContextType = any, TOnRequestResult = {}> {
  constructor(
    public name: string,
    public handlers: {
      onRequest?: (ctx: {
        dataContext: DataContext<TDataContextType>['data']
        head: DataContext<TDataContextType>['head']
        request: Request
        params: Record<string, string>
      }) => Promise<TOnRequestResult>
      onBeforeResponse?: (ctx: {
        dataContext: DataContext<TDataContextType>['data']
        head: DataContext<TDataContextType>['head']
        request: Request
        response: Response
        params: Record<string, string>
      }) => Promise<any>
      [key: string]: any
    },
  ) {}

  async onRequest(request: Request, params: Record<string, string> = {}, dataContext: DataContext<TDataContextType>, cache?: Cache) {
    const cachedData = cache?.getMiddlewareCache(this.name)
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
          dataContext: dataContext.data,
          params,
          request,
          head: dataContext.head,
        })
        .then(data => {
          if (data) {
            dataContext.data = {
              ...dataContext.data,
              ...cachedData,
            }
            cache?.setMiddlewareCache(this.name, data, Infinity)
          }
        })
  }
  async onBeforeResponse(request: Request, response: Response, params: Record<string, string> = {}, dataContext: DataContext<TDataContextType>, cache?: Cache) {
    if (this.handlers?.onBeforeResponse)
      await this.handlers.onBeforeResponse({
        params,
        request,
        response,
        dataContext: dataContext.data,
        head: dataContext.head,
      })
  }
}
