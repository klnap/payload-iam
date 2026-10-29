/**
 * Security regression suite — AppSec remediations that must not regress.
 */
import { describe, expect, test } from 'bun:test'
import { buildDatabaseHooks } from '../../src/adapters/better-auth/hooks'
import { runWithInternalOperation } from '../../src/adapters/payload/operation-als'
import { PASSWORD_MIN_LENGTH } from '../../src/core/identity/password-policy'
import { BA_ADMIN_SESSION_CHANNEL } from '../../src/modules/auth/config/auth-channel'
import { createChangePassword } from '../../src/modules/auth/methods/email-and-password/services/change-password'
import { createCompleteSetPassword } from '../../src/modules/auth/methods/email-and-password/services/complete-set-password'
import { createSetPassword } from '../../src/modules/auth/methods/email-and-password/services/set-password'
import { createInvitationsCollection } from '../../src/modules/invitations/collections/invitations.collection'
import { createRolesCollection } from '../../src/modules/rbac/collections/roles.collection'
import { ROLE_OUTSIDE_CEILING } from '../../src/modules/rbac/domain/ceiling'
import { patchOwnedUsersCollection } from '../../src/modules/users/collections/patch-owned-users-collection'
import { composeBetterAuthOptions } from '../../src/plugin/auth/compose-auth-options'
import type { HostRuntimeDeps } from '../../src/types/config'

const editor = {
  id: 'ed',
  type: 'human',
  isActive: true,
  provisioningStatus: 'none',
  authChannel: BA_ADMIN_SESSION_CHANNEL,
  roles: [
    {
      name: 'Editor',
      permissions: {
        collections: {
          projects: { read: true, update: true },
          roles: { update: true },
        },
      },
    },
  ],
}

function minimalHost(overrides: Partial<HostRuntimeDeps> = {}): HostRuntimeDeps {
  return {
    appName: 'test',
    baseURL: 'http://localhost:3000',
    adminRoute: '/admin',
    database: {} as HostRuntimeDeps['database'],
    trustedOrigins: ['http://localhost:3000'],
    authMethods: {
      emailAndPassword: true,
      google: true,
      loginOtp: false,
      forgotPassword: true,
    },
    loginOtp: { enabled: false, length: 6 },
    sendResetEmail: async () => {},
    sendInviteEmail: async () => {},
    sendSetPasswordEmail: async () => {},
    sendLoginOtpEmail: async () => {},
    getPayload: async () =>
      ({
        findByID: async () => ({ isActive: true, email: 'u@example.com' }),
        find: async () => ({ docs: [] }),
      }) as never,
    betterAuthOptions: {
      secret: 'x'.repeat(32),
      socialProviders: {
        google: { clientId: 'cid', clientSecret: 'csec' },
      },
      account: {
        accountLinking: {
          disableImplicitLinking: false,
          allowDifferentEmails: true,
          requireLocalEmailVerified: false,
        },
      },
      emailAndPassword: { minPasswordLength: 4 },
    },
    ...overrides,
  } as HostRuntimeDeps
}

describe('security regressions — users lifecycle', () => {
  const users = patchOwnedUsersCollection(
    {
      slug: 'users',
      fields: [
        { name: 'email', type: 'email' },
        { name: 'roles', type: 'relationship', relationTo: 'roles', hasMany: true },
      ],
      access: {},
    } as never,
    {
      usersSlug: 'users',
      loginFlags: { forgotPassword: true, google: false, emailAndPassword: true },
    }
  )
  const beforeChange = users.hooks?.beforeChange?.at(-1)
  if (!beforeChange || typeof beforeChange !== 'function') {
    throw new Error('expected users beforeChange hook')
  }

  test('denies role changes while provisioning', async () => {
    await expect(
      beforeChange({
        operation: 'update',
        data: { roles: ['role-a'] },
        originalDoc: {
          email: 'u@example.com',
          roles: ['role-b'],
          provisioningStatus: 'provisioning',
        },
        req: { user: editor, payload: { findByID: async () => ({ name: 'Editor' }) } },
      } as never)
    ).rejects.toThrow(/provisioning/i)
  })

  test('scrubs provisioningStatus mass-assignment without ALS', async () => {
    const out = (await beforeChange({
      operation: 'update',
      data: {
        isActive: true,
        provisioningStatus: 'provisioning',
        provisioningOperationId: 'evil',
        provisioningRequestHash: 'evil',
      },
      originalDoc: {
        email: 'u@example.com',
        roles: ['role-a'],
        provisioningStatus: 'none',
      },
      req: { user: editor, payload: {} },
    } as never)) as Record<string, unknown>
    expect(out.provisioningStatus).toBeUndefined()
    expect(out.provisioningOperationId).toBeUndefined()
    expect(out.provisioningRequestHash).toBeUndefined()
    expect(out.isActive).toBe(true)
    expect(out.email).toBe('u@example.com')
  })
})

