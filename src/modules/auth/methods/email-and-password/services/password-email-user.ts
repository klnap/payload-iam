import type { AuthUsersFacade } from '#iam/adapters/better-auth/auth-users'
import { normalizeEmail } from '#iam/adapters/email/email'
import { hostPayload } from '#iam/adapters/payload/payload-host'
import { adminAbsoluteUrl } from '#iam/shared/paths/admin-absolute-url'
import type { HostRuntimeDeps } from '#iam/types/config'

type AuthAccountsReader = {
  $context: Promise<{
    internalAdapter: {
      findAccounts: (userId: string) => Promise<Array<{ providerId?: string }>>
    }
  }>
}

export type PasswordEmailUser = {
  id: string
  email: string
}

export function adminPasswordTokenPageUrl(host: HostRuntimeDeps, flow: 'reset' | 'set'): string {
  const segment = flow === 'reset' ? '/reset-password' : '/set-password'
  return adminAbsoluteUrl(host.baseURL, host.adminRoute, segment)
}

export async function userHasCredentialAccount(
  facade: AuthUsersFacade,
  auth: AuthAccountsReader,
  userId: string
): Promise<boolean> {
  if (await facade.findCredentialAccount(userId)) return true
  const ctx = await auth.$context
  const accounts = await ctx.internalAdapter.findAccounts(userId)
  return accounts.some((row) => row.providerId === 'credential')
}

export async function loadActiveUserForPasswordEmail(
  host: HostRuntimeDeps,
  userId: string
): Promise<PasswordEmailUser> {
  const payload = await hostPayload(host)
  const usersSlug =
    (typeof payload.config.admin?.user === 'string' && payload.config.admin.user) || 'users'
  const user = (await payload.findByID({
    collection: usersSlug,
    id: userId,
    depth: 0,
    overrideAccess: true,
  })) as {
    email?: string
    isActive?: boolean
    provisioningStatus?: string
  } | null

  if (!user?.email) throw new Error('user not found')
  if (user.provisioningStatus && user.provisioningStatus !== 'none') {
    throw new Error('user provisioning in progress')
  }
  if (user.isActive === false) throw new Error('inactive user')

  return {
    id: userId,
    email: normalizeEmail(String(user.email)),
  }
}

export async function findActiveUserIdByEmail(
  host: HostRuntimeDeps,
  email: string
): Promise<string | null> {
  const payload = await hostPayload(host)
  const usersSlug =
    (typeof payload.config.admin?.user === 'string' && payload.config.admin.user) || 'users'
  const normalized = normalizeEmail(email)
  const found = await payload.find({
    collection: usersSlug,
    where: { email: { equals: normalized } },
    limit: 1,
    depth: 0,
    overrideAccess: true,
  })
  const doc = found.docs[0] as
    | {
        id?: string | number
        isActive?: boolean
        provisioningStatus?: string
      }
    | undefined
  if (!doc?.id) return null
  if (doc.isActive === false) return null
  if (doc.provisioningStatus && doc.provisioningStatus !== 'none') return null
  return String(doc.id)
}
