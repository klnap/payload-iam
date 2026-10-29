import { describe, expect, test } from 'bun:test'
import { createSendPasswordReset } from '../../../../src/modules/auth/methods/email-and-password/services/send-password-reset'
import type { HostRuntimeDeps } from '../../../../src/types/config'

describe('sendPasswordReset', () => {
  test('creates verification row and sends email under GENERIC_RESET', async () => {
    const sent: Array<{ to: string; resetUrl: string }> = []
    const verification: Array<{ identifier: string; value: string }> = []

    const host: HostRuntimeDeps = {
      appName: 'test',
      baseURL: 'http://localhost:3000',
      adminRoute: '/admin',
      database: {} as HostRuntimeDeps['database'],
      trustedOrigins: ['http://localhost:3000'],
      authMethods: {
        emailAndPassword: true,
        google: false,
        loginOtp: false,
        forgotPassword: true,
      },
      sendResetEmail: async ({ to, resetUrl }) => {
        sent.push({ to, resetUrl })
      },
      sendInviteEmail: async () => {},
      sendSetPasswordEmail: async () => {},
      sendLoginOtpEmail: async () => {},
      loginOtp: { enabled: false, length: 6 },
      getPayload: async () =>
        ({
          config: { admin: { user: 'users' } },
          findByID: async () => ({
            email: 'user@example.com',
            isActive: true,
            provisioningStatus: 'none',
          }),
        }) as never,
    }

    const facade = {
      findCredentialAccount: async () => ({ id: 'acc' }),
    }

    const auth = {
      $context: Promise.resolve({
        internalAdapter: {
          findAccounts: async () => [{ providerId: 'credential' }],
          createVerificationValue: async (row: { identifier: string; value: string }) => {
            verification.push({ identifier: row.identifier, value: row.value })
          },
        },
        adapter: {
          findMany: async () => [],
          delete: async () => {},
        },
        options: { emailAndPassword: { resetPasswordTokenExpiresIn: 3600 } },
      }),
    }

    const send = createSendPasswordReset(host, facade as never, auth)
    const result = await send({
      userId: 'user-1',
      actor: { type: 'human', userId: 'admin-1' },
    })

    expect(result).toEqual({ ok: true })
    expect(verification).toHaveLength(1)
    expect(verification[0]?.identifier.startsWith('reset-password:')).toBe(true)
    expect(verification[0]?.value).toBe('user-1')
    expect(sent).toHaveLength(1)
    expect(sent[0]?.to).toBe('user@example.com')
    expect(sent[0]?.resetUrl).toContain('/admin/reset-password#token=')
  })

  test('invalidates prior reset-password tokens before creating a new one', async () => {
    const deleted: string[] = []
    const verification: Array<{ identifier: string; value: string }> = []

    const host: HostRuntimeDeps = {
      appName: 'test',
      baseURL: 'http://localhost:3000',
      adminRoute: '/admin',
      database: {} as HostRuntimeDeps['database'],
      trustedOrigins: ['http://localhost:3000'],
      authMethods: {
        emailAndPassword: true,
        google: false,
        loginOtp: false,
        forgotPassword: true,
      },
      sendResetEmail: async () => {},
      sendInviteEmail: async () => {},
      sendSetPasswordEmail: async () => {},
      sendLoginOtpEmail: async () => {},
      loginOtp: { enabled: false, length: 6 },
      getPayload: async () =>
        ({
          config: { admin: { user: 'users' } },
          findByID: async () => ({
            email: 'user@example.com',
            isActive: true,
            provisioningStatus: 'none',
          }),
        }) as never,
    }

    const auth = {
      $context: Promise.resolve({
        internalAdapter: {
          findAccounts: async () => [{ providerId: 'credential' }],
          createVerificationValue: async (row: { identifier: string; value: string }) => {
            verification.push({ identifier: row.identifier, value: row.value })
          },
        },
        adapter: {
          findMany: async () => [
            { id: 'old-1', identifier: 'reset-password:stale' },
            { id: 'keep', identifier: '2fa-xyz' },
          ],
          delete: async (args: { where: Array<{ value: string }> }) => {
            deleted.push(args.where[0]!.value)
          },
        },
        options: { emailAndPassword: { resetPasswordTokenExpiresIn: 3600 } },
      }),
    }

    const send = createSendPasswordReset(
      host,
      { findCredentialAccount: async () => ({ id: 'acc' }) } as never,
      auth
    )
    await send({ userId: 'user-1', actor: { type: 'human', userId: 'admin-1' } })
    expect(deleted).toEqual(['old-1'])
    expect(verification).toHaveLength(1)
  })
})
