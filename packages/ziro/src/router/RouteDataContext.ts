import { createHead } from 'unhead'
import { Middleware } from './Middleware'

export type DataContextMode = 'client' | 'server' | 'partially'

export class DataContext<T extends any = any> {
  constructor(public data: T = {} as unknown as any, public head = createHead(), public middlewaresStack: Middleware<any, any>[] = []) {}
}
