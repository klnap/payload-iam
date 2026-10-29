import { findDocById } from '#iam/adapters/payload/find-doc-by-id'
import { runWithInternalOperation } from '#iam/adapters/payload/operation-als'
import { hostPayload } from '#iam/adapters/payload/payload-host'
import {
  type InvitationStatus,
  isLiveInvitation,
} from '#iam/modules/invitations/domain/state-machine'
import { transitionInvitation } from '#iam/modules/invitations/services/invitation-transition'
import { finalizeUserProvisioning } from '#iam/modules/users'
import type { HostRuntimeDeps } from '#iam/types/config'
import type { InviteAcceptPrelude } from './invite-accept-prelude'

/** CAS pending → accepted (no credential phase). */
export async function completeInvitationAccept(
  host: HostRuntimeDeps,
  args: {
    prelude: InviteAcceptPrelude
    provisioningOperationId: string
    userId?: string
  }
): Promise<{ status: true; userId: string } | { error: string }> {
  const { prelude, provisioningOperationId } = args
  const userId = args.userId ?? prelude.userId ?? ''
  if (!userId) return { error: 'invalid_user' }
  const { invitationId, locks } = prelude
  const payload = await hostPayload(host)

  return host.withAdvisoryLocks(locks, async () =>
    runWithInternalOperation(
      {
        kind: 'INVITATION_ACCEPT_PROVISION',
        model: 'invitations',
        targetId: invitationId,
        fields: ['status', 'activeUserId', 'version'],
        userId,
        provisioningOperationId,
      },
      async () => {
        const inv = (await payload.findByID({
          collection: 'invitations',
          id: invitationId,
          depth: 0,
          overrideAccess: true,
        })) as {
          status: InvitationStatus
          activeUserId?: string | null
          userId?: string | null
          expiresAt: string
        } | null
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
          if (inv?.status === 'accepted') return { status: true, userId }
          return { error: 'conflict' }
        }

        const existingUser = await findDocById<{ id?: string }>(payload, {
          collection: 'users',
          id: userId,
        })

        if (!existingUser) {
          await payload.create({
            collection: 'users',
            data: {
              id: userId,
              email: prelude.email,
              fullName: prelude.fullName,
              roles: prelude.roleIds,
              isActive: true,
              provisioningStatus: 'none',
            },
            overrideAccess: true,
            context: { payloadRbacOp: 'INVITATION_ACCEPT_PROVISION' },
          })
        } else {
          const finalized = await finalizeUserProvisioning(host, { userId })
          if ('error' in finalized) return { error: 'conflict' }
        }

        const done = await transitionInvitation(host, {
          id: invitationId,
          from: 'pending',
          to: 'accepted',
        })
        if (!done.ok) return { error: 'conflict' }

        await payload.update({
          collection: 'invitations',
          id: invitationId,
          data: {
            userId,
            activeUserId: userId,
          },
          overrideAccess: true,
        })

        return { status: true, userId }
      }
    )
  )
}
