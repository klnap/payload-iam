import type { AuthUsersFacade } from '#iam/adapters/better-auth/auth-users'
import { deleteBaUserPreferIdThenEmail } from '#iam/adapters/better-auth/ensure-ba-user'
import { normalizeEmail } from '#iam/adapters/email/email'
import { findDocById } from '#iam/adapters/payload/find-doc-by-id'
import { runWithInternalOperation } from '#iam/adapters/payload/operation-als'
import { hostPayload } from '#iam/adapters/payload/payload-host'
import type { HostRuntimeDeps } from '#iam/types/config'

/** Remove invite anchor user that never activated (revoke / expire / re-invite reclaim). */
export async function abandonInviteProvisioningUser(
  host: HostRuntimeDeps,
  facade: AuthUsersFacade,
  userId: string
): Promise<void> {
  const payload = await hostPayload(host)
  const user = await findDocById<{ provisioningStatus?: string; email?: string }>(payload, {
    collection: 'users',
    id: userId,
  })
  if (user?.provisioningStatus !== 'provisioning') return

  const email = user.email ? normalizeEmail(String(user.email)) : ''

  await runWithInternalOperation(
    { kind: 'USER_DELETE', model: 'users', targetId: userId, fields: [] },
    async () => {
      await runWithInternalOperation({ kind: 'FACADE_DELETE_USER', userId }, async () => {
        await deleteBaUserPreferIdThenEmail(facade, { userId, email })
      })
      await payload.delete({
        collection: 'users',
        id: userId,
        overrideAccess: true,
        context: { localizedDeleteConfirmed: true },
      })
    }
  )
}
