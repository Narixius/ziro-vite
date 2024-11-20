import { useContext } from 'react'
import { OutletRouteContext } from '../client/components.js'

export const useOutlet = () => useContext(OutletRouteContext)
