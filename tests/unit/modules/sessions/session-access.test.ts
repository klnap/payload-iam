import { describe, expect, test } from 'bun:test'
import {
  canListUserSessions,
  canRevokeUserSession,
} from '../../../../src/modules/sessions/access/can-manage-user-sessions'

const rootAdmin = {
  id: 'u1',
  authChannel: 'ba-admin-session',
  roles: [{ name: 'Root' }],
} as never

const juniorWithUsersUpdate = {
  id: 'u2',
  authChannel: 'ba-admin-session',
  roles: [
    {
      name: 'Junior',
      permissions: {
        collections: {
          users: { read: true, update: true },
        },
      },
    },
  ],
} as never

const peerJunior = {
  id: 'u9',
  roles: [
    {
      name: 'Junior',
      permissions: {
        collections: {
          users: { read: true, update: true },
        },
      },
    },
  ],
}

const elevatedTarget = {
  id: 'u-root',
  roles: [{ name: 'Root' }],
}

describe('session access', () => {
  test('self can list own sessions', () => {
    expect(
      canListUserSessions({
        actor: rootAdmin,
        targetUserId: 'u1',
        usersCollectionSlug: 'users',
      })
    ).toBe(true)
  })

  test('admin with users update can list peer sessions within ceiling', () => {
    expect(
      canListUserSessions({
        actor: juniorWithUsersUpdate,
        targetUserId: 'u9',
        usersCollectionSlug: 'users',
        target: peerJunior,
      })
    ).toBe(true)
  })

  test('denies other-user sessions without target doc (no ceiling check)', () => {
    expect(
      canListUserSessions({
        actor: juniorWithUsersUpdate,
        targetUserId: 'u9',
        usersCollectionSlug: 'users',
      })
    ).toBe(false)
  })

  test('denies listing sessions for a higher-privilege target', () => {
    expect(
      canListUserSessions({
        actor: juniorWithUsersUpdate,
        targetUserId: 'u-root',
        usersCollectionSlug: 'users',
        target: elevatedTarget,
      })
    ).toBe(false)
  })

  test('denies without admin panel session', () => {
    expect(
      canListUserSessions({
        actor: { id: 'u1' } as never,
        targetUserId: 'u1',
        usersCollectionSlug: 'users',
      })
    ).toBe(false)
  })

  test('revoke follows list rules', () => {
    expect(
      canRevokeUserSession({
        actor: rootAdmin,
        targetUserId: 'u1',
        usersCollectionSlug: 'users',
      })
    ).toBe(true)
  })
})
