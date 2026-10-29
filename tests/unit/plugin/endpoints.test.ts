import { beforeEach, describe, expect, mock, test } from 'bun:test'
import type { Payload } from 'payload'
import * as bootstrapRootModule from '../../../src/modules/bootstrap/services/bootstrap-root'
import { IAM_API_PATH } from '../../../src/shared/paths/iam-api-paths'
import { resolveRbacModules } from '../../../src/types/modules'

const bootstrapRootMock = mock(bootstrapRootModule.bootstrapRoot)

mock.module('../../../src/modules/bootstrap/services/bootstrap-root', () => ({
  ...bootstrapRootModule,
  bootstrapRoot: (...args: Parameters<typeof bootstrapRootModule.bootstrapRoot>) =>
    bootstrapRootMock(...args),
}))

const { createRbacEndpoints } = await import('../../../src/plugin/endpoints')

function findHandler(path: string, method: string) {
  const endpoints = createRbacEndpoints(resolveRbacModules(), {
    forgotPassword: true,
    usersSlug: 'users',
  })
  const ep = endpoints.find((e) => e.path === path && e.method === method)
  if (!ep?.handler) throw new Error(`missing ${method} ${path}`)
  return ep.handler
}

const adminUser = {
  id: 'admin-1',
  type: 'human',
  authChannel: 'ba-admin-session',
  roles: [{ name: 'Root' }],
}

describe('rbac HTTP handlers (contract smoke)', () => {
  beforeEach(() => {
    bootstrapRootMock.mockReset()
    bootstrapRootMock.mockImplementation(bootstrapRootModule.bootstrapRoot)
  })

  test('POST /rbac/bootstrap-root returns 409 when root already exists', async () => {
    bootstrapRootMock.mockImplementation(async () => {
      throw new Error('Root admin already exists')
    })
    const handler = findHandler(IAM_API_PATH.bootstrap.root, 'post')
    const res = await handler({
      json: async () => ({ email: 'root@test.io', password: 'secret-12345678' }),
      payload: {} as Payload,
    } as never)
    expect(res.status).toBe(409)
  })

  test('POST /rbac/bootstrap-root returns 403 when bootstrap gated', async () => {
    bootstrapRootMock.mockImplementation(async () => {
      throw new Error('PAYLOAD_RBAC bootstrap not allowed in production')
    })
    const handler = findHandler(IAM_API_PATH.bootstrap.root, 'post')
    const res = await handler({
      json: async () => ({ email: 'root@test.io', password: 'secret-12345678' }),
      payload: {} as Payload,
    } as never)
    expect(res.status).toBe(403)
  })

  test('POST /rbac/auth/request-password-email returns identical 200 bodies', async () => {
    const requestPasswordEmail = mock(async () => ({ ok: true as const }))
    const payload = {
      iam: { api: { requestPasswordEmail } },
    } as Payload & { iam: { api: { requestPasswordEmail: typeof requestPasswordEmail } } }

    const handler = findHandler(IAM_API_PATH.users.requestPasswordEmail, 'post')
    const resKnown = await handler({
      json: async () => ({ email: 'known@example.com' }),
      payload,
    } as never)
    const resUnknown = await handler({
      json: async () => ({ email: 'unknown@example.com' }),
      payload,
    } as never)

    expect(resKnown.status).toBe(200)
    expect(resUnknown.status).toBe(200)
    const knownBody = await resKnown.json()
    const unknownBody = await resUnknown.json()
    expect(knownBody).toEqual(unknownBody)
    expect(knownBody).toEqual({ ok: true })
  })

  test('POST /rbac/invite returns stable conflict code from pre-check', async () => {
    const findCalls: string[] = []
    const payload = {
      find: mock(async (args: { collection: string }) => {
        findCalls.push(args.collection)
        if (args.collection === 'invitations') {
          return { docs: [{ id: 'inv-live' }] }
        }
        return { docs: [] }
      }),
      iam: {
        api: {
          createSharedUser: mock(async () => ({ invitationId: 'x' })),
        },
      },
    } as unknown as Payload

    const handler = findHandler(IAM_API_PATH.invitations.invite, 'post')
    const res = await handler({
      user: adminUser,
      json: async () => ({
        email: 'user@example.com',
        fullName: 'User',
        roleIds: ['role-1'],
      }),
      payload,
    } as never)

    expect(res.status).toBe(409)
    const body = (await res.json()) as { code?: string }
    expect(body.code).toBe('live_invitation_exists')
    expect(findCalls[0]).toBe('invitations')
  })

  test('POST /rbac/invitations/revoke delegates to api.revokeInvitation', async () => {
    const revokeInvitation = mock(async () => ({ ok: true }))
    const handler = findHandler(IAM_API_PATH.invitations.revoke, 'post')
    const res = await handler({
      user: adminUser,
      json: async () => ({ invitationId: 'inv-1' }),
      payload: { iam: { api: { revokeInvitation } } } as never,
    } as never)
    expect(res.status).toBe(200)
    expect(revokeInvitation).toHaveBeenCalledWith({
      invitationId: 'inv-1',
      actor: { type: 'human', userId: 'admin-1' },
    })
  })

  test('POST /rbac/invitations/resend calls issueInviteReset for expired invite', async () => {
    const issueInviteReset = mock(async () => ({
      invitationId: 'inv-2',
      expiresAt: '2099-01-01T00:00:00.000Z',
      inviteUrl: 'http://test/invite',
    }))
    const payload = {
      findByID: mock(async () => ({
        userId: 'u1',
        email: 'a@b.c',
        status: 'expired',
        authorizedRoleIds: ['role-1'],
      })),
      find: mock(async () => ({
        docs: [{ id: 'role-1', name: 'Writer', permissions: {} }],
      })),
      iam: { api: { issueInviteReset } },
    } as unknown as Payload

    const handler = findHandler(IAM_API_PATH.invitations.resend, 'post')
    const res = await handler({
      user: adminUser,
      json: async () => ({ invitationId: 'inv-2', sendEmail: true }),
      payload,
    } as never)

    expect(res.status).toBe(200)
    expect(issueInviteReset).toHaveBeenCalled()
    const body = (await res.json()) as { invitationId?: string }
    expect(body.invitationId).toBe('inv-2')
  })

  test('POST /rbac/invite denies admin without invitations.create', async () => {
    const writer = {
      id: 'writer-1',
      type: 'human',
      authChannel: 'ba-admin-session',
      roles: [
        {
          name: 'Writer',
          permissions: {
            collections: {
              pages: { create: true, read: true, update: true },
            },
          },
        },
      ],
    }
    const createSharedUser = mock(async () => ({ invitationId: 'x' }))
    const handler = findHandler(IAM_API_PATH.invitations.invite, 'post')
    const res = await handler({
      user: writer,
      json: async () => ({
        email: 'pwn@example.com',
        fullName: 'Pwn',
        roleIds: ['role-1'],
      }),
      payload: { iam: { api: { createSharedUser } } } as never,
    } as never)
    expect(res.status).toBe(403)
    expect(createSharedUser).not.toHaveBeenCalled()
  })
})
