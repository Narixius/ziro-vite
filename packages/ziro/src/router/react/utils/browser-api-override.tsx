import { startTransition } from 'react'

export const proxyHistoryApi = (onUrlChanges: (url: string) => void) => {
  window.history.pushState = new Proxy(window.history.pushState, {
    apply: (target, thisArg, argArray) => {
      // trigger here what you need
      startTransition(() => {
        console.log('setting url 1')
        onUrlChanges(argArray[2])
      })
      return target.apply(thisArg, argArray as [any, string, string?])
    },
  })
  window.history.replaceState = new Proxy(window.history.replaceState, {
    apply: (target, thisArg, argArray) => {
      // trigger here what you need
      startTransition(() => {
        console.log('setting url 2')
        onUrlChanges(argArray[2])
      })
      return target.apply(thisArg, argArray as [any, string, string?])
    },
  })
  window.addEventListener('popstate', e => {
    startTransition(() => {
      console.log('setting url 3')
      onUrlChanges(window.location.pathname)
    })
  })
}
