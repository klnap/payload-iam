import type { AuthUsersFacade } from '#iam/adapters/better-auth/auth-users'
import { assertCredentialAccountExists } from '#iam/adapters/better-auth/security/postconditions'
import { runWithInternalOperation } from '#iam/adapters/payload/operation-als'
import { hostPayload } from '#iam/adapters/payload/payload-host'
import { newId } from '#iam/core/identity/ids'
import { isStrongPassword, passwordPolicyMessage } from '#iam/core/identity/password-policy'
import { type InvitationStatus, isNonTerminal } from '#iam/modules/invitations'
import type { HostRuntimeDeps } from '#iam/types/config'

export function createSetPassword(host: HostRuntimeDeps, facade: AuthUsersFacade) {
  return async function setPassword(args: { userId: string; password: string }) {
    if (!isStrongPassword(args.password)) {
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

    const invites = await payload.find({
      collection: 'invitations',
      where: {
        and: [{ userId: { equals: args.userId } }, { status: { equals: 'pending' } }],
      },
      limit: 1,
      depth: 0,
      overrideAccess: true,
    })
    if (
      (invites.docs as Array<{ status: InvitationStatus }>).some((i) => isNonTerminal(i.status))
    ) {
      throw new Error('non-terminal invitation blocks setPassword')
    }

    const existing = await facade.findCredentialAccount(args.userId)
    if (existing) throw new Error('credential already exists — use changePassword')

    const provisioningOperationId = newId()
    return runWithInternalOperation(
      {
        kind: 'SET_PASSWORD',
        userId: args.userId,
        provisioningOperationId,
      },
      async () => {
        const hash = await facade.hashPassword(args.password)
        const account = await facade.createCredentialAccount({
          userId: args.userId,
          passwordHash: hash,
          provisioningOperationId,
        })
        if (!account) throw new Error('setPassword failed')
        await assertCredentialAccountExists((id) => facade.findCredentialAccount(id), args.userId)
        return { status: true }
      }
    )
  }
}
