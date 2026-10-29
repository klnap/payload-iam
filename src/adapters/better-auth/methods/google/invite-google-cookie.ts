import { createHmac, timingSafeEqual } from 'node:crypto'

export const INVITE_GOOGLE_COOKIE_NAME = 'rbac_invite_google'

const COOKIE_MAX_AGE_SEC = 15 * 60

export type InviteGoogleCookiePayload = {
  invitationId: string
  userId: string
  token: string
  email: string
  provisioningOperationId: string
  exp: number
}

function signPayload(secret: string, payloadB64: string): string {
  return createHmac('sha256', secret).update(payloadB64).digest('base64url')
}

export function serializeInviteGoogleCookie(
  secret: string,
  payload: InviteGoogleCookiePayload
): string {
  const payloadB64 = Buffer.from(JSON.stringify(payload), 'utf8').toString('base64url')
  const sig = signPayload(secret, payloadB64)
  return `${payloadB64}.${sig}`
}

export function parseInviteGoogleCookie(
  secret: string,
  raw: string | undefined | null
): InviteGoogleCookiePayload | null {
  if (!raw?.trim()) return null
  const [payloadB64, sig] = raw.split('.')
  if (!payloadB64 || !sig) return null
  const expected = signPayload(secret, payloadB64)
  const a = Buffer.from(sig)
  const b = Buffer.from(expected)
  if (a.length !== b.length || !timingSafeEqual(a, b)) return null
  try {
    const parsed = JSON.parse(Buffer.from(payloadB64, 'base64url').toString('utf8')) as
      | InviteGoogleCookiePayload
      | undefined
    if (
      !parsed?.invitationId ||
      !parsed.userId ||
      !parsed.token ||
      !parsed.email ||
      !parsed.provisioningOperationId ||
      typeof parsed.exp !== 'number'
    ) {
      return null
    }
    if (parsed.exp < Date.now()) return null
    return parsed
  } catch {
    return null
  }
}

export function buildInviteGoogleSetCookieHeader(
  secret: string,
  payload: Omit<InviteGoogleCookiePayload, 'exp'>
): string {
  const value = serializeInviteGoogleCookie(secret, {
    ...payload,
    exp: Date.now() + COOKIE_MAX_AGE_SEC * 1000,
  })
  const secure = process.env.NODE_ENV === 'production' ? '; Secure' : ''
  return `${INVITE_GOOGLE_COOKIE_NAME}=${encodeURIComponent(value)}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${COOKIE_MAX_AGE_SEC}${secure}`
}

export function buildInviteGoogleClearCookieHeader(): string {
  return `${INVITE_GOOGLE_COOKIE_NAME}=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0`
}

export function readInviteGoogleCookieFromRequest(request: Request): string | undefined {
  const header = request.headers.get('cookie')
  if (!header) return undefined
  for (const part of header.split(';')) {
    const trimmed = part.trim()
    if (trimmed.startsWith(`${INVITE_GOOGLE_COOKIE_NAME}=`)) {
      return decodeURIComponent(trimmed.slice(INVITE_GOOGLE_COOKIE_NAME.length + 1))
    }
  }
  return undefined
}
