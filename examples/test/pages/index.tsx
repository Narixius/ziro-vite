import { MetaFn } from 'ziro/router'
import { Link } from 'ziro/router/client'

export const meta: MetaFn<'/'> = async () => {
  return {
    title: 'homepage',
  }
}

export default function Index() {
  return (
    <div>
      <div className="flex gap-2">
        <Link to="/pokes" className="underline text-blue-500">
          Pokes
        </Link>
        <Link to="/auth" className="underline text-blue-500">
          auth
        </Link>
      </div>
      <h1>Home page</h1>
    </div>
  )
}
