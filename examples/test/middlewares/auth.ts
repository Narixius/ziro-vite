import { Middleware, redirect } from 'ziro2/router'

export const authGuard = new Middleware('AUTH-GUARD', {
  onRequest: async () => {
    if (!localStorage.getItem('username')) redirect('/auth')
  },
})

export const guestGuard = new Middleware('GUREST-GUARD', {
  onRequest: async () => {
    if (localStorage.getItem('username')) redirect('/dashboard')
  },
})
