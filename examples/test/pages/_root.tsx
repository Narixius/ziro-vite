import { Body, Head, Html, Outlet } from 'ziro/router/client'
import './styles.css'

export const meta = async ctx => {
  return {
    title: 'root',
    titleTemplate(title) {
      return `${title} | ${ctx.loaderData.version}`
    },
  }
}

export const loader = async () => {
  return { version: 1.1 }
}

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
