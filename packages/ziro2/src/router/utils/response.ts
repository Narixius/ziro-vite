export const createResponse = (data: any) => {
  if (data instanceof Response) return data
  else {
    const headers = new Headers()
    if (typeof data === 'object') headers.set('content-type', 'application/json')
    return new Response(JSON.stringify(data), {
      headers,
    })
  }
}
