export * from '@tanstack/react-router'
export * from '@tanstack/start'
import { useRouteContext } from '@tanstack/react-router'
import { Head as TanstackHead } from '@tanstack/start'
import parse from 'html-react-parser'
import { createElement } from 'react'

export const Head = ({ children, ...props }) => {
  const context = useRouteContext({
    from: '__root__',
  })
  return createElement(TanstackHead, props, [parse(''), children])
}
