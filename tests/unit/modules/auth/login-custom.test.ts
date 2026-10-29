import { describe, expect, test } from 'bun:test'
import { resolveLoginCustom } from '../../../../src/modules/auth/ui/hooks/login-custom'

function payloadWithLogin(login: Record<string, unknown>, adminRoutes?: Record<string, string>) {
  return {
    config: {
      custom: { payloadIam: { login } },
      admin: { routes: adminRoutes },
    },
  } as never
}

describe('resolveLoginCustom', () => {
  test('omits forgotRoute when forgotPassword disabled in custom config', () => {
    const resolved = resolveLoginCustom(
      payloadWithLogin({ emailAndPassword: true, forgotPassword: false }, { forgot: '/forgot' })
    )
    expect(resolved.forgotPassword).toBe(false)
    expect(resolved.forgotRoute).toBeUndefined()
  })

  test('exposes forgotRoute when forgot enabled and admin route registered', () => {
    const resolved = resolveLoginCustom(
      payloadWithLogin({ emailAndPassword: true, forgotPassword: true }, { forgot: '/forgot' })
    )
    expect(resolved.forgotPassword).toBe(true)
    expect(resolved.forgotRoute).toBe('/forgot')
  })
})
