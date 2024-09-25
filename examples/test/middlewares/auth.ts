import { base64url, jwtVerify, SignJWT } from 'jose'
import { LoaderArgs } from 'ziro/router'
import { redirect } from 'ziro/router/redirect'
import { Cookies } from '../../../packages/ziro/dist/router/storage/cookies'

export const auth = {
  name: 'auth',
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
const jwtKey = base64url.decode('1g4Zt7C+jEftICFoPagQrRRM4oJf1OaRr0vv2byVJTxwY6ePjjopE1x2RkUqudz5ffB+x+FB0oFHbtV6uNz3/A==')
const COOKIE_KEY = 'auth'

type User = {
  username: string
}

export const signToken = async (user: User) => {
  return await new SignJWT(user).setProtectedHeader({ alg: 'HS256' }).setIssuedAt().setExpirationTime('7d').sign(jwtKey)
}

export const login = async (user: User, cookies: Cookies) => {
  const token = await signToken(user)
  cookies.set(COOKIE_KEY, token)
  return token
}

export const logout = async (cookies: Cookies) => {
  cookies.delete(COOKIE_KEY)
}

export const verifyToken = async (token: string): Promise<User> => {
  return (await jwtVerify(token, jwtKey)).payload as User
}
