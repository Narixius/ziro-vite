import { $fetch } from 'ofetch'
import { FormEvent, HTMLAttributes, useState } from 'react'
import { withQuery } from 'ufo'
import { useSWRStore } from '../cache/useSwr.js'
import { ActionResult, ActionSchema, FileRoutesByPath, SafeRouteParams, ZiroRoute } from '../core.js'
import { useRouter } from './useRouter.js'

export type TUseActions<TInputSchema, TResult> = {
  form: {
    action: string
    method: string
    onSubmit: (e: FormEvent<HTMLFormElement>) => void
  }
  registerInput: (name: keyof TInputSchema) => HTMLAttributes<HTMLInputElement>
  isSubmitting: boolean
  submit: (body: TInputSchema) => Promise<TResult>
  data?: TResult
  errors?: Partial<TInputSchema & { _root: string }>
}

type TActionBaseProps<TActionName, TSchema, TResult> = {
  action: TActionName
  onSuccess?: (data: TResult) => void | Promise<void>
  preserveValues?:
    | boolean
    | {
        enabled: boolean
        exclude?: (keyof TSchema)[]
      }
}

export const useAction = <TPath extends keyof FileRoutesByPath, TActionName extends keyof FileRoutesByPath[TPath]['actions']>(
  destination: (SafeRouteParams<TPath> extends undefined
    ? {
        url: TPath
      }
    : {
        url: TPath
        params: SafeRouteParams<TPath>
      }) &
    TActionBaseProps<TActionName, ActionSchema<FileRoutesByPath[TPath]['actions'][TActionName]>, ActionResult<FileRoutesByPath[TPath]['actions'][TActionName]>>,
): TUseActions<ActionSchema<FileRoutesByPath[TPath]['actions'][TActionName]>, ActionResult<FileRoutesByPath[TPath]['actions'][TActionName]>> => {
  const preserveValue = destination.preserveValues
  const preserveValueEnabled = typeof preserveValue === 'boolean' ? preserveValue : preserveValue?.enabled
  const excludedFields = typeof preserveValue === 'boolean' ? [] : preserveValue?.exclude || []
  const actionURL = withQuery(ZiroRoute.fillRouteParams(destination.url, (destination as any).params || {}), { action: destination.action.toString(), pv: preserveValueEnabled, ef: excludedFields })

  type TResult = TUseActions<ActionSchema<FileRoutesByPath[TPath]['actions'][TActionName]>, ActionResult<FileRoutesByPath[TPath]['actions'][TActionName]>>

  const actionCacheKey = `action:` + ZiroRoute.generateRouteUniqueKey(destination.url, ZiroRoute.fillRouteParams(destination.url, (destination as any).params || {}))
  const store = useSWRStore(actionCacheKey, async () => ({}))
  const isError = !!store?.data?.errors
  const [isSubmitting, setSubmittion] = useState<TResult['isSubmitting']>(false)
  const [data, setData] = useState<TResult['data']>(!isError ? store?.data || undefined : undefined)
  const [errors, setErrors] = useState<TResult['errors']>(isError ? store.data.errors : undefined)
  const defaultValues = isError && store.data.input
  const router = useRouter()!

  const post = (body: any): ReturnType<TResult['submit']> => {
    return $fetch
      .raw<TResult['data']>(actionURL, {
        method: 'post',
        headers: {
          Accept: 'application/json',
        },
        body,
      })
      .then(async response => {
        if (response.redirected) {
          const url = new URL(response.url)
          router.replace(url.pathname + url.search)
          return
        }
        setData(response._data)
        return response!._data!
      })
      .then(data => {
        if (destination.onSuccess) {
          destination.onSuccess(data!)
          return data!
        }
        return data!
      })
      .catch(error => {
        if (error?.data?.errors) setErrors(error?.data?.errors)
        throw error
      })
      .finally(() => {
        setSubmittion(false)
      }) as ReturnType<TResult['submit']>
  }

  const submit: TResult['submit'] = post

  const registerInput = (name: Parameters<TResult['registerInput']>['0']): HTMLAttributes<HTMLInputElement> => {
    return {
      name: name as string,
      defaultValue: defaultValues && name in defaultValues ? defaultValues[name] : '',
    } as HTMLAttributes<HTMLInputElement>
  }

  const res = {
    form: {
      action: actionURL,
      method: 'post',
      onSubmit(e) {
        e.preventDefault()
        setSubmittion(true)
        const formData = new FormData(e.target as HTMLFormElement)
        const filteredFormData = new FormData()
        formData.forEach((value, key) => {
          if (value instanceof File && value.size === 0) {
            console.log(`Skipping empty file: ${key}`)
          } else {
            filteredFormData.append(key, value)
          }
        })
        post(filteredFormData)
      },
    },
    registerInput,
    isSubmitting,
    submit,
    errors,
    data,
  } as TResult

  return res
}
