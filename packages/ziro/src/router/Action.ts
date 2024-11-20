import { omit } from 'lodash-es'
import { parseURL } from 'ufo'
import { z } from 'zod'
import { Cache, CacheStatus } from './Cache'
import { DataContext } from './RouteDataContext'
import { JsonError, wrapErrorAsResponse } from './utils'
import { createAbortResponse } from './utils/abort'
import { createValidationErrors } from './utils/validation'

type ActionInfo = {
  routeId: string
  actionName: string
}

export class Action<TInput extends z.ZodSchema = z.ZodSchema, TResult = void> {
  constructor(
    private ctx: {
      input: TInput
      handler: (body: z.infer<TInput>, ctx: { request: Request; dataContext: DataContext<any>['data']; head: DataContext<any>['head']; cache?: Cache }) => Promise<TResult>
    },
  ) {}

  async handle(request: Request, data: any, params: Record<string, string | string[]>, dataContext: DataContext<any>, cache: Cache) {
    const contentType = request.headers.get('content-type') || ''

    const actionName = data.__action
    const preseveValues = data.__pv === '1'
    const excludedFields = preseveValues ? (data.__ex || '').split(',') : []

    let cacheStatus: CacheStatus = 'success'
    return await this.run(data, {
      dataContext,
      params,
      request,
      cache,
      preseveValues,
      excludedFields,
    })
      .then(async result => {
        if (result instanceof Response) {
          const res = result.clone()
          if (res.status > 299) cacheStatus = 'error'
          if (contentType.includes('application/json')) {
            cache.setActionCache(actionName, parseURL(request.url).pathname, await res.json(), cacheStatus)
          } else {
            cache.setActionCache(actionName, parseURL(request.url).pathname, await res.text(), cacheStatus)
          }
        }
        return result
      })
      .catch(e => {
        cacheStatus = 'error'
        if (e instanceof Error) {
          cache.setActionCache(actionName, parseURL(request.url).pathname, wrapErrorAsResponse(e).getPayload(), cacheStatus)
        }
        return e
      })
  }
  private async run(
    body: z.infer<TInput>,
    ctx: { request: Request; params: Record<string, string | string[]>; dataContext: DataContext; cache?: Cache; preseveValues: boolean; excludedFields?: string[] | string },
  ) {
    const validation = this.ctx.input.safeParse(body)
    const getInput = () => {
      return ctx.preseveValues ? omit(body, ctx.excludedFields || [], '__pv', '__ex') : undefined
    }
    if (!validation.success) {
      const res = {
        errors: createValidationErrors(validation.error),
        input: getInput(),
      }
      return createAbortResponse(400, res)
    }
    return this.ctx
      .handler(validation.data, {
        dataContext: ctx.dataContext.data,
        head: ctx.dataContext.head,
        request: ctx.request,
        cache: ctx.cache,
      })
      .catch(err => {
        if (err instanceof JsonError) {
          throw err.extend({
            ...err.getPayload(),
            input: getInput(),
          })
        }
        if (err instanceof Error) {
          throw new JsonError({
            errors: {
              root: err.message,
            },
            input: getInput(),
          })
        }
        // if its response
        throw err
      })
      .catch(err => {
        if (err instanceof JsonError) {
          return err.response
        }
        throw err
      })
  }
}
