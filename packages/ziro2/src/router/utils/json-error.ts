export const createJsonError = (payload: Record<string, any>, status: number = 400, init: ResponseInit = {}) => {
  const res = new Response(JSON.stringify(payload), {
    status,
    ...init,
    headers: {
      ...(init.headers || {}),
    },
  })
  res.headers.set('Content-Type', 'application/json')
  return res
}

export class JsonError {
  response: Response
  constructor(private payload: Record<string, any>, private status: number = 400, private init: ResponseInit = {}) {
    this.response = createJsonError(payload, status, init)
  }
  getPayload() {
    return this.payload
  }
  extend(payload: Record<string, any>, status: number = this.status, init: ResponseInit = this.init) {
    this.response = createJsonError(payload, status, init)
  }
}
