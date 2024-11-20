import { Body, Head, Html, Outlet } from './client/index.js'

const RootPage = () => {
  return (
    <Html>
      <Head>
        <meta charSet="UTF-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
      </Head>
      <Body>
        <Outlet />
      </Body>
    </Html>
  )
}

export default RootPage
