import { ZodAny, ZodSchema } from 'zod'
import { DataContext } from './RouteDataContext'

export class Action<TInput extends ZodSchema = ZodAny, TResult = void> {
  constructor(
    private ctx: {
      input: TInput
      handler: (body: TInput, ctx: { request: Request; dataContext: DataContext }) => Promise<TResult>
    },
  ) {}
  async run(body: TInput, ctx: { request: Request; dataContext: DataContext }) {
    return this.ctx.handler(body, ctx)
  }
}
