import type { Payload } from 'payload'
import type { Actor, IamApi } from '#iam/types/config'

export type ExpireStaleInvitationsResult = {
  scanned: number
  expired: string[]
  errors: Array<{ invitationId: string; message: string }>
}

/**
 * Marks pending invitations past `expiresAt` as expired via `api.expireInvitation`.
 * Host CMS must schedule this (cron, Payload job, or external worker) — the plugin does not register a job.
 */
export async function runExpireStaleInvitations(args: {
  payload: Payload
  api: Pick<IamApi, 'expireInvitation'>
  actor: Actor
  now?: Date
  limit?: number
}): Promise<ExpireStaleInvitationsResult> {
  const now = args.now ?? new Date()
  const limit = args.limit ?? 100
  const iso = now.toISOString()

  const found = await args.payload.find({
    collection: 'invitations',
    where: {
      and: [{ status: { equals: 'pending' } }, { expiresAt: { less_than: iso } }],
    },
    limit,
    depth: 0,
    overrideAccess: true,
  })

  const expired: string[] = []
  const errors: ExpireStaleInvitationsResult['errors'] = []

  for (const doc of found.docs) {
    const invitationId = String(doc.id)
    try {
      await args.api.expireInvitation({ invitationId, actor: args.actor })
      expired.push(invitationId)
    } catch (err) {
      const message = err instanceof Error ? err.message : 'expire failed'
      errors.push({ invitationId, message })
    }
  }

  return { scanned: found.docs.length, expired, errors }
}
