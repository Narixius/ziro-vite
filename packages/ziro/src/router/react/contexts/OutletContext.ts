import { createContext } from 'react'
import { Cache } from '../../Cache'
import { AnyRoute } from '../../Route'
import { DataContext } from '../../RouteDataContext'
import { TRouteProps } from '../Router'

export const OutletContext = createContext<{
  tree: AnyRoute<any, any, any, any, any, TRouteProps>[]
  route?: AnyRoute<any, any, any, any, any, TRouteProps>
  params: Record<string, string>
  dataContext: DataContext
  cache: Cache
  level: number
}>(null!)
