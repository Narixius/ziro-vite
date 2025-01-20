import { SSRHeadPayload, Head as Unhead } from '@unhead/schema'
import { renderSSRHead } from '@unhead/ssr'
import parse from 'html-react-parser'
import { createElement, FC, HTMLProps, PropsWithChildren, Suspense, useContext, useMemo } from 'react'
import { OutletContext } from './contexts/OutletContext'
import { RouterContext } from './contexts/RouterContext'
import { routeLoaderSuspense } from './Router'

const isBrowser = !!(typeof window !== 'undefined' && window.document && window.document.createElement)

export const Html: FC<HTMLProps<HTMLHtmlElement>> = props => {
  return <html {...props} suppressHydrationWarning />
}

export const Body: FC<HTMLProps<HTMLBodyElement>> = ({ children, ...props }) => {
  const { layoutOptions } = useContext(RouterContext)
  return (
    <body {...props} suppressHydrationWarning>
      {children}
      {!isBrowser && (
        <Suspense>
          <CacheSerializer />
        </Suspense>
      )}
      {layoutOptions?.body}
    </body>
  )
}

export const CacheSerializer: FC<PropsWithChildren> = () => {
  const { dataContext, tree, params, cache, level } = useContext(OutletContext)
  const route = tree[0]!
  const theRestOfRoutes = useMemo(() => tree?.slice(1, tree.length), [tree])
  if (!route) return null
  try {
    routeLoaderSuspense(route, params, dataContext, cache)
  } catch (e) {
    if (e instanceof Promise) throw e
  }
  const cacheScript = createElement('script', {
    dangerouslySetInnerHTML: {
      __html: `window.__routerCache = ${JSON.stringify(cache.serialize())}`,
    },
  })
  return (
    <Suspense fallback={cacheScript}>
      <OutletContext.Provider value={{ tree: theRestOfRoutes, params, dataContext, cache, level: level + 1, route }}>
        <CacheSerializer />
      </OutletContext.Provider>
      {theRestOfRoutes.length === 0 ? cacheScript : null}
    </Suspense>
  )
}

const promiseStore: Record<
  string,
  {
    promise: Promise<unknown>
    status: 'pending' | 'success' | 'error'
    result: unknown
    error: any
  }
> = {}

function createResource<T>(key: string, promise: Promise<T>) {
  return {
    read() {
      if (!promiseStore[key]) {
        promiseStore[key] = {
          status: 'pending',
          result: null,
          error: null,
          promise: promise.then(
            res => {
              promiseStore[key].status = 'success'
              promiseStore[key].result = res
            },
            err => {
              promiseStore[key].status = 'error'
              promiseStore[key].error = err
            },
          ),
        }
      }
      if (promiseStore[key].status === 'pending') throw promiseStore[key].promise
      if (promiseStore[key].status === 'error') throw promiseStore[key].error
      return promiseStore[key].result
    },
  }
}

export const Head: FC<PropsWithChildren<{ fallbackMeta?: Unhead }> & HTMLProps<HTMLHeadElement>> = ({ fallbackMeta, children, ...props }) => {
  //   const { dataContext } = useContext(OutletContext)
  const { layoutOptions } = useContext(RouterContext)

  //   if (dataContext.head) {
  // dataContext.head.push(fallbackMeta || {})
  //   }

  //   const tagsResource = useMemo(() => createResource(renderSSRHead(dataContext.head)), [])

  //   const TagsContent: React.FC = useCallback(() => {
  //     const tags = tagsResource.read()
  //     return parse(tags.headTags)
  //   }, [tagsResource])

  // we need to wait for load route and then update the head at once

  return (
    <head {...props} suppressHydrationWarning>
      <Suspense>
        <Meta />
      </Suspense>
      {children}
      {layoutOptions?.head}
    </head>
  )
}

const Meta: FC<PropsWithChildren<{}>> = () => {
  const { dataContext, tree, params, cache } = useContext(OutletContext)
  const route = tree[0]!
  if (!route) return null

  try {
    routeLoaderSuspense(route, params, dataContext, cache)
  } catch (e) {
    if (e instanceof Promise) throw e
  }

  const tagsResource = useMemo(() => {
    return createResource(`${route.getId()}-${route.parsePath(params).url}`, renderSSRHead(dataContext.head))
  }, [route.getId(), params])

  return (
    <Suspense>
      <TagsContent resource={tagsResource} />
    </Suspense>
  )
}

const TagsContent: React.FC<{ resource: ReturnType<typeof createResource<SSRHeadPayload>> }> = ({ resource }) => {
  const { dataContext, tree, params, cache, level } = useContext(OutletContext)
  const theRestOfRoutes = useMemo(() => tree?.slice(1, tree.length), [tree])

  const route = tree[0]

  const tags = useMemo(() => resource.read(), [resource]) as SSRHeadPayload

  const headMetaComponents = useMemo(() => {
    return parse(tags.headTags)
  }, [tags.headTags])

  if (!route) return null

  return (
    <Suspense fallback={headMetaComponents}>
      {!!theRestOfRoutes.length && (
        <OutletContext.Provider value={{ tree: theRestOfRoutes, params, dataContext, cache, level: level + 1, route }}>
          <Meta />
        </OutletContext.Provider>
      )}
      {!!!theRestOfRoutes.length && headMetaComponents}
    </Suspense>
  )
}
