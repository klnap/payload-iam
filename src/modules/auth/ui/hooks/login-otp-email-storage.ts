import { LOGIN_OTP_EMAIL_HINT_COOKIE } from '#iam/adapters/better-auth/cookie-names'

const LOGIN_OTP_EMAIL_KEY = 'iam-login-otp-email'

const LOGIN_OTP_HINT_MAX_AGE_SEC = 600

function readLoginOtpEmailFromCookie(): string | null {
  if (typeof document === 'undefined') return null
  const prefix = `${LOGIN_OTP_EMAIL_HINT_COOKIE}=`
  const chunk = document.cookie.split('; ').find((part) => part.startsWith(prefix))
  if (!chunk) return null
  const raw = chunk.slice(prefix.length)
  try {
    const value = decodeURIComponent(raw).trim()
    return value || null
  } catch {
    return null
  }
}

type LoginOtpCookieStore = {
  set(options: {
    name: string
    value: string
    path: string
    sameSite: 'lax'
    expires: number
  }): Promise<void>
  delete(name: string): Promise<void>
}

function loginOtpCookieStore(): LoginOtpCookieStore | undefined {
  if (typeof window === 'undefined') return undefined
  return (window as Window & { cookieStore?: LoginOtpCookieStore }).cookieStore
}

function writeLoginOtpEmailCookie(email: string): void {
  const store = loginOtpCookieStore()
  if (!store) return
  void store.set({
    name: LOGIN_OTP_EMAIL_HINT_COOKIE,
    value: email,
    path: '/',
    sameSite: 'lax',
    expires: Date.now() + LOGIN_OTP_HINT_MAX_AGE_SEC * 1000,
  })
}

function clearLoginOtpEmailCookie(): void {
  const store = loginOtpCookieStore()
  if (!store) return
  void store.delete(LOGIN_OTP_EMAIL_HINT_COOKIE)
}

export function persistLoginOtpEmail(email: string): void {
  const trimmed = email.trim()
  if (!trimmed || typeof window === 'undefined') return
  try {
    sessionStorage.setItem(LOGIN_OTP_EMAIL_KEY, trimmed)
  } catch {
    // private mode / quota
  }
  writeLoginOtpEmailCookie(trimmed)
}

export function readLoginOtpEmail(): string | null {
  return readLoginOtpEmailFromSessionStorage() ?? readLoginOtpEmailFromCookie()
}

function readLoginOtpEmailFromSessionStorage(): string | null {
  if (typeof window === 'undefined') return null
  try {
    const value = sessionStorage.getItem(LOGIN_OTP_EMAIL_KEY)?.trim()
    return value || null
  } catch {
    return null
  }
}

export function clearLoginOtpEmailStorage(): void {
  if (typeof window === 'undefined') return
  try {
    sessionStorage.removeItem(LOGIN_OTP_EMAIL_KEY)
  } catch {
    // ignore
  }
  clearLoginOtpEmailCookie()
}
