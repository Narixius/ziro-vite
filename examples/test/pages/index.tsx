import { MetaFn } from 'ziro/router'

export const loader = async () => {
  return {}
}

export const Loading = () => {
  return <span>Loading home page...</span>
}

export const meta: MetaFn<'/'> = async () => {
  return {
    title: 'Homepage',
  }
}

export default function Index() {
  return (
    <div>
      <h1>Home page</h1>
    </div>
  )
}

// export const ErrorBoundary: FC<ErrorBoundaryProps> = props => {
//   return <span>error in homepage</span>
// }
