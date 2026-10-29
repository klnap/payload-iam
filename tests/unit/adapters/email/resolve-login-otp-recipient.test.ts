import { describe, expect, test } from 'bun:test'
import { resolveLoginOtpRecipient } from '../../../../src/adapters/email/resolve-login-otp-recipient'
import type { HostRuntimeDeps } from '../../../../src/types/config'

function hostWithFind(email: string | undefined): HostRuntimeDeps {
  return {
    getPayload: async () => ({
      config: { admin: { user: 'users' } },
      find: async () => ({ docs: email ? [{ email }] : [] }),
    }),
  } as HostRuntimeDeps
}

describe('resolveLoginOtpRecipient', () => {
  test('prefers auth email when present', async () => {
    const host = hostWithFind('fallback@example.com')
    await expect(resolveLoginOtpRecipient(host, 'u1', '  Sign-In@Example.com ')).resolves.toBe(
      'sign-in@example.com'
    )
  })

  test('loads email from Payload users when auth email missing', async () => {
    const host = hostWithFind('from-payload@example.com')
    await expect(resolveLoginOtpRecipient(host, 'u1', null)).resolves.toBe(
      'from-payload@example.com'
    )
  })

  test('returns null when no email anywhere', async () => {
    const host = hostWithFind(undefined)
    await expect(resolveLoginOtpRecipient(host, 'u1', '')).resolves.toBeNull()
  })
})
