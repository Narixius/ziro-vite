import { omit } from 'lodash-es'
import { parseQuery, parseURL } from 'ufo'
import { z } from 'zod'
import { Cache } from './Cache'
import { DataContext } from './RouteDataContext'
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
      handler: (body: z.infer<TInput>, ctx: { request: Request; dataContext: DataContext<any>['data']; head: DataContext<any>['head'] }) => Promise<TResult>
    },
  ) {}

  async handle(actionInfo: ActionInfo, request: Request, params: Record<string, string | string[]>, dataContext: DataContext<any>, cache: Cache) {
    const query = parseQuery(String(parseURL(request.url).search))
    const preseveValues = typeof query.pv !== 'undefined'
    const excludedFields = query.ex
    const contentType = request.headers.get('content-type') || ''
    let data
    if (['multipart/form-data', 'application/x-www-form-urlencoded'].some(value => contentType.includes(value))) {
      data = parseFormDataToObject(await request.formData())
    } else if (contentType?.includes('application/json')) {
      data = await request.json()
    }
    const actionResult = await this.run(data, {
      dataContext,
      params,
      request,
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
    if (!validation.success) {
      const res = {
        errors: createValidationErrors(validation.error),
        input: ctx.preseveValues ? omit(body, ctx.excludedFields || []) : undefined,
      }
      return createAbortResponse(400, res)
    }
    return this.ctx.handler(body, {
      dataContext: ctx.dataContext.data,
      head: ctx.dataContext.head,
      request: ctx.request,
    })
  }
}
