import { LoaderArgs } from 'ziro/router'
import { redirect } from 'ziro/router/redirect'

export const auth = {
  name: 'auth',
  handler: async ({ utils }: LoaderArgs<'/'>) => {
    const user = utils.storage.cookies?.get('user')
    if (!user) redirect('/auth')
    return {
      user: {
        name: user,
      },
    }
  },
}