import { useContext } from 'react'
import { RouteContext } from '../client/components.js'

export const useRoute = () => useContext(RouteContext)!
