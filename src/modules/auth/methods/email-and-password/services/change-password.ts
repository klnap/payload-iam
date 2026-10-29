import type { AuthUsersFacade } from '#iam/adapters/better-auth/auth-users'
import { runWithInternalOperation } from '#iam/adapters/payload/operation-als'
import { hostPayload } from '#iam/adapters/payload/payload-host'
import { isStrongPassword, passwordPolicyMessage } from '#iam/core/identity/password-policy'
import type { HostRuntimeDeps } from '#iam/types/config'

export function createChangePassword(
  host: HostRuntimeDeps,
  facade: AuthUsersFacade,
  auth: {
    api: {
      changePassword: (args: {
        body: { currentPassword: string; newPassword: string; revokeOtherSessions?: boolean }
        headers: Headers
      }) => Promise<unknown>
    }
  }
) {
  return async function changePassword(args: {
    userId: string
    currentPassword: string
    newPassword: string
    headers: Headers
  }) {
    if (!isStrongPassword(args.newPassword)) {
      throw new Error(passwordPolicyMessage())
    }

    const payload = await hostPayload(host)
    const user = await payload.findByID({
      collection: 'users',
      id: args.userId,
      depth: 0,
      overrideAccess: true,
    })
    if (!user || user.isActive === false) throw new Error('forbidden')

    const cred = await facade.findCredentialAccount(args.userId)
    if (!cred) throw new Error('no credential')

    return runWithInternalOperation({ kind: 'CHANGE_PASSWORD', userId: args.userId }, async () => {
      // Discard returned token — HTTP /change-password disabled
      await auth.api.changePassword({
        body: {
          currentPassword: args.currentPassword,
          newPassword: args.newPassword,
          revokeOtherSessions: true,
        },
        headers: args.headers,
      })
      return { status: true }
    })
  }
}
