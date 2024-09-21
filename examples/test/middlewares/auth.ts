import { base64url, jwtVerify, SignJWT } from 'jose'
import { LoaderArgs } from 'ziro/router'
import { redirect } from 'ziro/router/redirect'
import { Cookies } from '../../../packages/ziro/dist/router/storage/cookies'

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
const jwtKey = base64url.decode('1g4Zt7C+jEftICFoPagQrRRM4oJf1OaRr0vv2byVJTxwY6ePjjopE1x2RkUqudz5ffB+x+FB0oFHbtV6uNz3/A==')
const COOKIE_KEY = 'auth'
export const signToken = async (email: string) => {
  return await new SignJWT({ email }).setProtectedHeader({ alg: 'HS256' }).setIssuedAt().setExpirationTime('7d').sign(jwtKey)
}

export const login = async (email: string, cookies: Cookies) => {
  const token = await signToken(email)
  cookies.set(COOKIE_KEY, token)
  return token
}

export const logout = async (cookies: Cookies) => {
  cookies.delete(COOKIE_KEY)
}

export const verifyToken = async (token: string) => {
  return (await jwtVerify(token, jwtKey)).payload
}
