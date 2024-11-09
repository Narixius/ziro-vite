import { useContext, useState } from 'react'
import { withQuery } from 'ufo'
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
  const [isPending, setIsPending] = useState(false)
  const [defaultValues, setDefaultValues] = useState<Record<string, any>>({})
  const [data, setData] = useState<TActionResult | undefined>(undefined)
  const [errors, setErrors] = useState<Record<keyof TActionSchema | 'root', string> | undefined>(undefined)
  const routeId = typeof url === 'string' ? url : url.url
  const params = typeof url === 'string' ? {} : url.params
  const { router, revalidateTree } = useContext(RouterContext)
  const { cache } = useContext(OutletContext)
  const actionUrl = Route.fillRouteParams(routeId, params)
  const submit = (body: TActionSchema) => {
    const request = new Request(
      new URL(
        withQuery(actionUrl, {
          action: action.toString(),
        }),
        window.location.origin,
      ),
      {
        method: 'post',
        body: JSON.stringify(body),
        headers: {
          'Content-Type': 'application/json',
        },
      },
    )
    handleAction(request)
  }
  const { navigate } = useContext(RouterContext)
  const formProps = {
    action: actionUrl,
    onSubmit(e: React.FormEvent<HTMLFormElement>) {
      e.preventDefault()
      setIsPending(true)
      setErrors(undefined)
      const formData = new FormData((e.target as HTMLFormElement).elements.length > 0 ? (e.target as HTMLFormElement) : undefined)

      const pvEnabled = typeof options?.preserveValues === 'boolean' ? options?.preserveValues : true
      const pvOptions = (typeof options?.preserveValues === 'boolean' ? {} : options?.preserveValues || {}) as TPreserveValues<TActionFields>
      formData.append('__pv', String(Number(pvEnabled)))
      if (pvEnabled && pvOptions.exclude) {
        formData.append('__ex', pvOptions.exclude.join(','))
      }

      const request = new Request(
        new URL(
          withQuery(actionUrl, {
            action: action.toString(),
          }),
          window.location.origin,
        ),
        {
          method: 'post',
          body: formData,
        },
      )

      handleAction(request)
    },
  }
  const handleAction = (request: Request) => {
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
        if (data === undefined) return
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
  }
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
  }
}
