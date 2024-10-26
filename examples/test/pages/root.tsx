import { Body, Head, Html, Outlet } from 'ziro/router/client'
import { LoaderArgs, MetaFn } from 'ziro2/router'
import baseStyle from './styles.css?url'

export const meta: MetaFn<'/root'> = async ctx => {
  return {
    title: 'root from here',
    titleTemplate(title) {
      return `${title} | ${ctx.loaderData.version} `
    },
    link: [
      {
        href: baseStyle,
        rel: 'stylesheet',
      },
    ],
  }
}

export const loader = async (ctx: LoaderArgs<'/root'>) => {
  return {
    version: 1.1,
  }
}

export const Loading = () => {
  return 'loading...'
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
