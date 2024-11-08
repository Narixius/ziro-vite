import { Outlet } from 'ziro2/react'
import { LoaderArgs, MetaFn } from 'ziro2/router'
import { responseTimeMiddleware } from '~/middlewares/response-time'
import baseStyle from './styles.css?url'

export const middlewares = [responseTimeMiddleware]

export const meta: MetaFn<'/_root'> = async ctx => {
  return {
    title: 'root from here',
    titleTemplate(title) {
      return `${title} | Test app`
    },
    link: [
      {
        href: baseStyle,
        rel: 'stylesheet',
      },
    ],
  }
}

export const loader = async (ctx: LoaderArgs<'/_root'>) => {
  console.log('fetching root')
  return {
    version: 1.1,
  }
}

export const Loading = () => {
  return 'root loading...'
}

const RootPage = () => {
  return (
    // <Html>
    //   <Head>
    //     <meta charSet="UTF-8" />
    //     <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    //   </Head>
    //   <Body>
    <Outlet />
    //   </Body>
    // </Html>
  )
}

export default RootPage
