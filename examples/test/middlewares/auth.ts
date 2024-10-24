import { base64url, jwtVerify, SignJWT } from 'jose'
import { LoaderArgs, redirect } from 'ziro/router'
import { Cookies } from '../../../packages/ziro/dist/router/storage/cookies'

export const authGuard = {
  name: 'AUTH-GUARD',
  handler: async ({ utils }: LoaderArgs<'/'>) => {
    const token = utils.storage.cookies?.get(COOKIE_KEY)
    if (!token) return redirect('/auth')
    try {
      const user = await verifyToken(token)
      return {
        user,
      }
    } catch (error) {
      return redirect('/auth')
    }
  },
}

export const guestGuard = {
  name: 'GUEST-GUARD',
  handler: async ({ utils }: LoaderArgs<'/'>) => {
    const token = utils.storage.cookies?.get(COOKIE_KEY)
    if (token && (await verifyToken(token))) {
      redirect('/dashboard')
    }
    return {}
  },
}

const jwtKey = base64url.decode('1g4Zt7C+jEftICFoPagQrRRM4oJf1OaRr0vv2byVJTxwY6ePjjopE1x2RkUqudz5ffB+x+FB0oFHbtV6uNz3/A==')
const COOKIE_KEY = 'auth'

type User = {
  username: string
}

export const signToken = async (user: User) => {
  return await new SignJWT(user).setProtectedHeader({ alg: 'HS256' }).setIssuedAt().setExpirationTime('7d').sign(jwtKey)
}

export const login = async (user: User) => {
  const token = await signToken(user)
  return token
}

export const logout = async (cookies: Cookies) => {
  cookies.delete(COOKIE_KEY)
}

export const verifyToken = async (token: string): Promise<User> => {
  return (await jwtVerify(token, jwtKey)).payload as User
}
