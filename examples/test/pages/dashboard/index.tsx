import { createMiddleware, RouteProps } from 'ziro/router'
import { redirect } from 'ziro/router/redirect'

const authMiddleware = createMiddleware({
  name: 'auth',
  handler: async () => {
    redirect('/auth')
    return {
      user: {
        name: 'nariman',
      },
    }
  },
})

export const middlewares = [authMiddleware]

export default function Dashboard(props: RouteProps<'/dashboard'>) {
  return <span>{props.dataContext.user.name}</span>
}

export const Loading = () => {
  return <span>Loading...</span>
}
