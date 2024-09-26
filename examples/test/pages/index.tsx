import { Link } from 'ziro/router/client'

export default function Index() {
  return (
    <div>
      <Link to="/pokes" className="underline text-blue-500">
        Pokes
      </Link>
      <h1>Home page</h1>
    </div>
  )
}
