import { Head as Unhead } from '@unhead/schema'
import { renderSSRHead } from '@unhead/ssr'
import parse from 'html-react-parser'
import { FC, HTMLProps, PropsWithChildren, Suspense, useContext, useMemo } from 'react'
import { createHead } from 'unhead'
import { OutletContext } from './contexts/OutletContext'
import { routeLoadedSuspense } from './Router'

export const Html: FC<HTMLProps<HTMLHtmlElement>> = props => {
  return <html {...props} />
}
export const Head: FC<HTMLProps<HTMLHeadElement>> = props => {
  return <head {...props} />
}
export const Body: FC<HTMLProps<HTMLBodyElement>> = props => {
  return <body {...props} />
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

export const Meta: FC<PropsWithChildren<{ fallbackHead?: Unhead }>> = ({ fallbackHead }) => {
  const head = createHead()
  head.push(fallbackHead || {}, {
    mode: 'server',
  })

  const tagsResource = createResource(renderSSRHead(head))

  const TagsContent: React.FC = () => {
    const tags = tagsResource.read()
    return parse(tags.headTags)
  }

  return (
    <Suspense fallback={<TagsContent />}>
      <Meta2 />
    </Suspense>
  )
}

export const Meta2: FC<PropsWithChildren> = () => {
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
          <Meta2 />
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
