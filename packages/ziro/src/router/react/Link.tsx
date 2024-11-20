import { FC, HTMLProps, MouseEvent } from 'react'
import { AlsoAllowString } from '../../types'
import { RoutesByRouteId } from '../Router'

// @ts-ignore
export const Link: FC<{ href: AlsoAllowString<RoutesByRouteId['routes']> } & Omit<HTMLProps<HTMLAnchorElement>, 'href'>> = ({ href, ...props }) => {
  const onClick = async (e: MouseEvent<HTMLAnchorElement, globalThis.MouseEvent>) => {
    props.onClick && (await props.onClick(e))
    if (!e.defaultPrevented) {
      e.preventDefault()
      window.history.pushState({}, '', href)
    }
  }
  return <a href={href} {...props} onClick={onClick} />
}
