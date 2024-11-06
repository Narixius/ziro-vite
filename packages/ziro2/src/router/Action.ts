import { omit } from 'lodash-es'
import { z } from 'zod'
import { Cache } from './Cache'
import { DataContext } from './RouteDataContext'
import { JsonError } from './utils'
import { createAbortResponse } from './utils/abort'
import { parseFormDataToObject } from './utils/multipart'
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

  async handle(actionInfo: ActionInfo, request: Request, params: Record<string, string | string[]>, dataContext: DataContext<any>, cache: Cache) {
    const req = request.clone()

    const contentType = req.headers.get('content-type') || ''
    let data
    if (['multipart/form-data', 'application/x-www-form-urlencoded'].some(value => contentType.includes(value))) {
      data = parseFormDataToObject(await req.formData())
    } else if (contentType?.includes('application/json')) {
      data = await req.json()
    }

    const preseveValues = data.__pv === '1'
    const excludedFields = preseveValues ? (data.__ex || '').split(',') : []

    const actionResult = await this.run(data, {
      dataContext,
      params,
      request: request.clone(),
      actionInfo,
      cache,
      preseveValues,
      excludedFields,
    })
    if (cache) cache.setActionCache(actionInfo.actionName, request.url, actionResult)
    return actionResult
  }
  private async run(
    body: z.infer<TInput>,
    ctx: { actionInfo: ActionInfo; request: Request; params: Record<string, string | string[]>; dataContext: DataContext; cache?: Cache; preseveValues: boolean; excludedFields?: string[] | string },
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
