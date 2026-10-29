import { describe, expect, test } from 'bun:test'
import {
  generateStrongPassword,
  isStrongPassword,
  PASSWORD_MIN_LENGTH,
  passwordPolicyMessage,
  resolveProvisionPassword,
} from '../../../../src/core/identity/password-policy'

describe('password policy', () => {
  test('message names min length', () => {
    expect(passwordPolicyMessage()).toContain(String(PASSWORD_MIN_LENGTH))
  })

  test('rejects short / missing classes', () => {
    expect(isStrongPassword('Short1!')).toBe(false)
    expect(isStrongPassword('alllowercase1!aaaa')).toBe(false)
    expect(isStrongPassword('ALLUPPERCASE1!AAAA')).toBe(false)
    expect(isStrongPassword('NoDigits!!!!aaaa')).toBe(false)
    expect(isStrongPassword('NoSymbolssss1111')).toBe(false)
  })

  test('accepts known-good password', () => {
    expect(isStrongPassword('GoodPassw0rd!x')).toBe(true)
  })

  test('resolveProvisionPassword generates when omitted', () => {
    const { password, generated } = resolveProvisionPassword(undefined)
    expect(generated).toBe(true)
    expect(isStrongPassword(password)).toBe(true)
  })

  test('generateStrongPassword always passes policy (n=50)', () => {
    for (let i = 0; i < 50; i++) {
      const pw = generateStrongPassword()
      expect(pw.length).toBeGreaterThanOrEqual(PASSWORD_MIN_LENGTH)
      expect(isStrongPassword(pw)).toBe(true)
    }
  })
})
