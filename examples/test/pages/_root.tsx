import { FC, PropsWithChildren } from 'react'
import { Head, Outlet, RouteProps } from 'ziro2/react'
import { MetaFn } from 'ziro2/router'
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
    <html>
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
      </Head>
      <body>{children}</body>
    </html>
  )
}

// it will not rendering during ssr
export const Loading = () => {
  return <span>Loading root...</span>
}
