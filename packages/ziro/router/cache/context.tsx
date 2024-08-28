import { createContext, ReactNode, useContext } from 'react'
import { SWRCache } from './swr'

interface SWRCacheProviderProps {
  cache: SWRCache
  children: ReactNode
}

const SWRCacheContext = createContext<SWRCache | null>(null)

export const SWRCacheProvider = ({ cache, children }: SWRCacheProviderProps) => {
  return <SWRCacheContext.Provider value={cache}>{children}</SWRCacheContext.Provider>
}

export const useSWRCache = (): SWRCache => {
  const context = useContext(SWRCacheContext)
  if (!context) {
    throw new Error('useSWRCache must be used within a SWRCacheProvider')
  }
  return context
}
