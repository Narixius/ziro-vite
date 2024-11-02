import { MetaFn } from 'ziro2/router'

export const meta: MetaFn<'/'> = async () => {
  return {
    title: 'homepage',
  }
}

export default function Index() {
  return (
    <div>
      <h1>Home page</h1>
    </div>
  )
}
