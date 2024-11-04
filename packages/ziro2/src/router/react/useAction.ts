import { useContext, useState } from 'react'
import { parseURL, stringifyParsedURL, withQuery } from 'ufo'
import { z } from 'zod'
import { AlsoAllowString } from '../../types'
import { Action } from '../Action'
import { AnyRoute, Route, RouteParams, SafeRouteParams } from '../Route'
import { RouteFilesByRouteId, RoutesByRouteId } from '../Router'
import { isRedirectResponse } from '../utils'
import { OutletContext } from './contexts/OutletContext'
import { RouterContext } from './contexts/RouterContext'
type InferRouteAction<TRoute extends AnyRoute> = TRoute extends AnyRoute<any, any, infer TActions> ? TActions : never

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
  options?: {
    preserveValues?: boolean | { enabled: boolean; exclude?: TActionFields[] }
  },
) => {
  const [isPending, setIsPending] = useState(false)
  const [data, setData] = useState<TActionResult | undefined>(undefined)
  const [errors, setErrors] = useState<Record<keyof TActionSchema | 'root', string> | undefined>(undefined)
  const routeId = typeof url === 'string' ? url : url.url
  const params = typeof url === 'string' ? {} : url.params
  const { router } = useContext(RouterContext)
  const { cache } = useContext(OutletContext)
  const submit = (body: TActionSchema) => {}
  const actionUrl = Route.fillRouteParams(routeId, params)
  const { navigate } = useContext(RouterContext)
  const formProps = {
    action: actionUrl,
    onSubmit(e: React.FormEvent<HTMLFormElement>) {
      e.preventDefault()
      setIsPending(true)
      const formData = new FormData((e.target as HTMLFormElement).elements.length > 0 ? (e.target as HTMLFormElement) : undefined)
      formData.append('x', 'asdf')
      const url = parseURL(
        withQuery(actionUrl, {
          action: action.toString(),
        }),
      )
      if (!url.host) {
        url.host = window.location.origin
      }

      const request = new Request(stringifyParsedURL(url), {
        method: 'post',
        body: formData,
      })

      router
        .handleAction(request, cache)
        .catch(response => {
          if (response instanceof Response) return response
          if (response instanceof Error) {
            return new Response(
              JSON.stringify({
                errors: {
                  root: response.message,
                },
              }),
              {
                status: 400,
              },
            )
          }
          return response
        })
        .then(response => {
          if (response instanceof Response) {
            if (response && isRedirectResponse(response)) {
              navigate(response.headers.get('Location') || response.url, { replace: true })
              return
            }
            return response.json()
          }
        })
        .then(data => {
          if (data === undefined) return
          if ('errors' in data) {
            return setErrors(data.errors)
          }
          setData(data)
        })
        .then(() => {
          cache.clear()
        })
        .finally(() => {
          setIsPending(false)
        })
    },
  }
  return {
    formProps,
    isPending,
    submit,
    data,
    errors,
  }
}
