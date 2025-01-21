import { createServerHead } from 'unhead'
import { Middleware } from './Middleware'

export type DataContextMode = 'client' | 'server' | 'partially'
// Need a comprehensive solution to use this on load router data and also load header tags
export type SuspensePromiseStore = Record<
  string,
  {
    promise: Promise<any>
    status: 'pending' | 'fetched' | 'error'
    resolve: (value: any) => void
    reject: (reason: unknown) => void
    result?: any
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
