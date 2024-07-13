export * from '@tanstack/react-router'
export * from '@tanstack/start'
import { useRouteContext, useRouter } from '@tanstack/react-router'
import { Head as TanstackHead } from '@tanstack/start'
import parse from 'html-react-parser'
import { createElement } from 'react'

export const Head = ({ children, ...props }) => {
  const context = useRouteContext({
    from: '__root__',
  })
  return createElement(TanstackHead, props, [parse(context?.head || ''), children])
}

export const Body = ({ children, ...props }) => {
  const router = useRouter()

  const context = useRouteContext({
    from: '__root__',
  })

  if (!router.isServer) {
    return children
  }

  return createElement('body', props, [createElement('div', { id: 'root', key: 'root' }, children), parse(context?.scripts || '')])
}
