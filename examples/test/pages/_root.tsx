import { FC, PropsWithChildren, Suspense } from 'react'
import { Meta, Outlet, RouteProps } from 'ziro2/react'
import { MetaFn } from 'ziro2/router'
import { requestLogger } from '~/middlewares/logger'
import baseStyle from './styles.css?url'

export const middlewares = [requestLogger]

export const loader = async () => {
  await new Promise(resolve => setTimeout(resolve, 1000))
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
      <head>
        <Suspense>
          <Meta
            fallbackHead={{
              title: 'Z۰RO APP',
            }}
          />
        </Suspense>
        <meta charSet="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <link rel="stylesheet" href={baseStyle} />
        <script
          type="module"
          dangerouslySetInnerHTML={{
            __html: `
import RefreshRuntime from "/@react-refresh"
RefreshRuntime.injectIntoGlobalHook(window)
window.$RefreshReg$ = () => {}
window.$RefreshSig$ = () => (type) => type
window.__vite_plugin_react_preamble_installed__ = true`,
          }}
        ></script>
        <script type="module" src="/@vite/client"></script>
        <script type="module" src="/@ziro/client-entry.jsx"></script>
      </head>
      <body>{children}</body>
    </html>
  )
}

// it will not rendering during ssr
export const Loading = () => {
  return <span>Loading root...</span>
}
