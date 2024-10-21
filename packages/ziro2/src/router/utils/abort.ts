export const createAbortResponse = (status: number, statusText?: string | Record<string, any>, init: ResponseInit = {}) => {
  const isJson = typeof statusText === 'object'
  const body = isJson ? JSON.stringify(statusText) : statusText
  const headers = new Headers()
  if (isJson) headers.set('Content-Type', 'application/json')
  return new Response(body, { status, headers, statusText: !isJson ? statusText : '', ...init })
}

export const abort = (status: number, statusText?: string | Record<string, any>, init: ResponseInit = {}) => {
  throw createAbortResponse(status, statusText, init)
}
