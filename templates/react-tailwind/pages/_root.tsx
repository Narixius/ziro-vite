import { FC, PropsWithChildren } from 'react'
import { Body, Head, Html, Outlet } from 'ziro/react'
import baseStyle from './styles.css?url'

export default function Root() {
  return <Outlet />
}

export const Layout: FC<PropsWithChildren> = ({ children }) => {
  return (
    <Html>
      <Head>
        <meta charSet="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <link href={baseStyle} rel="stylesheet" />
      </Head>
      <Body>{children}</Body>
    </Html>
  )
}
