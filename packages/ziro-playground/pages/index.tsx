import { MetaFunction } from 'ziro/router'

export const meta: MetaFunction<'/blog/'> = () => {
  return [
    {
      title: 'Welcome to Z۰ro',
    },
  ]
}

export default function HomePage() {
  return <h1 className="text-xl font-bold">Welcome to Z۰ro</h1>
}
