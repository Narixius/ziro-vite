import { $fetch } from 'ofetch'
import { createContext, createElement, FC, FormEvent, HTMLAttributes, HTMLProps, MouseEvent, PropsWithChildren, Suspense, useContext, useEffect, useState } from 'react'
import { ErrorBoundary } from 'react-error-boundary'
import { withQuery } from 'ufo'
import { SWRCacheProvider } from './cache/context.js'
import { useSWRStore } from './cache/useSwr.js'
import { ActionResult, ActionSchema, AlsoAllowString, AnyRoute, DEFAULT_ROOT_PATH, FileRoutesByPath, RouteId, SafeRouteParams, ZiroRoute, ZiroRouter } from './core.js'
import DefaultErrorComponent from './default-error-component.js'

type RouterProviderType = { router: ZiroRouter }
const RouterContext = createContext<ZiroRouter | null>(null)

export const useRouter = () => useContext(RouterContext)

export const Router: FC<RouterProviderType> = ({ router }) => {
  const [routeTree, setRouteTree] = useState(router.flatLookup(router.url!))

  useEffect(() => {
    const callback = (router: ZiroRouter) => {
      setRouteTree(router.flatLookup(router.url!))
    }
    router.hook('change-url', callback)
  }, [])

  return (
    <RouterContext.Provider value={router}>
      <SWRCacheProvider cache={router.cache}>
        <RouterEntryPoint routeTree={routeTree} />
      </SWRCacheProvider>
    </RouterContext.Provider>
  )
}

const RouterEntryPoint: FC<{ routeTree: AnyRoute[] }> = ({ routeTree }) => {
  if (routeTree?.length) {
    const route = routeTree[0]
    const children = routeTree.filter((_, i) => i > 0)
    return (
      <OutletRouteContext.Provider
        value={{
          route,
          children,
        }}
      >
        <RouteComponentRenderer route={route} />
      </OutletRouteContext.Provider>
    )
  }
  // TODO: show default error page here
}

export const useOutlet = () => useContext(OutletRouteContext)

export const Outlet: FC = () => {
  const outletContext = useOutlet()
  if (outletContext && outletContext?.children.length) return <RouterEntryPoint routeTree={outletContext?.children} />
}

const RouteContext = createContext<AnyRoute | null>(null)
export const useRoute = () => useContext(RouteContext)!

const RouteComponentRenderer: FC<{ route: AnyRoute }> = ({ route }) => {
  return (
    <RouteContext.Provider value={route}>
      <RouteErrorBoundary>
        <RouteSuspenseFallback>
          <RouteComponentSuspense />
        </RouteSuspenseFallback>
      </RouteErrorBoundary>
    </RouteContext.Provider>
  )
}

const RouteErrorBoundary: FC<PropsWithChildren> = ({ children }) => {
  const route = useRoute()
  const router = useRouter()
  try {
    // if (router?.dehydrate) {
    const data = router!.cache.getCacheManager().get(route.getRouteUniqueKey())

    if (data && data.isError && route.errorComponent) {
      const error = data.data
      //   if (isRedirectError(data.data) && router?.dehydrate) {
      //     throw data.data
      //   }
      const isRootRendered = route.path !== DEFAULT_ROOT_PATH
      const props: any = {
        error,
        status: error.status,
      }
      if (route.errorComponent === DefaultErrorComponent) props.isRootRendered = isRootRendered
      if (route.errorComponent) return <route.errorComponent {...props} />
    }
    // }
  } catch (data: any) {}

  if (!route.errorComponent) return children

  return (
    <ErrorBoundary
      FallbackComponent={function FC({ error, resetErrorBoundary }) {
        const router = useRouter()
        useEffect(() => {
          return router?.hook('change-url', resetErrorBoundary)
        }, [])
        if (route.errorComponent) {
          let passedError: any = error
          return <route.errorComponent error={passedError} resetErrorBoundary={resetErrorBoundary} status={passedError.status} />
        }
        throw error
      }}
    >
      {children}
    </ErrorBoundary>
  )
}
const RouteSuspenseFallback: FC<PropsWithChildren> = ({ children }) => {
  const route = useRoute()
  return <Suspense fallback={route.loadingComponent ? createElement(route.loadingComponent) : ''}>{children}</Suspense>
}

const RouteComponentSuspense: FC = () => {
  const route = useRoute()
  const routeStore = useSWRStore(route.getRouteUniqueKey(), route.load.bind(route))
  if (routeStore?.isError) throw routeStore.data
  return createElement(route.component, {
    params: route.getParams(),
    loaderData: routeStore?.data,
    dataContext: route.getDataContext(),
  })
}

