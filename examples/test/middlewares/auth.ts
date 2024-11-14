import { parse } from 'cookie-es'
import { Middleware, redirect } from 'ziro2/router'

export const authGuard = new Middleware('AUTH-GUARD', {
  onRequest: async ({ request }) => {
    const { auth } = parse(request.headers.get('cookie') || '')
    if (!auth) redirect('/auth')
    return {
      user: auth,
    }
  },
})

export const guestGuard = new Middleware('GUREST-GUARD', {
  onRequest: async ({ request }) => {
    const { auth } = parse(request.headers.get('cookie') || '')
    if (auth) redirect('/dashboard')
  },
})
