import { createHead } from 'unhead'

export class DataContext<T extends any = any> {
  constructor(public data: T = {} as unknown as any, public head = createHead()) {}
}
