import { createServerHead } from 'unhead'
import { Middleware } from './Middleware'

export type DataContextMode = 'client' | 'server' | 'partially'

export type SuspensePromiseStore = Record<
  string,
  {
    promise: Promise<any>
    status: 'pending' | 'fetched'
    resolve: (value: any) => void
    reject: (reason: unknown) => void
    errorData?: any
    resolved: boolean
  }
>

export type ChargedMiddlewareData = Record<string, string[]>

export class DataContext<T extends any = any> {
  constructor(
    public data: T = {} as unknown as any,
    public head = createServerHead(),
    public middlewaresStack: Middleware<any, any>[] = [],
    public suspensePromiseStore: SuspensePromiseStore = {},
    public chargedRouteMiddlewareMap: ChargedMiddlewareData = {},
  ) {}
}
