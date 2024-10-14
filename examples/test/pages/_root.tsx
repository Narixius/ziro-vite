import { LoaderArgs, MetaFn } from 'ziro/router'
import { Body, Head, Html, Outlet } from 'ziro/router/client'
import baseStyle from './styles.css?url'

export const meta: MetaFn<'_root'> = async ctx => {
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

export const loader = async (ctx: LoaderArgs<'_root'>) => {
  return {
    version: 1.1,
  }
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
