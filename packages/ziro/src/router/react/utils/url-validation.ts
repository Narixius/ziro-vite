import { parseURL } from 'ufo'

export const isRouterCompatibleUrl = (url: string) => {
  const location = parseURL(url)
  const currentLocation = parseURL(window.location.href)
  return url.startsWith('/') || location.host === currentLocation.host
}
