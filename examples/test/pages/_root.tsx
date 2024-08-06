import { MetaFn } from 'ziro/router'
import { Body, Head, Html, Link, Outlet } from 'ziro/router/client'
import './styles.css'

export const meta: MetaFn<'_root'> = async ctx => {
  return {
    title: 'root',
    titleTemplate(title) {
      return `${title}`
    },
  }
}

export const loader = async (any: any) => {
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
        <div className="flex flex-col">
          <div className="flex gap-2">
            <Link href="/" className="text-blue-400 underline">
              Home page
            </Link>
            <Link href="/blog" className="text-blue-400 underline">
              blog
            </Link>
            <Link href="/blog/pikachu" className="text-blue-400 underline">
              Pikachu
            </Link>
            <Link href="/blog/ditto" className="text-blue-400 underline">
              Ditto
            </Link>
          </div>
          <Outlet />
        </div>
      </Body>
    </Html>
  )
}

export default RootPage
