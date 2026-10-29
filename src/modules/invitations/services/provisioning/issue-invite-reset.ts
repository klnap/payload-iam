import type { AuthUsersFacade } from '#iam/adapters/better-auth/auth-users'
import { normalizeEmail } from '#iam/adapters/email/email'
import { runWithInternalOperation } from '#iam/adapters/payload/operation-als'
import { hostPayload } from '#iam/adapters/payload/payload-host'
import { orderAdvisoryLocks } from '#iam/adapters/pg/locks'
import { newId } from '#iam/core/identity/ids'
import { sortUnique } from '#iam/core/identity/sort-unique'
import { transitionInvitation } from '#iam/modules/invitations/services/invitation-transition'
import { adminAbsoluteUrl } from '#iam/shared/paths/admin-absolute-url'
import { randomBytesBase64Url } from '#iam/shared/runtime/random-bytes'
import type { Actor, HostRuntimeDeps } from '#iam/types/config'

const INVITE_TTL_MS = 1000 * 60 * 60 * 48 // 48h

type PreparedInvite = {
  invitationId: string
  expiresAt: Date
  token: string
  mode: 'create' | 'resend'
  provisionUserId?: string
}

export async function issueInviteReset(
  host: HostRuntimeDeps,
  facade: AuthUsersFacade,
  args: {
    userId?: string
    email: string
    fullName?: string
    roleId?: string
    roleIds?: string[]
    actor: Actor
    reason: 'create' | 'resend'
    /** Default true. False = mint new link only (copy / reveal). */
    sendEmail?: boolean
    /** Resend: renew this pending/expired row. */
    invitationId?: string
  }
) {
  const email = normalizeEmail(args.email)
  const roleIds = sortUnique(args.roleIds?.length ? args.roleIds : args.roleId ? [args.roleId] : [])
  if (roleIds.length === 0) throw new Error('authorizedRoleIds required')

  const rate = await host.consumeRateLimit({
    key: `invite:${args.userId ?? email}`,
    limit: 20,
    windowMs: 60 * 60 * 1000,
  })
  if (!rate.allowed) throw new Error('invite rate limit')

  const reservedProvisionUserId = args.userId ?? (args.reason === 'create' ? newId() : undefined)

  const lockList: Array<
    | { kind: 'EMAIL_PROVISION_GUARD'; email: string }
    | { kind: 'USER_LIFECYCLE_GUARD'; userId: string }
    | { kind: 'ROLE_GUARD'; roleId: string }
  > = [
    { kind: 'EMAIL_PROVISION_GUARD', email },
    ...roleIds.map((roleId) => ({ kind: 'ROLE_GUARD' as const, roleId })),
  ]
  if (reservedProvisionUserId) {
    lockList.push({ kind: 'USER_LIFECYCLE_GUARD', userId: reservedProvisionUserId })
  }

  // Payload phase under locks — BA verification MUST run after.
  const prepared = await host.withAdvisoryLocks(orderAdvisoryLocks(lockList), async () =>
    runWithInternalOperation(
      {
        kind: args.reason === 'resend' ? 'INVITATION_RESEND' : 'INVITATION_ISSUE',
        model: 'invitations',
        targetId: 'pending',
        fields: [
          'userId',
          'email',
          'authorizedRoleIds',
          'status',
          'expiresAt',
          'activeUserId',
          'version',
          'inviteLink',
          'fullName',
        ],
      },
      async (): Promise<PreparedInvite> => {
        const payload = await hostPayload(host)
        const now = await host.dbNow()

        let inviteeFullName = args.fullName?.trim() || email
        if (args.userId) {
          // Lazy invite reserves userId before a users row exists — findByID would throw Not Found.
          const found = await payload.find({
            collection: 'users',
            where: { id: { equals: args.userId } },
            limit: 1,
            depth: 0,
            overrideAccess: true,
          })
          const user = found.docs[0] as
            | { provisioningStatus?: string; fullName?: string; email?: string }
            | undefined
          if (user?.provisioningStatus === 'deleting') {
            throw new Error('invite blocked: user deleting')
          }
          if (user) {
            inviteeFullName =
              String(user.fullName ?? '').trim() ||
              String(user.email ?? '').trim() ||
              inviteeFullName
          }
        }

        const live = await payload.find({
          collection: 'invitations',
          where: {
            and: [{ email: { equals: email } }, { status: { equals: 'pending' } }],
          },
          limit: 10,
          depth: 0,
          overrideAccess: true,
        })

        if (args.reason === 'create' && live.docs.length > 0) {
          throw new Error('live invitation exists')
        }

        const expiresAt = new Date(now.getTime() + INVITE_TTL_MS)
        const token = randomBytesBase64Url(32)
        const inviteAcceptBase = `${adminAbsoluteUrl(host.baseURL, host.adminRoute, '/invite/accept')}?id=`

        if (args.reason === 'resend') {
          type InvRow = {
            id: string
            status?: string
            version?: number
            authorizedRoleIds?: string[]
            userId?: string
            email?: string
          }

          let current: InvRow | null = null
          if (args.invitationId) {
            const byId = (await payload.findByID({
              collection: 'invitations',
              id: args.invitationId,
              depth: 0,
              overrideAccess: true,
            })) as InvRow | null
            if (!byId || (byId.status !== 'pending' && byId.status !== 'expired')) {
              throw new Error('no renewable invitation')
            }
            current = byId
          } else {
            const renewable = await payload.find({
              collection: 'invitations',
              where: {
                and: [
                  { email: { equals: email } },
                  {
                    or: [{ status: { equals: 'pending' } }, { status: { equals: 'expired' } }],
                  },
                ],
              },
              sort: '-updatedAt',
              limit: 1,
              depth: 0,
              overrideAccess: true,
            })
            current = (renewable.docs[0] as InvRow | undefined) ?? null
          }

          if (!current) {
            throw new Error('no renewable invitation')
          }

          inviteeFullName =
            String((current as { fullName?: string }).fullName ?? '').trim() || inviteeFullName

          const invitationId = String(current.id)
          const nextVersion = Number(current.version ?? 1) + 1
          const nextRoles =
            roleIds.length > 0
              ? roleIds
              : Array.isArray(current.authorizedRoleIds)
                ? current.authorizedRoleIds.map(String)
                : roleIds

          await payload.update({
            collection: 'invitations',
            id: invitationId,
            data: {
              email,
              authorizedRoleIds: nextRoles,
              status: 'pending',
              expiresAt: expiresAt.toISOString(),
              version: nextVersion,
              activeUserId: current.userId ?? args.userId ?? null,
              terminalReason: null,
              // inviteLink is create-only (field access); id in URL is unchanged on resend.
              fullName: inviteeFullName,
            },
            overrideAccess: true,
            depth: 0,
          })

          return { invitationId, expiresAt, token, mode: 'resend' as const }
        }

        const invitationId = newId()
        // Reserve stable Payload user id up front (no users row yet) — concurrent accept must agree.
        const provisionUserId = reservedProvisionUserId ?? newId()

        await payload.create({
          collection: 'invitations',
          data: {
            id: invitationId,
            userId: provisionUserId,
            email,
            authorizedRoleIds: roleIds,
            version: 1,
            status: 'pending',
            expiresAt: expiresAt.toISOString(),
            activeUserId: provisionUserId,
            terminalReason: null,
            // Persist base URL with id but without token — token is ephemeral, id is safe to show in admin.
            inviteLink: `${inviteAcceptBase}${encodeURIComponent(invitationId)}`,
            fullName: inviteeFullName,
          },
          overrideAccess: true,
        })

        return {
          invitationId,
          expiresAt,
          token,
          mode: 'create' as const,
          provisionUserId,
        }
      }
    )
  )

  try {
    if (prepared.mode === 'resend') {
      await facade.replaceInviteVerification({
        invitationId: prepared.invitationId,
        userId: args.userId,
        token: prepared.token,
        expiresAt: prepared.expiresAt,
        email,
      })
    } else {
      await facade.createInviteVerification({
        invitationId: prepared.invitationId,
        userId: prepared.provisionUserId ?? args.userId,
        token: prepared.token,
        expiresAt: prepared.expiresAt,
        email,
      })
    }
  } catch (err) {
    if (prepared.mode === 'create') {
      await transitionInvitation(host, {
        id: prepared.invitationId,
        from: 'pending',
        to: 'superseded',
        terminalReason: 'send-failure',
      })
    }
    throw err
  }

  const inviteUrl = `${adminAbsoluteUrl(host.baseURL, host.adminRoute, '/invite/accept')}?id=${encodeURIComponent(prepared.invitationId)}&token=${encodeURIComponent(prepared.token)}`

  if (args.sendEmail !== false) {
    try {
      await host.sendInviteEmail({
        to: email,
        inviteUrl,
        expiresAt: prepared.expiresAt,
      })
    } catch {
      // mail fail: keep pending live — caller can copy link
      // In non-production: always log the invite URL so it's visible without email delivery.
      if (process.env.NODE_ENV !== 'production') {
        const payload = await (await import('#iam/adapters/payload/payload-host')).hostPayload(host)
        payload.logger.info(
          `[dev-mail] to=${email} subject="You've been invited" link=${inviteUrl}`
        )
      }
    }
  } else if (process.env.NODE_ENV !== 'production') {
    // sendEmail=false (copy-link-only path): still log for dev convenience.
    const payload = await (await import('#iam/adapters/payload/payload-host')).hostPayload(host)
    payload.logger.info(`[dev-mail] to=${email} subject="You've been invited" link=${inviteUrl}`)
  }

  return {
    invitationId: prepared.invitationId,
    expiresAt: prepared.expiresAt,
    inviteUrl,
  }
}
