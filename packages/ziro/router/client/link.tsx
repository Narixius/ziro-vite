import { HTMLAttributes, MouseEvent } from 'react'
import { RouteId, SafeRouteParams } from '../core.js'
import { useRouter } from '../hooks/useRouter.js'

export type LinkProps<T extends RouteId> = HTMLAttributes<HTMLAnchorElement> & (LinkPropsWithHref | LinkPropsWithTo<T>)

type LinkPropsWithHref = {
  href: string
}

type LinkPropsWithTo<TPath extends RouteId> = SafeRouteParams<TPath> extends undefined ? { href?: string; to: TPath } : { href?: string; to: TPath; params: SafeRouteParams<TPath> }

export const Link = <TPath extends RouteId>(props: LinkProps<TPath>) => {
  const router = useRouter()

  const localProps: any = { ...props }
  let href = localProps.href!
  if ('to' in localProps && localProps.to && typeof localProps.to === 'string') {
    href = localProps.to
    if ('params' in localProps && localProps.params && typeof localProps.params !== 'undefined') {
      for (const key in localProps.params) {
        href = href.replace(`:${key}`, localProps.params![key])
      }
    }
  }

  const onClick = (e: MouseEvent<HTMLAnchorElement>) => {
    e.preventDefault()
    if (props.onClick) props.onClick(e)
    if (!e.isPropagationStopped()) {
      if (router) router.push(href)
    }
  }

  if (localProps.to) delete localProps.to
  if (localProps.params) delete localProps.params
  localProps.href = href

  return <a {...localProps} href={href} onClick={onClick} />
}
