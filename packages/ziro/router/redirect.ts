export type TRedirectStatus = 301 | 302 | 303 | 307 | 308
export const REDIRECT_ERROR_KEY = 'ZIRO_REDIRECT'

export class RedirectError extends Error {
  constructor(
    private redirectTo: string,
    private status?: TRedirectStatus,
  ) {
    super(`${REDIRECT_ERROR_KEY}`)
  }

  public getPath() {
    return this.redirectTo
  }
  public getRedirectStatus() {
    return this.status || 302
  }
}

export const isRedirectError = (error: Error) => {
  return error.message === REDIRECT_ERROR_KEY && error instanceof RedirectError
}

export const redirect = (url: string, status?: 301 | 302 | 303 | 307 | 308) => {
  throw new RedirectError(url, status)
}
