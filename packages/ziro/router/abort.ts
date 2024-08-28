export type TAbortStatus = number
export const ABORT_ERROR_KEY = 'ZIRO_ABORT'
export type TAbortOptions = string

export class AbortError extends Error {
  constructor(public status: TAbortStatus, public message: TAbortOptions) {
    super(`${message || ABORT_ERROR_KEY}`)
  }

  serialize() {
    return JSON.stringify({
      message: this.message,
      status: this.status,
    })
  }

  static fromJson(serializedAbortError: string) {
    const data = JSON.parse(serializedAbortError) as AbortError
    return new AbortError(data.status, data.message)
  }
}

export const isAbortError = (error: Error) => {
  return error instanceof AbortError
}

export const abort = (status: TAbortStatus, message: string) => {
  throw new AbortError(status, message)
}
