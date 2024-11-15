import { FC, HTMLAttributes, useCallback, useContext, useMemo, useState } from 'react'
import { z } from 'zod'
import { AlsoAllowString } from '../../types'
import { Action } from '../Action'
import { AnyRoute, Route, RouteParams, SafeRouteParams } from '../Route'
import { RouteFilesByRouteId, RoutesByRouteId } from '../Router'
import { isRedirectResponse } from '../utils'
import { OutletContext } from './contexts/OutletContext'
import { RouterContext } from './contexts/RouterContext'
type InferRouteAction<TRoute extends AnyRoute> = TRoute extends AnyRoute<any, any, infer TActions> ? TActions : never

type TPreserveValues<TActionFields = string> = { enabled: boolean; exclude?: TActionFields[] }

export const useAction = <
  // @ts-ignore
  RouteId extends AlsoAllowString<RoutesByRouteId['routes']>,
  // @ts-ignore
  TActionName extends AlsoAllowString<keyof InferRouteAction<RouteFilesByRouteId[RouteId]['route']>>,
  // @ts-ignore
  TAction extends InferRouteAction<RouteFilesByRouteId[RouteId]['route']>[TActionName],
  TActionSchema extends TAction extends Action<infer ActionSchema, any> ? z.infer<ActionSchema> : any,
  TActionResult = TAction extends Action<any, infer ActionResult> ? ActionResult : any,
  TActionFields = keyof TActionSchema,
>(
  url:
    | RouteId
    | (SafeRouteParams<RouteId> extends undefined
        ? {
            url: RouteId
          }
        : {
            url: RouteId
            params: RouteParams<RouteId>
          }),
  action: TActionName,
  options: {
    preserveValues?: boolean | TPreserveValues<TActionFields>
    onSuccess?: (data: TActionResult) => void
  } = {
    preserveValues: true,
  },
) => {
  const { cache } = useContext(OutletContext)
  const cachedData = cache.getActionCache(String(action), url, true)
  let cachedValue
  if (cachedData) {
    try {
      cachedValue = JSON.parse(cachedData.value)
    } catch (e) {
      cachedValue = cachedData.value
    }
  }

  const [data, setData] = useState<TActionResult | undefined>(cachedData && cachedData.status === 'success' ? cachedValue : undefined)
  const [errors, setErrors] = useState<Record<keyof TActionSchema | 'root', string> | undefined>(cachedData && cachedData.status === 'error' ? cachedValue?.errors : undefined)
  const [defaultValues, setDefaultValues] = useState<Record<string, any>>(cachedData && cachedData.status === 'error' ? cachedValue?.input || {} : {})

  const [isPending, setIsPending] = useState(false)
  const routeId = typeof url === 'string' ? url : url.url
  const params = typeof url === 'string' ? {} : url.params
  const { router, revalidateTree } = useContext(RouterContext)
  const { navigate } = useContext(RouterContext)

  const actionUrl = useMemo(() => Route.fillRouteParams(routeId, params), [routeId, params, action])

  const handleAction = useCallback(
    (request: Request) => {
      setDefaultValues({})
      // todo: call server to set cookies maybe?!
      router
        .handleAction(request, cache)
        .then(response => {
          if (response instanceof Response) {
            if (response && isRedirectResponse(response)) {
              navigate(response.headers.get('Location') || response.url, { replace: true })
              return
            }
            const contentType = response.headers.get('content-type')
            if (contentType && contentType.includes('application/json')) {
              return response.json()
            } else {
              return response.text()
            }
          }
        })
        .then(data => {
          if (!data) return
          if ('errors' in data) {
            if ('input' in data) {
              setDefaultValues(data.input)
            }
            return setErrors(data.errors)
          }
          options.onSuccess && options.onSuccess(data)
          setData(data)
        })
        .then(() => {
          revalidateTree()
        })
        .finally(() => {
          setIsPending(false)
        })
    },
    [cache, navigate, revalidateTree, router],
  )

  const submit = useCallback(
    (body: TActionSchema) => {
      const request = new Request(new URL(actionUrl, window.location.origin), {
        method: 'post',
        body: JSON.stringify(body),
        headers: {
          'Content-Type': 'application/json',
        },
      })
      return handleAction(request)
    },
    [actionUrl, action, handleAction],
  )

  const onSubmit = useCallback(
    (e: React.FormEvent<HTMLFormElement>) => {
      e.preventDefault()
      setIsPending(true)
      setErrors(undefined)
      const formData = new FormData((e.target as HTMLFormElement).elements.length > 0 ? (e.target as HTMLFormElement) : undefined)

      if (!formData.get('__action')) formData.append('__action', String(action))

      const pvEnabled = typeof options?.preserveValues === 'boolean' ? options?.preserveValues : true
      const pvOptions = (typeof options?.preserveValues === 'boolean' ? {} : options?.preserveValues || {}) as TPreserveValues<TActionFields>
      if (!formData.get('__pv')) formData.append('__pv', String(Number(pvEnabled)))
      if (!formData.get('__ex') && pvEnabled && pvOptions.exclude) {
        formData.append('__ex', pvOptions.exclude.join(','))
      }

      const request = new Request(new URL(actionUrl, window.location.origin), {
        method: 'post',
        body: formData,
      })

      handleAction(request)
    },
    [options?.preserveValues, handleAction],
  )

  const formProps = useMemo(() => {
    return {
      action: actionUrl,
      method: 'post',
      encType: 'multipart/form-data',
      onSubmit,
    }
  }, [actionUrl, onSubmit])

  const pvEnabled = useMemo(() => (typeof options?.preserveValues === 'boolean' ? options?.preserveValues : true), [options?.preserveValues])
  const pvOptions = useMemo(() => (typeof options?.preserveValues === 'boolean' ? {} : options?.preserveValues || {}) as TPreserveValues<TActionFields>, [options?.preserveValues])

  const Form: FC<HTMLAttributes<HTMLFormElement>> = useCallback(
    ({ children, ...props }) => {
      return (
        <form {...formProps} {...props}>
          <input type="hidden" name="__action" value={String(action)} />
          <input type="hidden" name="__pv" value={String(Number(pvEnabled))} />
          {pvEnabled && pvOptions.exclude && <input type="hidden" name="__ex" value={pvOptions.exclude.join(',')} />}

          {children}
        </form>
      )
    },
    [formProps, pvEnabled],
  )

  const register = (inputName: keyof TActionSchema) => {
    return {
      name: inputName,
      defaultValue: defaultValues[inputName as string],
    }
  }
  return {
    formProps,
    isPending,
    submit,
    data,
    errors,
    register,
    Form,
  }
}
