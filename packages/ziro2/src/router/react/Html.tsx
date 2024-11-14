import { Head as Unhead } from '@unhead/schema'
import { renderSSRHead } from '@unhead/ssr'
import parse from 'html-react-parser'
import { FC, HTMLProps, PropsWithChildren, Suspense, useContext, useMemo } from 'react'
import { OutletContext } from './contexts/OutletContext'
import { routeLoadedSuspense } from './Router'

export const Html: FC<HTMLProps<HTMLHtmlElement>> = props => {
  return <html {...props} />
}

export const Body: FC<HTMLProps<HTMLBodyElement>> = ({ children, ...props }) => {
  return (
    <body {...props}>
      {children}
      <Suspense>
        <CacheSerializer />
      </Suspense>
    </body>
  )
}

export const CacheSerializer: FC<PropsWithChildren> = () => {
  const { dataContext, tree, params, cache, level } = useContext(OutletContext)
  const route = tree[0]!
  if (!route) return null
  routeLoadedSuspense(route, params, dataContext, cache)
  const cacheContent = `<script>window.__routerCache = ${cache.serialize()}</script>`
  const theRestOfRoutes = useMemo(() => tree?.slice(1, tree.length), [tree])
  return (
    <Suspense fallback={parse(cacheContent)}>
      <OutletContext.Provider value={{ tree: theRestOfRoutes, params, dataContext, cache, level: level + 1, route }}>
        <CacheSerializer />
      </OutletContext.Provider>
      {theRestOfRoutes.length === 0 ? parse(cacheContent) : null}
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
  const { dataContext } = useContext(OutletContext)
  if (dataContext.head) {
    dataContext.head.push(fallbackMeta || {}, {
      mode: 'server',
    })
  }

  const tagsResource = createResource(renderSSRHead(dataContext.head))

  const TagsContent: React.FC = () => {
    const tags = tagsResource.read()
    return parse(tags.headTags)
  }

  return (
    <head>
      <Suspense fallback={<TagsContent />}>
        <Meta />
      </Suspense>
      {children}
    </head>
  )
}

export const Meta: FC<PropsWithChildren> = () => {
  const { dataContext, tree, params, cache } = useContext(OutletContext)
  const route = tree[0]!
  if (!route) return null

  routeLoadedSuspense(route, params, dataContext, cache)
  const tagsResource = createResource(renderSSRHead(dataContext.head))

  const TagsContent: React.FC = () => {
    const { dataContext, tree, params, cache, level } = useContext(OutletContext)
    const tags = tagsResource.read()
    const route = tree[0]
    const theRestOfRoutes = useMemo(() => tree?.slice(1, tree.length), [tree])
    return (
      <Suspense fallback={parse(tags.headTags)}>
        <OutletContext.Provider value={{ tree: theRestOfRoutes, params, dataContext, cache, level: level + 1, route }}>
          <Meta />
        </OutletContext.Provider>
        {theRestOfRoutes.length === 0 ? parse(tags.headTags) : null}
      </Suspense>
    )
  }

  return (
    <Suspense>
      <TagsContent />
    </Suspense>
  )
}
