import { FC, PropsWithChildren } from 'react'
import { Body, Head, Html, Outlet, RouteProps } from 'ziro/react'
import { MetaFn } from 'ziro/router'
import { requestLogger } from '~/middlewares/logger'
import baseStyle from './styles.css?url'

export const middlewares = [requestLogger]

export const loader = async () => {
  return {
    version: 1.1,
  }
}

export const meta: MetaFn<'/_root'> = async ctx => {
  return {
    title: 'Root',
    titleTemplate(title) {
      return `${title} | Z۰RO APP`
    },
  }
}

export default function Root(props: RouteProps<'/_root'>) {
  return <Outlet />
}

export const Layout: FC<PropsWithChildren> = ({ children }) => {
  return (
    <Html>
      <Head
        fallbackMeta={{
          title: 'Z۰RO App',
          link: [
            {
              href: baseStyle,
              rel: 'stylesheet',
            },
          ],
        }}
      >
        <meta charSet="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <link href={baseStyle} rel="stylesheet" />
      </Head>
      <Body>{children}</Body>
    </Html>
  )
}

// it will not rendering during ssr
export const Loading = () => {
  return <span>Loading root...</span>
}

export const ErrorBoundary = () => {
  return <span>root error boundary</span>
}