describe('security regressions — Google account.create', () => {
  const hooks = buildDatabaseHooks({
    host: {
      ...minimalHost(),
      payloadPool: {
        query: async () => ({ rows: [] }),
      },
    } as never,
    authApi: null,
  })
  const before = hooks.account.create.before

  test('denies Google account create without ALS (no implicit link)', async () => {
    const result = await before({
      providerId: 'google',
      userId: 'user-1',
      accountId: 'g-1',
    })
    expect(result).toBe(false)
  })

  test('allows Google account create on OAuth callback for provisioned credential user', async () => {
    const host = {
      ...minimalHost(),
      payloadPool: {
        query: async (sql: string) => {
          if (sql.includes("'credential'")) return { rows: [{ ok: 1 }] }
          if (sql.includes("'google'")) return { rows: [] }
          return { rows: [] }
        },
      },
      getPayload: async () =>
        ({
          findByID: async () => ({ isActive: true, provisioningStatus: 'none' }),
        }) as never,
    } as never
    const oauthHooks = buildDatabaseHooks({ host, authApi: null })
    const oauthBefore = oauthHooks.account.create.before

    const result = await oauthBefore(
      {
        providerId: 'google',
        userId: 'user-1',
        accountId: 'g-1',
      },
      { path: '/callback/google' }
    )
    expect(result).not.toBe(false)
    expect(result).toMatchObject({
      data: expect.objectContaining({
        providerId: 'google',
        payloadRbacProvisioningId: expect.any(String),
      }),
    })
  })

  test('allows Google account create under FIRST_GOOGLE ALS', async () => {
    const result = await runWithInternalOperation(
      {
        kind: 'FIRST_GOOGLE',
        userId: 'user-1',
        provisioningOperationId: 'prov-1',
      },
      async () =>
        before({
          providerId: 'google',
          userId: 'user-1',
          accountId: 'g-1',
        })
    )
    expect(result).not.toBe(false)
    expect(result).toMatchObject({
      data: expect.objectContaining({
        providerId: 'google',
        payloadRbacProvisioningId: 'prov-1',
      }),
    })
  })
})

describe('security regressions — password policy gates', () => {
  const weak = 'password123'
  const strong = 'GoodPassw0rd!x'

  test('setPassword rejects weak password', async () => {
    const setPassword = createSetPassword(minimalHost(), {
      findCredentialAccount: async () => null,
      hashPassword: async () => 'hash',
      createCredentialAccount: async () => ({ id: 'a' }),
    } as never)
    await expect(setPassword({ userId: 'u1', password: weak })).rejects.toThrow(
      String(PASSWORD_MIN_LENGTH)
    )
  })

  test('changePassword rejects weak new password', async () => {
    const changePassword = createChangePassword(
      minimalHost(),
      { findCredentialAccount: async () => ({ id: 'acc' }) } as never,
      {
        api: {
          changePassword: async () => ({}),
        },
      }
    )
    await expect(
      changePassword({
        userId: 'u1',
        currentPassword: strong,
        newPassword: weak,
        headers: new Headers(),
      })
    ).rejects.toThrow(String(PASSWORD_MIN_LENGTH))
  })

  test('completeSetPassword rejects weak password before consuming token', async () => {
    let deleted = 0
    const complete = createCompleteSetPassword(
      minimalHost(),
      { findCredentialAccount: async () => null } as never,
      {
        $context: Promise.resolve({
          internalAdapter: {
            findVerificationValue: async () => ({
              value: 'user-1',
              expiresAt: new Date(Date.now() + 60_000),
            }),
            deleteVerificationByIdentifier: async () => {
              deleted += 1
            },
            findAccounts: async () => [],
          },
        }),
      },
      async () => ({ status: true })
    )
    await expect(complete({ token: 'tok', password: weak })).rejects.toThrow(
      String(PASSWORD_MIN_LENGTH)
    )
    expect(deleted).toBe(0)
  })
})

