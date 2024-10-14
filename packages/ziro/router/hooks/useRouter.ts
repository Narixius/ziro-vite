import { useContext } from 'react'
import { RouterContext } from '../client/components.js'

export const useRouter = () => useContext(RouterContext)
