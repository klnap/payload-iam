import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'bun:test'
import { randomBytes } from 'node:crypto'
import {
  createEditorRole,
  createRbacIntPayload,
  intDatabaseConfigured,
  type RbacIntHandle,
} from '../../helpers/rbac-int-payload'

function parseInviteFromUrl(inviteUrl: string): { invitationId: string; token: string } {
  const url = new URL(inviteUrl)
  const invitationId = url.searchParams.get('id')
  const token = url.searchParams.get('token')
  if (!invitationId || !token) throw new Error('inviteUrl missing id or token')
  return { invitationId, token }
}

describe.skipIf(!intDatabaseConfigured)('invite provisioning lifecycle (postgres)', () => {
  let handle: RbacIntHandle

  beforeAll(async () => {
    handle = await createRbacIntPayload()
  })

  afterAll(async () => {
    await handle?.destroy()
  })

  beforeEach(async () => {
    await handle.reset()
  })

  it('lazy invite creates the user only on accept', async () => {
    const api = handle.payload.iam.api
    const roleId = await createEditorRole(handle.payload)
    const email = `invite-prov-${randomBytes(4).toString('hex')}@rbac-int.test`
    const password = 'Cc3!cccccccccc'

    const issued = await api.createSharedUser({
      email,
      fullName: 'Invitee',
      roleIds: [roleId],
      actor: { type: 'system', reason: 'int-test' },
    })
    expect(issued.inviteUrl).toBeDefined()
    expect(issued.invitationId).toBeDefined()
    expect('id' in issued).toBe(false)

    const beforeUsers = await handle.payload.find({
      collection: 'users',
      where: { email: { equals: email } },
      limit: 1,
      depth: 0,
      overrideAccess: true,
    })
    expect(beforeUsers.docs).toHaveLength(0)

    const { invitationId, token } = parseInviteFromUrl(issued.inviteUrl!)
    const accepted = (await api.acceptInvite({ invitationId, token, password })) as {
      status?: boolean
      userId?: string
    }
    expect(accepted.status).toBe(true)
    expect(accepted.userId).toBeDefined()

    const after = (await handle.payload.findByID({
      collection: 'users',
      id: accepted.userId!,
      depth: 0,
      overrideAccess: true,
    })) as { provisioningStatus?: string; isActive?: boolean }
    expect(after.provisioningStatus).toBe('none')
    expect(after.isActive).toBe(true)

    const invitation = await handle.payload.findByID({
      collection: 'invitations',
      id: invitationId,
      depth: 0,
      overrideAccess: true,
    })
    expect((invitation as { status?: string }).status).toBe('accepted')
  })

  it('resend pending invite works before users row exists (lazy provision userId)', async () => {
    const api = handle.payload.iam.api
    const roleId = await createEditorRole(handle.payload)
    const email = `invite-resend-${randomBytes(4).toString('hex')}@rbac-int.test`

    const issued = await api.createSharedUser({
      email,
      fullName: 'Resend Me',
      roleIds: [roleId],
      actor: { type: 'system', reason: 'int-test' },
    })
    const { invitationId } = parseInviteFromUrl(issued.inviteUrl!)

    const resent = await api.issueInviteReset({
      email,
      roleIds: [roleId],
      actor: { type: 'system', reason: 'int-test' },
      reason: 'resend',
      sendEmail: false,
      invitationId,
    })
    expect(resent.invitationId).toBe(invitationId)
    expect(resent.inviteUrl).toMatch(/token=/)
    expect(resent.inviteUrl).not.toBe(issued.inviteUrl)
  })

  it('revoke pending invite supersedes invitation without a user row', async () => {
    const api = handle.payload.iam.api
    const roleId = await createEditorRole(handle.payload)
    const email = `invite-revoke-${randomBytes(4).toString('hex')}@rbac-int.test`

    const issued = await api.createSharedUser({
      email,
      fullName: 'Revoke Me',
      roleIds: [roleId],
      actor: { type: 'system', reason: 'int-test' },
    })
    const { invitationId } = parseInviteFromUrl(issued.inviteUrl!)

    await api.revokeInvitation({
      invitationId,
      actor: { type: 'system', reason: 'int-test' },
    })

    const invitation = await handle.payload.findByID({
      collection: 'invitations',
      id: invitationId,
      depth: 0,
      overrideAccess: true,
    })
    expect((invitation as { status?: string }).status).toBe('superseded')

    const found = await handle.payload.find({
      collection: 'users',
      where: { email: { equals: email } },
      limit: 1,
      depth: 0,
      overrideAccess: true,
    })
    expect(found.docs).toHaveLength(0)
  })
})