describe('security regressions — compose auth floors', () => {
  test('allows BA implicit link attempt; DB hook gates; locks email floors and password min length', () => {
    const options = composeBetterAuthOptions({
      host: minimalHost({
        payloadPool: { query: async () => ({ rows: [] }) },
      } as never),
      acceptInvite: async () => ({}),
      completeSetPassword: async () => ({}),
      bindInviteGoogle: async () => ({ ok: true, setCookie: '' }),
      getAuthForInviteGoogle: () =>
        ({
          $context: Promise.resolve({
            internalAdapter: { findVerificationValue: async () => null },
          }),
        }) as never,
      getAuthHandler: () => async () => new Response(),
    })
    expect(options.account?.accountLinking?.disableImplicitLinking).toBe(false)
    expect(options.account?.accountLinking?.allowDifferentEmails).toBe(false)
    expect(options.account?.accountLinking?.requireLocalEmailVerified).toBe(true)
    expect(
      options.emailAndPassword && 'minPasswordLength' in options.emailAndPassword
        ? options.emailAndPassword.minPasswordLength
        : undefined
    ).toBe(PASSWORD_MIN_LENGTH)
  })

  test('hashes verification identifiers by default (password tokens not plain in DB)', () => {
    const options = composeBetterAuthOptions({
      host: minimalHost({
        payloadPool: { query: async () => ({ rows: [] }) },
      } as never),
      acceptInvite: async () => ({}),
      completeSetPassword: async () => ({}),
      bindInviteGoogle: async () => ({ ok: true, setCookie: '' }),
      getAuthForInviteGoogle: () =>
        ({
          $context: Promise.resolve({
            internalAdapter: { findVerificationValue: async () => null },
          }),
        }) as never,
      getAuthHandler: () => async () => new Response(),
    })
    const store = options.verification?.storeIdentifier
    expect(store && typeof store === 'object' && 'default' in store ? store.default : store).toBe(
      'hashed'
    )
    const overrides =
      store && typeof store === 'object' && 'overrides' in store ? store.overrides : undefined
    expect(overrides?.['2fa-']).toBe('plain')
    expect(overrides?.['trust-device-']).toBe('plain')
    expect(overrides?.['reset-password:']).toBeUndefined()
    expect(overrides?.['set-password:']).toBeUndefined()
  })
})

describe('security regressions — roles ceiling on update', () => {
  const col = createRolesCollection()
  const hook = col.hooks?.beforeChange?.[0]
  if (!hook || typeof hook !== 'function') throw new Error('expected roles beforeChange')

  test('update of higher role is denied even when wiping permissions', () => {
    expect(() =>
      hook({
        operation: 'update',
        data: { name: 'Senior', permissions: {} },
        originalDoc: {
          name: 'Senior',
          permissions: {
            collections: {
              projects: { read: true, delete: true },
              secrets: { read: true },
            },
          },
        },
        req: { user: editor, context: {} },
      } as never)
    ).toThrow(ROLE_OUTSIDE_CEILING)
  })
})

describe('security regressions — inviteLink afterRead scrub', () => {
  test('strips token= from inviteLink on read', () => {
    const col = createInvitationsCollection()
    const field = col.fields
      ?.flatMap((f) => {
        if ('fields' in f && Array.isArray(f.fields)) return f.fields
        return [f]
      })
      .find((f) => 'name' in f && f.name === 'inviteLink')
    const afterRead = field && 'hooks' in field ? field.hooks?.afterRead?.[0] : undefined
    expect(afterRead).toBeTypeOf('function')
    const scrubbed = afterRead!({
      value: 'http://localhost:3000/admin/invite/accept?id=abc&token=secret-token',
    } as never)
    expect(String(scrubbed)).not.toContain('token=')
    expect(String(scrubbed)).toContain('id=abc')
  })
})
