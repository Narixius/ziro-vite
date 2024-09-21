import { ActionArgs, defineAction } from 'ziro/router'
import { abort } from 'ziro/router/abort'
import { z } from 'zod'
import { login, logout } from '../../middlewares/auth'

export const loginAction = defineAction({
  input: z.object({
    email: z.string().email(),
    password: z.string().min(6),
  }),
  async handler({ email, password }, { utils, serverContext }: ActionArgs<'/auth'>) {
    if (serverContext) {
      if (email == 'admin' && password == 'admin') {
        const token = await login(email, utils.storage.cookies!)
        return {
          ok: true,
          message: 'signed in successfully',
          token: token,
        }
      }
      abort(403, 'invalid request')
    }
  },
})

export const logoutAction = async (_: unknown, { utils }: ActionArgs<'/auth'>) => {
  await logout(utils.storage.cookies!)
  return {
    ok: true,
  }
}
