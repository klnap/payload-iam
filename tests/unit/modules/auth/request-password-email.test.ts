import { describe, expect, test } from 'bun:test'
import { createRequestPasswordEmail } from '../../../../src/modules/auth/methods/email-and-password/services/request-password-email'
import type { HostRuntimeDeps } from '../../../../src/types/config'

function baseHost(findDocs: unknown[]): HostRuntimeDeps {
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
    sendResetEmail: async () => {},
    sendSetPasswordEmail: async () => {},
    sendInviteEmail: async () => {},
    sendLoginOtpEmail: async () => {},
    loginOtp: { enabled: false, length: 6 },
    getPayload: async () =>
      ({
        config: { admin: { user: 'users' } },
        find: async () => ({ docs: findDocs }),
      }) as never,
  }
}

describe('requestPasswordEmail', () => {
  test('sends set-password email for oauth-only user', async () => {
    let kind: 'reset' | 'set' | null = null
    const host = baseHost([
      { id: 'u1', email: 'oauth@example.com', isActive: true, provisioningStatus: 'none' },
    ])
    const facade = { findCredentialAccount: async () => null }
    const auth = {
      $context: Promise.resolve({
        internalAdapter: {
          findAccounts: async () => [{ providerId: 'google' }],
        },
      }),
    }
    const request = createRequestPasswordEmail(host, facade as never, auth, {
      sendPasswordReset: async () => {
        kind = 'reset'
      },
      sendSetPassword: async () => {
        kind = 'set'
      },
    })

    await request({ email: 'oauth@example.com' })
    expect(kind).toBe('set')
  })

  test('sends reset email when credential exists', async () => {
    let kind: 'reset' | 'set' | null = null
    const host = baseHost([
      { id: 'u1', email: 'pw@example.com', isActive: true, provisioningStatus: 'none' },
    ])
    const facade = { findCredentialAccount: async () => ({ id: 'acc' }) }
    const auth = {
      $context: Promise.resolve({
        internalAdapter: {
          findAccounts: async () => [{ providerId: 'credential' }],
        },
      }),
    }
    const request = createRequestPasswordEmail(host, facade as never, auth, {
      sendPasswordReset: async () => {
        kind = 'reset'
      },
      sendSetPassword: async () => {
        kind = 'set'
      },
    })

    await request({ email: 'pw@example.com' })
    expect(kind).toBe('reset')
  })

  test('rejects when forgot password disabled on host', async () => {
    const host = baseHost([
      { id: 'u1', email: 'pw@example.com', isActive: true, provisioningStatus: 'none' },
    ])
    host.authMethods.forgotPassword = false
    const request = createRequestPasswordEmail(
      host,
      { findCredentialAccount: async () => null },
      {
        $context: Promise.resolve({ internalAdapter: { findAccounts: async () => [] } }),
      } as never,
      {
        sendPasswordReset: async () => {},
        sendSetPassword: async () => {},
      }
    )

    await expect(request({ email: 'pw@example.com' })).rejects.toThrow('forgot password disabled')
  })
})
