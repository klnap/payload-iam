import type { HostRuntimeDeps } from '#iam/types/config'
import { normalizeEmail } from './email'

/** Auth `user.email` can be empty; Payload `users` is the source of truth for login OTP. */
export async function resolveLoginOtpRecipient(
  host: HostRuntimeDeps,
  userId: string,
  authEmail: unknown
): Promise<string | null> {
  if (typeof authEmail === 'string' && authEmail.trim()) {
    return normalizeEmail(authEmail)
  }

  const payload = await host.getPayload()
  const usersSlug = payload.config?.admin?.user ?? 'users'
  const found = await payload.find({
    collection: usersSlug,
    where: { id: { equals: userId } },
    limit: 1,
    depth: 0,
    overrideAccess: true,
  })
  const doc = found.docs[0] as { email?: string } | undefined
  const email = doc?.email
  if (typeof email === 'string' && email.trim()) {
    return normalizeEmail(email)
  }
  return null
}
