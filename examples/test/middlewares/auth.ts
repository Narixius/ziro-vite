import { LoaderProps } from 'ziro/router'
import { abort } from 'ziro/router/abort'

export const auth = {
  name: 'auth',
  handler: async ({ utils }: LoaderProps<''>) => {
    const user = utils.storage.cookies?.get('user')
    if (!user) abort(401, 'Unauthorized')
    return {
      user: {
        name: user,
      },
    }
  },
}
