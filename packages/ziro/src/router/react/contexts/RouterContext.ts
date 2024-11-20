import { createContext, ReactNode } from 'react'
import { Router } from '../../Router'

export type NavigateFn = (to: string, options: { replace?: boolean }) => void
export const RouterContext = createContext<{
  router: Router
  navigate: NavigateFn
  revalidateTree: () => Promise<any>
  layoutOptions?: {
    head?: ReactNode
    body?: ReactNode
  }
}>(null!)