export const useLoaderData = () => useRoute().getData()

const OutletRouteContext = createContext<{ route: AnyRoute; children: AnyRoute[] } | null>(null)

export type LinkProps<T extends RouteId> = HTMLAttributes<HTMLAnchorElement> & (LinkPropsWithHref | LinkPropsWithTo<T>)

type LinkPropsWithHref = {
  href: string
}

type LinkPropsWithTo<TPath extends RouteId> = SafeRouteParams<TPath> extends undefined ? { href?: string; to: TPath } : { href?: string; to: TPath; params: SafeRouteParams<TPath> }

export const Link = <TPath extends RouteId>(props: LinkProps<TPath>) => {
  const router = useRouter()

  const localProps: any = { ...props }
  let href = localProps.href!
  if ('to' in localProps && localProps.to && typeof localProps.to === 'string') {
    href = localProps.to
    if ('params' in localProps && localProps.params && typeof localProps.params !== 'undefined') {
      for (const key in localProps.params) {
        href = href.replace(`:${key}`, localProps.params![key])
      }
    }
  }

  const onClick = (e: MouseEvent<HTMLAnchorElement>) => {
    e.preventDefault()
    if (props.onClick) props.onClick(e)
    if (!e.isPropagationStopped()) {
      if (router) router.push(href)
    }
  }

  if (localProps.to) delete localProps.to
  if (localProps.params) delete localProps.params
  localProps.href = href

  return <a {...localProps} href={href} onClick={onClick} />
}

export const Html: FC<PropsWithChildren<HTMLProps<HTMLHtmlElement>>> = props => {
  return <html>{props.children}</html>
}

export const Body: FC<PropsWithChildren> = props => {
  return (
    <body>
      <div id="root">{props.children}</div>
    </body>
  )
}

export const Head: FC<PropsWithChildren> = props => {
  return <head suppressHydrationWarning>{props.children}</head>
}

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

export const useAction = <TPath extends keyof FileRoutesByPath, TActionName extends AlsoAllowString<keyof FileRoutesByPath[TPath]['actions']>>(
  destination: SafeRouteParams<TPath> extends undefined
    ? {
        url: TPath
        action: TActionName
        onSuccess?: (
          data: TPath extends keyof FileRoutesByPath ? (TActionName extends keyof FileRoutesByPath[TPath]['actions'] ? ActionResult<FileRoutesByPath[TPath]['actions'][TActionName]> : any) : any,
        ) => void | Promise<void>
      }
    : {
        url: TPath
        params: SafeRouteParams<TPath>
        action: TActionName
        onSuccess?: (
          data: TPath extends keyof FileRoutesByPath ? (TActionName extends keyof FileRoutesByPath[TPath]['actions'] ? ActionResult<FileRoutesByPath[TPath]['actions'][TActionName]> : any) : any,
        ) => void | Promise<void>
      },
): TPath extends keyof FileRoutesByPath
  ? TActionName extends keyof FileRoutesByPath[TPath]['actions']
    ? TUseActions<ActionSchema<FileRoutesByPath[TPath]['actions'][TActionName]>, ActionResult<FileRoutesByPath[TPath]['actions'][TActionName]>>
    : TUseActions<any, any>
  : TUseActions<any, any> => {
  const actionURL = withQuery(ZiroRoute.fillRouteParams(destination.url, (destination as any).params || {}), { action: destination.action.toString() })

  type TResult = TPath extends keyof FileRoutesByPath
    ? TActionName extends keyof FileRoutesByPath[TPath]['actions']
      ? TUseActions<ActionSchema<FileRoutesByPath[TPath]['actions'][TActionName]>, ActionResult<FileRoutesByPath[TPath]['actions'][TActionName]>>
      : TUseActions<any, any>
    : TUseActions<any, any>

  const actionCacheKey = `action:` + ZiroRoute.generateRouteUniqueKey(destination.url, ZiroRoute.fillRouteParams(destination.url, (destination as any).params || {}))
  const store = useSWRStore(actionCacheKey, async () => ({}))
  const isError = !!store?.data?.errors
  const [isSubmitting, setSubmittion] = useState<TResult['isSubmitting']>(false)
  const [data, setData] = useState<TResult['data']>(!isError ? store?.data || undefined : undefined)
  const [errors, setErrors] = useState<TResult['errors']>(isError ? store.data.errors : undefined)
  const defaultValues = isError && store.data.input
  const router = useRouter()!
  const post = (body: any) => {
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
      })
      .catch(error => {
        if (error?.data?.errors) setErrors(error?.data?.errors)
        else throw error
      })
      .finally(() => {
        setSubmittion(false)
      })
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
