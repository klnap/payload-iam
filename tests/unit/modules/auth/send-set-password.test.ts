import { describe, expect, test } from 'bun:test'
import { createSendSetPassword } from '../../../../src/modules/auth/methods/email-and-password/services/send-set-password'
import type { HostRuntimeDeps } from '../../../../src/types/config'

describe('sendSetPassword', () => {
  test('creates set-password verification and sends email', async () => {
    const sent: Array<{ to: string; setPasswordUrl: string }> = []
    const verification: Array<{ identifier: string; value: string }> = []

    const host: HostRuntimeDeps = {
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
      sendResetEmail: async () => {},
      sendSetPasswordEmail: async ({ to, setPasswordUrl }) => {
        sent.push({ to, setPasswordUrl })
      },
      sendInviteEmail: async () => {},
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
      findCredentialAccount: async () => null,
    }

    const auth = {
      $context: Promise.resolve({
        internalAdapter: {
          findAccounts: async () => [{ providerId: 'google' }],
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

    const send = createSendSetPassword(host, facade as never, auth)
    const result = await send({
      userId: 'user-1',
      actor: { type: 'human', userId: 'admin-1' },
    })

    expect(result).toEqual({ ok: true })
    expect(verification[0]?.identifier.startsWith('set-password:')).toBe(true)
    expect(sent[0]?.setPasswordUrl).toContain('/admin/set-password#token=')
  })

  test('rejects users who already have a credential', async () => {
    const host: HostRuntimeDeps = {
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
      sendResetEmail: async () => {},
      sendSetPasswordEmail: async () => {},
      sendInviteEmail: async () => {},
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

    const facade = { findCredentialAccount: async () => ({ id: 'acc' }) }
    const auth = {
      $context: Promise.resolve({
        internalAdapter: {
          findAccounts: async () => [{ providerId: 'credential' }],
          createVerificationValue: async () => {},
        },
        options: {},
      }),
    }

    const send = createSendSetPassword(host, facade as never, auth)
    await expect(
      send({ userId: 'user-1', actor: { type: 'human', userId: 'admin-1' } })
    ).rejects.toThrow('credential already exists')
  })
})
