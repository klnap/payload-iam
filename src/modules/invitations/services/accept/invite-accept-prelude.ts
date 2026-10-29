import { normalizeEmail } from '#iam/adapters/email/email'
import { findDocById } from '#iam/adapters/payload/find-doc-by-id'
import { hostPayload } from '#iam/adapters/payload/payload-host'
import { orderAdvisoryLocks } from '#iam/adapters/pg/locks'
import { sortUnique } from '#iam/core/identity/sort-unique'
import {
  type InvitationStatus,
  isLiveInvitation,
} from '#iam/modules/invitations/domain/state-machine'
import type { HostRuntimeDeps } from '#iam/types/config'

export type InviteAcceptPrelude = {
  invitationId: string
  userId?: string
  email: string
  fullName: string
  roleIds: string[]
  locks: ReturnType<typeof orderAdvisoryLocks>
}

type InvitationRow = {
  userId?: string
  email: string
  fullName?: string
  status: InvitationStatus
  activeUserId?: string | null
  expiresAt: string
  authorizedRoleIds?: string[]
  roleId?: string
}

export async function validateInviteAcceptPrelude(
  host: HostRuntimeDeps,
  auth: {
    $context: Promise<{
      internalAdapter: {
        findVerificationValue: (
          id: string
        ) => Promise<{ value: string; invitationId?: string } | null>
      }
    }>
  },
  args: { invitationId: string; token: string }
): Promise<{ ok: true; prelude: InviteAcceptPrelude } | { error: string }> {
  const payload = await hostPayload(host)
  const invitation = await findDocById<InvitationRow>(payload, {
    collection: 'invitations',
    id: args.invitationId,
  })
  if (!invitation) return { error: 'invalid_invite' }

  const userId = invitation.userId ? String(invitation.userId) : undefined
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
      userId,
      expiresAt: new Date(String(invitation.expiresAt)),
      now,
    })
  ) {
    return { error: 'invalid_invite' }
  }

  const lockList: Array<
    | { kind: 'EMAIL_PROVISION_GUARD'; email: string }
    | { kind: 'USER_LIFECYCLE_GUARD'; userId: string }
    | { kind: 'ROLE_GUARD'; roleId: string }
  > = [
    { kind: 'EMAIL_PROVISION_GUARD', email },
    ...roleIds.map((roleId) => ({ kind: 'ROLE_GUARD' as const, roleId })),
  ]
  if (userId) {
    lockList.push({ kind: 'USER_LIFECYCLE_GUARD', userId })
  }
  const locks = orderAdvisoryLocks(lockList)

  const gate = await host.withAdvisoryLocks(locks, async () => {
    if (userId) {
      const user = await findDocById<{ provisioningStatus?: string; isActive?: boolean }>(payload, {
        collection: 'users',
        id: userId,
      })
      if (user?.provisioningStatus === 'deleting') {
        return { error: 'conflict' as const }
      }
    } else {
      const existingUser = await payload.find({
        collection: 'users',
        where: { email: { equals: email } },
        limit: 1,
        depth: 0,
        overrideAccess: true,
      })
      if (existingUser.docs.length > 0) {
        const u = existingUser.docs[0] as { isActive?: boolean; provisioningStatus?: string }
        if (u.isActive === true) {
          return { error: 'conflict' as const }
        }
      }
    }

    const ctx = await auth.$context
    const verification = await ctx.internalAdapter.findVerificationValue(`invite:${args.token}`)
    const isMatch =
      verification &&
      (verification.value === args.invitationId ||
        verification.invitationId === args.invitationId ||
        (userId && verification.value === userId))
    if (!isMatch) {
      return { error: 'invalid_token' as const }
    }

    const inv2 = await findDocById<InvitationRow>(payload, {
      collection: 'invitations',
      id: args.invitationId,
    })
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

  if ('error' in gate) return { error: gate.error ?? 'unknown' }

  return {
    ok: true,
    prelude: {
      invitationId: args.invitationId,
      userId,
      email,
      fullName,
      roleIds,
      locks,
    },
  }
}
