import type { BuiltHost } from '#iam/plugin/runtime/build-host'
import type { HostRuntimeDeps } from '#iam/types/config'

export type GoogleLinkGuardDeps = {
  findPayloadUser: (
    userId: string
  ) => Promise<{ isActive?: boolean; provisioningStatus?: string } | null>
  hasCredentialAccount: (userId: string) => Promise<boolean>
  hasGoogleAccount: (userId: string) => Promise<boolean>
}

/** Invite completed: active Payload user with credential, no Google row yet. */
export async function canProvisionedUserLinkGoogle(
  deps: GoogleLinkGuardDeps,
  userId: string
): Promise<boolean> {
  if (!userId) return false

  const user = await deps.findPayloadUser(userId)
  if (!user || user.isActive === false) return false
  if (user.provisioningStatus && user.provisioningStatus !== 'none') return false

  if (!(await deps.hasCredentialAccount(userId))) return false
  if (await deps.hasGoogleAccount(userId)) return false

  return true
}

export function createGoogleLinkGuardDeps(host: HostRuntimeDeps): GoogleLinkGuardDeps {
  const pool = (host as BuiltHost).payloadPool
  if (!pool) {
    throw new Error('payload-iam: payloadPool required for Google account linking')
  }

  return {
    async findPayloadUser(userId) {
      const payload = await host.getPayload()
      try {
        return (await payload.findByID({
          collection: 'users',
          id: userId,
          depth: 0,
          overrideAccess: true,
        })) as { isActive?: boolean; provisioningStatus?: string } | null
      } catch {
        return null
      }
    },
    async hasCredentialAccount(userId) {
      const { rows } = await pool.query(
        `SELECT 1 AS ok FROM auth."account" WHERE "userId" = $1 AND "providerId" = 'credential' LIMIT 1`,
        [userId]
      )
      return rows.length > 0
    },
    async hasGoogleAccount(userId) {
      const { rows } = await pool.query(
        `SELECT 1 AS ok FROM auth."account" WHERE "userId" = $1 AND "providerId" = 'google' LIMIT 1`,
        [userId]
      )
      return rows.length > 0
    },
  }
}
