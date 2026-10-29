import { describe, expect, test } from 'bun:test'
import { toBetterAuthHostOptions } from '../../../src/plugin/auth/resolve-auth-config'
import {
  assertNoForbiddenHostAuthKeys,
  validateHostRuntime,
  validateIamOptions,
  validateSessionPolicy,
} from '../../../src/plugin/validate-config'

describe('validateSessionPolicy', () => {
  test('defaults and rejects freshAge > expiresIn', () => {
    const d = validateSessionPolicy(undefined)
    expect(d.expiresIn).toBe(60 * 60 * 24 * 7)
    expect(() => validateSessionPolicy({ expiresIn: 100, freshAge: 200 })).toThrow(
      /freshAge must be <= expiresIn/
    )
  })

  test('rejects non-positive expiresIn', () => {
    expect(() => validateSessionPolicy({ expiresIn: 0 })).toThrow(/expiresIn must be > 0/)
  })
})

describe('assertNoForbiddenHostAuthKeys', () => {
  test('throws on reserved keys', () => {
    expect(() => assertNoForbiddenHostAuthKeys({ database: {} as never })).toThrow(
      /reserved auth key "database"/
    )
    expect(() => assertNoForbiddenHostAuthKeys({ secret: 'x' })).not.toThrow()
  })
})

describe('toBetterAuthHostOptions', () => {
  const secret = 's'.repeat(32)

  test('defaults email+password when methods omitted', () => {
    const ba = toBetterAuthHostOptions({ secret })
    expect(ba.emailAndPassword?.enabled).toBe(true)
    expect(ba.socialProviders?.google).toBeUndefined()
  })

  test('maps google when enabled', () => {
    const ba = toBetterAuthHostOptions({
      secret,
      methods: {
        emailAndPassword: { enabled: true },
        google: { enabled: true, clientId: 'id', clientSecret: 'sec' },
      },
    })
    expect(ba.socialProviders?.google).toEqual({
      clientId: 'id',
      clientSecret: 'sec',
    })
  })

  test('defaults enabled when method objects omit enabled', () => {
    const ba = toBetterAuthHostOptions({
      secret,
      methods: {
        emailAndPassword: { otp: { length: 6 } },
        google: { clientId: 'id', clientSecret: 'sec' },
      },
    })
    expect(ba.emailAndPassword?.enabled).toBe(true)
    expect(ba.socialProviders?.google).toEqual({
      clientId: 'id',
      clientSecret: 'sec',
    })
  })

  test('omits google provider when disabled', () => {
    const ba = toBetterAuthHostOptions({
      secret,
      methods: {
        emailAndPassword: { enabled: true },
        google: { enabled: false, clientId: 'id', clientSecret: 'sec' },
      },
    })
    expect(ba.socialProviders?.google).toBeUndefined()
  })
})

describe('validateIamOptions', () => {
  const secret = 's'.repeat(32)

  test('requires secret length ≥ 32', () => {
    expect(() =>
      validateIamOptions({
        secret: 'short',
      })
    ).toThrow(/secret must be at least 32/)
  })

  test('requires email and/or google enabled', () => {
    expect(() =>
      validateIamOptions({
        secret,
        methods: {
          emailAndPassword: { enabled: false },
        },
      })
    ).toThrow(/methods\.emailAndPassword and\/or methods\.google/)
  })

  test('accepts email+password with long secret', () => {
    expect(() =>
      validateIamOptions({
        secret,
        methods: { emailAndPassword: { enabled: true } },
      })
    ).not.toThrow()
  })

  test('accepts google without explicit enabled', () => {
    expect(() =>
      validateIamOptions({
        secret,
        methods: {
          emailAndPassword: { enabled: false },
          google: { clientId: 'id', clientSecret: 'sec' },
        },
      })
    ).not.toThrow()
  })
})

describe('validateHostRuntime', () => {
  test('requires core deps and rejects wildcard origins', () => {
    expect(() => validateHostRuntime({} as never)).toThrow(/database required/)
    expect(() =>
      validateHostRuntime({
        database: {},
        getPayload: async () => ({}),
        withAdvisoryLocks: async (_locks: unknown, fn: () => unknown) => fn(),
        dbNow: async () => new Date(),
        baseURL: 'http://127.0.0.1:4000',
        trustedOrigins: ['*'],
        appName: 'x',
        betterAuthOptions: { secret: 's'.repeat(32) },
        serviceTokens: [{ id: 'payload', hash: 'x', active: true }],
      } as never)
    ).toThrow(/must not include \*/)
  })
})
