export const REDIRECT_STATUS_CODES = [301, 302, 303, 307, 308] as const

export const createRedirectResponse = (url: string, status: (typeof REDIRECT_STATUS_CODES)[number] = 301, init: ResponseInit = {}) => {
  const res = new Response(null, {
    status,
    ...init,
  })
  res.headers.set('Location', url)
  return res
}

type RedirectStatusCode = (typeof REDIRECT_STATUS_CODES)[number]

export const redirect = (url: string, status?: RedirectStatusCode | ResponseInit, init: ResponseInit = {}): never => {
  let redirectStatus: RedirectStatusCode = 301
  if (typeof status === 'number') redirectStatus = status
  throw createRedirectResponse(url, redirectStatus, init)
}

export const isRedirectResponse = (response: Response): boolean => {
  return REDIRECT_STATUS_CODES.includes(response.status as RedirectStatusCode) || response.redirected
}
