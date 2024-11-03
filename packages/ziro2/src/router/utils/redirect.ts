export const REDIRECT_STATUS_CODES = [301, 302, 303, 307, 308] as const

export const createRedirectResponse = (url: string, status: (typeof REDIRECT_STATUS_CODES)[number] = 301, init: ResponseInit = {}) => {
  return new Response(null, {
    status,
    headers: {
      Location: url,
    },
    ...init,
  })
}
type RedirectStatusCode = (typeof REDIRECT_STATUS_CODES)[number]

export const redirect = (url: string, status: RedirectStatusCode = 301, init: ResponseInit = {}): never => {
  throw createRedirectResponse(url, status, init)
}

export const isRedirectResponse = (response: Response): boolean => {
  return REDIRECT_STATUS_CODES.includes(response.status as RedirectStatusCode)
}
