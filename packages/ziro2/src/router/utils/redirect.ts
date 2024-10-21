export const createRedirectResponse = (url: string, status: number = 301, init: ResponseInit = {}) => {
  return new Response(null, {
    status,
    headers: {
      Location: url,
    },
    ...init,
  })
}
export const redirect = (url: string, status: number = 301, init: ResponseInit = {}) => {
  throw createRedirectResponse(url, status, init)
}
