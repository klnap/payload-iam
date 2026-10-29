import { describe, expect, test } from 'bun:test'
import { hashLoginOtpForStorage } from '../../../../src/adapters/better-auth/login-otp-hash'

describe('hashLoginOtpForStorage', () => {
  test('is deterministic for the same code', async () => {
    const a = await hashLoginOtpForStorage('123456')
    const b = await hashLoginOtpForStorage('123456')
    expect(a).toBe(b)
    expect(a).not.toBe('123456')
  })
})
