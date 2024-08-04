export type TAbortStatus = number
export const ABORT_ERROR_KEY = 'ZIRO_ABORT'
export type TAbortOptions<TMeta = any> = {
  message: string
  meta?: TMeta
}
export class AbortError<TMeta = any> extends Error {
  constructor(
    private status: TAbortStatus,
    private options?: TAbortOptions<TMeta>,
  ) {
    super(`${options?.message || ABORT_ERROR_KEY}`)
  }

  public getOptions() {
    return this.options
  }
  public getStatus() {
    return this.status || 302
  }
}

export const isAbortError = (error: Error) => {
  return error instanceof AbortError
}

export const abort = <TMeta>(status: TAbortStatus, options?: TAbortOptions<TMeta>) => {
  throw new AbortError<TMeta>(status, options)
}
