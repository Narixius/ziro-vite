import { useSyncExternalStore } from 'react'
import { useSWRCache } from './context.js'

export function useSWRStore<T>(key: string, fetchFunction: () => Promise<T>) {
  const swrCache = useSWRCache()

  const subscribe = (callback: () => void) => {
    return swrCache.subscribe(key, callback)
  }

  const getSnapshot = () => {
    const cachedData = swrCache.getCacheManager().get(key)
    if (cachedData) {
      return cachedData
    } else {
      throw swrCache.getData(key, fetchFunction)
    }
  }

  const getServerSnapshot = () => {
    const data = swrCache.getCacheManager().get(key)
    if (data?.isError) throw data
    return data
  }

  const data = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot)

  return data
}
