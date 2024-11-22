import { SSRHeadPayload, Head as Unhead } from '@unhead/schema'
import { renderSSRHead } from '@unhead/ssr'
import parse from 'html-react-parser'
import { createElement, FC, HTMLProps, PropsWithChildren, Suspense, useContext, useMemo } from 'react'
import { OutletContext } from './contexts/OutletContext'
import { RouterContext } from './contexts/RouterContext'
import { routeLoaderSuspense } from './Router'

const canUseDOM = !!(typeof window !== 'undefined' && window.document && window.document.createElement)

export const Html: FC<HTMLProps<HTMLHtmlElement>> = props => {
  return <html {...props} />
}

export const Body: FC<HTMLProps<HTMLBodyElement>> = ({ children, ...props }) => {
  const { layoutOptions } = useContext(RouterContext)
  return (
    <body {...props}>
      {children}
      {!canUseDOM && (
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
      __html: `window.__routerCache = ${cache.serialize()}`,
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

function createResource<T>(promise: Promise<T>) {
  let status: 'pending' | 'success' | 'error' = 'pending'
  let result: T
  let error: any

  const suspender = promise.then(
    res => {
      status = 'success'
      result = res
    },
    err => {
      status = 'error'
      error = err
    },
  )

  return {
    read() {
      if (status === 'pending') throw suspender
      if (status === 'error') throw error
      return result
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
    <head {...props}>
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

  //   console.log('loading route', route.getId())
  try {
    routeLoaderSuspense(route, params, dataContext, cache)
  } catch (e) {
    if (e instanceof Promise) {
      //   console.log('route', route.getId(), 'suspended')
      throw e
    }
  }

  // it reads from cache, but data didn't process during datacontext creating
  const tagsResource = useMemo(() => createResource(renderSSRHead(dataContext.head)), [route])

  return (
    <Suspense>
      <TagsContent resource={tagsResource} />
    </Suspense>
  )
}

const TagsContent: React.FC<{ resource: ReturnType<typeof createResource<SSRHeadPayload>> }> = ({ resource }) => {
  const { dataContext, tree, params, cache, level } = useContext(OutletContext)
  const theRestOfRoutes = useMemo(() => tree?.slice(1, tree.length), [tree])
  const tags = resource.read()

  const route = tree[0]

  const headMetaComponents = useMemo(() => parse(tags.headTags), [tags])
  //   console.log(!!!theRestOfRoutes.length, tags.headTags)

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
