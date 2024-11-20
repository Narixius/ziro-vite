import { set } from 'lodash-es'
import { ZodError } from 'zod'

export const createValidationErrors = (zodError: ZodError) => {
  const errorObj: Record<string, any> = {}
  zodError.errors.forEach(error => {
    const path = error.path.join('.')
    set(errorObj, path, error.message)
  })
  return errorObj
}
