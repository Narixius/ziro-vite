export const createJsonError = (obj: Record<string, any>, status: number = 400, init: ResponseInit = {}) => {
  return new Response(JSON.stringify(obj), {
    status,
    ...init,
    headers: {
      'Content-Type': 'application/json',
      ...(init.headers || {}),
    },
  })
}
export const JsonError = (obj: Record<string, any>, status: number = 400, init: ResponseInit = {}) => {
  return createJsonError(obj, status, init)
}
