import {
  type InternalOperation,
  runWithInternalOperation,
} from '#iam/adapters/payload/operation-als'
import { hostPayload } from '#iam/adapters/payload/payload-host'
import {
  assertTransition,
  type InvitationStatus,
  type TerminalReason,
} from '#iam/modules/invitations/domain/state-machine'
import type { HostRuntimeDeps } from '#iam/types/config'

export type TransitionArgs = {
  id: string
  from: InvitationStatus
  to: InvitationStatus
  terminalReason?: TerminalReason | null
}

function opForTransition(args: TransitionArgs): InternalOperation {
  if (args.to === 'accepted') {
    return {
      kind: 'INVITATION_ACCEPT_PROVISION',
      model: 'invitations',
      targetId: args.id,
      fields: ['status', 'activeUserId', 'terminalReason', 'version'],
    }
  }
  if (args.to === 'expired') {
    return {
      kind: 'INVITATION_EXPIRE',
      model: 'invitations',
      targetId: args.id,
      fields: ['status', 'activeUserId', 'terminalReason', 'version'],
    }
  }
  if (args.to === 'pending' || args.terminalReason === 'resend') {
    return {
      kind: 'INVITATION_RESEND',
      model: 'invitations',
      targetId: args.id,
      fields: ['status', 'activeUserId', 'terminalReason', 'version'],
    }
  }
  return {
    kind: 'INVITATION_REVOKE',
    model: 'invitations',
    targetId: args.id,
    fields: ['status', 'activeUserId', 'terminalReason', 'version'],
  }
}

/**
 * Sole writer of invitation status. CAS via status match.
 */
export async function transitionInvitation(
  host: HostRuntimeDeps,
  args: TransitionArgs
): Promise<{ ok: true } | { ok: false; reason: 'cas-miss' }> {
  assertTransition(args.from, args.to)

  return runWithInternalOperation(opForTransition(args), async () => {
    const payload = await hostPayload(host)
    const existing = await payload.findByID({
      collection: 'invitations',
      id: args.id,
      depth: 0,
      overrideAccess: true,
    })
    if (!existing || existing.status !== args.from) {
      return { ok: false as const, reason: 'cas-miss' as const }
    }

    const version = Number((existing as { version?: number }).version ?? 1)
    const data: Record<string, unknown> = {
      status: args.to,
      version: version + 1,
    }
    if (args.to === 'pending') {
      data.terminalReason = null
    } else {
      data.activeUserId = null
      if (args.terminalReason !== undefined) {
        data.terminalReason = args.terminalReason
      }
    }

    await payload.update({
      collection: 'invitations',
      id: args.id,
      data,
      overrideAccess: true,
      depth: 0,
    })

    const again = await payload.findByID({
      collection: 'invitations',
      id: args.id,
      depth: 0,
      overrideAccess: true,
    })
    if (!again || again.status !== args.to) {
      return { ok: false as const, reason: 'cas-miss' as const }
    }
    return { ok: true as const }
  })
}
