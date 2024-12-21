import { startTransition } from 'react'

export const proxyHistoryApi = (onUrlChanges: (url: string) => void) => {
  window.history.pushState = new Proxy(window.history.pushState, {
    apply: (target, thisArg, argArray) => {
      // trigger here what you need
      startTransition(() => {
        onUrlChanges(argArray[2])
      })
      return target.apply(thisArg, argArray as [any, string, string?])
    },
  })
  window.history.replaceState = new Proxy(window.history.replaceState, {
    apply: (target, thisArg, argArray) => {
      // trigger here what you need
      startTransition(() => {
        onUrlChanges(argArray[2])
      })
      return target.apply(thisArg, argArray as [any, string, string?])
    },
  })
  window.addEventListener('popstate', e => {
    startTransition(() => {
      onUrlChanges(window.location.pathname)
    })
  })
}
