import type { AuthUsersFacade } from '#iam/adapters/better-auth/auth-users'
import { assertCredentialAccountExists } from '#iam/adapters/better-auth/security/postconditions'
import { normalizeEmail } from '#iam/adapters/email/email'
import { findDocById } from '#iam/adapters/payload/find-doc-by-id'
import { runWithInternalOperation } from '#iam/adapters/payload/operation-als'
import { hostPayload } from '#iam/adapters/payload/payload-host'
import { orderAdvisoryLocks } from '#iam/adapters/pg/locks'
import { newId } from '#iam/core/identity/ids'
import { passwordPolicyMessage, resolveProvisionPassword } from '#iam/core/identity/password-policy'
import { sortUnique } from '#iam/core/identity/sort-unique'
import {
  type InvitationStatus,
  isLiveInvitation,
} from '#iam/modules/invitations/domain/state-machine'
import { transitionInvitation } from '#iam/modules/invitations/services/invitation-transition'
import { finalizeUserProvisioning } from '#iam/modules/users'
import type { HostRuntimeDeps } from '#iam/types/config'

/**
 * Accept invite after User.create Model B (user already exists).
 * BA credential under unlocked Phase B; invitation CAS pending→accepted under locks.
 */
export function createAcceptInvite(
  host: HostRuntimeDeps,
  facade: AuthUsersFacade,
  auth: {
    $context: Promise<{
      internalAdapter: {
        findVerificationValue: (
          id: string
        ) => Promise<{ value: string; invitationId?: string } | null>
      }
    }>
  }
) {
  return async function acceptInvite(args: {
    invitationId: string
    token: string
    password?: string
    request?: Request
  }) {
    let generatedPassword: string | undefined
    let password: string
    try {
      const resolved = resolveProvisionPassword(args.password)
      password = resolved.password
      if (resolved.generated) generatedPassword = password
    } catch (err) {
      const message = err instanceof Error ? err.message : passwordPolicyMessage()
      return { error: 'invalid_password', message }
    }
    const payload = await hostPayload(host)
    const invitation = (await findDocById(payload, {
      collection: 'invitations',
      id: args.invitationId,
    })) as {
      userId?: string
      email: string
      fullName?: string
      status: InvitationStatus
      activeUserId?: string | null
      expiresAt: string
      authorizedRoleIds?: string[]
      roleId?: string
    } | null
    if (!invitation) return { error: 'invalid_invite' }

    const email = normalizeEmail(String(invitation.email))
    const fullName = String(invitation.fullName ?? email)
    const roleIds = sortUnique(
      Array.isArray(invitation.authorizedRoleIds) && invitation.authorizedRoleIds.length > 0
        ? invitation.authorizedRoleIds.map(String)
        : invitation.roleId
          ? [String(invitation.roleId)]
          : []
    )

    const now = await host.dbNow()
    if (
      !isLiveInvitation({
        status: invitation.status,
        activeUserId: invitation.activeUserId,
        userId: invitation.userId,
        expiresAt: new Date(String(invitation.expiresAt)),
        now,
      })
    ) {
      return { error: 'invalid_invite' }
    }

    const userId = invitation.userId ? String(invitation.userId) : String(args.invitationId)

    const lockList: Array<
      | { kind: 'EMAIL_PROVISION_GUARD'; email: string }
      | { kind: 'USER_LIFECYCLE_GUARD'; userId: string }
      | { kind: 'ROLE_GUARD'; roleId: string }
    > = [
      { kind: 'EMAIL_PROVISION_GUARD', email },
      { kind: 'USER_LIFECYCLE_GUARD', userId },
      ...roleIds.map((roleId) => ({ kind: 'ROLE_GUARD' as const, roleId })),
    ]
    const locks = orderAdvisoryLocks(lockList)

    const gate = await host.withAdvisoryLocks(locks, async () => {
      const existingUser = await payload.find({
        collection: 'users',
        where: { email: { equals: email } },
        limit: 1,
        depth: 0,
        overrideAccess: true,
      })
      if (existingUser.docs.length > 0) {
        const u = existingUser.docs[0] as {
          id?: string | number
          isActive?: boolean
          provisioningStatus?: string
        }
        if (u.isActive === true) {
          return { error: 'conflict' as const }
        }
        if (u.provisioningStatus === 'deleting') {
          return { error: 'conflict' as const }
        }
      }

      const ctx = await auth.$context
      const verification = await ctx.internalAdapter.findVerificationValue(`invite:${args.token}`)
      const isMatch =
        verification &&
        (verification.value === args.invitationId ||
          verification.invitationId === args.invitationId ||
          (invitation.userId && verification.value === invitation.userId))
      if (!isMatch) {
        return { error: 'invalid_token' as const }
      }

      const inv2 = (await payload.findByID({
        collection: 'invitations',
        id: args.invitationId,
        depth: 0,
        overrideAccess: true,
      })) as typeof invitation
      const now2 = await host.dbNow()
      if (
        !inv2 ||
        !isLiveInvitation({
          status: inv2.status,
          activeUserId: inv2.activeUserId,
          userId: inv2.userId,
          expiresAt: new Date(String(inv2.expiresAt)),
          now: now2,
        })
      ) {
        return { error: 'invalid_invite' as const }
      }
      return { ok: true as const }
    })

    if ('error' in gate) return gate

    // Phase B — BA credential
    const provisioningOperationId = newId()
    const credentialLocks = orderAdvisoryLocks([
      { kind: 'EMAIL_PROVISION_GUARD', email },
      { kind: 'USER_LIFECYCLE_GUARD', userId },
    ])
    try {
      await host.withAdvisoryLocks(credentialLocks, async () => {
        const { ensureBaUserMatchesPayload } = await import(
          '#iam/adapters/better-auth/ensure-ba-user'
        )
        await ensureBaUserMatchesPayload(facade, {
          userId,
          email,
          name: fullName,
        })

        const existingCred = await facade.findCredentialAccount(userId)
        if (existingCred) return
        const hash = await facade.hashPassword(password)
        const account = await facade.createCredentialAccount({
          userId,
          passwordHash: hash,
          provisioningOperationId,
        })
        if (!account) throw new Error('credential_failed')
        await assertCredentialAccountExists((id) => facade.findCredentialAccount(id), userId)
      })
    } catch {
      return { error: 'credential_failed' }
    }

    // Phase C — Create Payload User (if not existing) & CAS accepted
    return host.withAdvisoryLocks(locks, async () =>
      runWithInternalOperation(
        {
          kind: 'INVITATION_ACCEPT_PROVISION',
          model: 'invitations',
          targetId: args.invitationId,
          fields: ['status', 'activeUserId', 'version'],
          userId,
          provisioningOperationId,
        },
        async () => {
          const inv = (await payload.findByID({
            collection: 'invitations',
            id: args.invitationId,
            depth: 0,
            overrideAccess: true,
          })) as typeof invitation
          const now3 = await host.dbNow()
          if (
            !inv ||
            !isLiveInvitation({
              status: inv.status,
              activeUserId: inv.activeUserId,
              userId: inv.userId,
              expiresAt: new Date(String(inv.expiresAt)),
              now: now3,
            })
          ) {
            if (inv?.status === 'accepted') {
              return {
                status: true,
                userId: inv.userId ?? userId,
                ...(generatedPassword ? { generatedPassword } : {}),
              }
            }
            return { error: 'conflict' as const }
          }

          // Check if user already exists in Payload
          const existingUser = await findDocById<{ id?: string }>(payload, {
            collection: 'users',
            id: userId,
          })

          if (!existingUser) {
            await payload.create({
              collection: 'users',
              data: {
                id: userId,
                email,
                fullName,
                roles: roleIds,
                isActive: true,
                provisioningStatus: 'none',
              },
              overrideAccess: true,
              context: { payloadRbacOp: 'INVITATION_ACCEPT_PROVISION' },
            })
          } else {
            await finalizeUserProvisioning(host, { userId })
          }

          const done = await transitionInvitation(host, {
            id: args.invitationId,
            from: 'pending',
            to: 'accepted',
          })
          if (!done.ok) return { error: 'conflict' }

          await payload.update({
            collection: 'invitations',
            id: args.invitationId,
            data: {
              userId,
              activeUserId: userId,
            },
            overrideAccess: true,
          })

          return {
            status: true,
            userId,
            ...(generatedPassword ? { generatedPassword } : {}),
          }
        }
      )
    )
  }
}
