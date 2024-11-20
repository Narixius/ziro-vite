import { CookieSerializeOptions, parse, serialize } from 'cookie-es'
import { Storage } from './storage.js'

export const DEFAULT_COOKIES_OPTIONS: CookieSerializeOptions = {
  path: '/',
  httpOnly: true,
  secure: false, // Change to true in production
  sameSite: 'lax',
}

export class Cookies implements Storage {
  private cookies: Record<string, string>
  private cookiesArr: string[] = []

  constructor(private parsedCookies: string = '') {
    this.cookies = parse(parsedCookies)
  }

  get(key: string): string | null {
    return this.cookies[key] || null
  }

  getCookies() {
    return this.cookiesArr
  }

  set(name: string, value: string, options: CookieSerializeOptions = DEFAULT_COOKIES_OPTIONS) {
    const cookie = serialize(name, value, options)

    this.cookiesArr.push(cookie)

    this.cookies = {
      ...this.cookies,
      [name]: value,
    }
  }

  delete(name: string, options: CookieSerializeOptions = DEFAULT_COOKIES_OPTIONS) {
    const deleteOptions = { ...options, expires: new Date(0) }
    this.set(name, '', deleteOptions)
    delete this.cookies[name]
  }
}
