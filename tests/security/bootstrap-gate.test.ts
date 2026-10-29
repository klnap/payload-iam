import { describe, expect, test } from 'bun:test'

describe('Gate E — Root Admin bootstrap gate', () => {
  test('dev allows missing Root Admin', async () => {
    const prev = process.env.NODE_ENV
    const boot = process.env.PAYLOAD_RBAC_BOOTSTRAP
    ;(process.env as { NODE_ENV?: string }).NODE_ENV = 'development'
    delete process.env.PAYLOAD_RBAC_BOOTSTRAP
    const { isRootBootstrapAllowed } = await import('../../src/modules/bootstrap/config/bootstrap')
    expect(isRootBootstrapAllowed()).toBe(true)
    ;(process.env as { NODE_ENV?: string }).NODE_ENV = prev
    if (boot !== undefined) process.env.PAYLOAD_RBAC_BOOTSTRAP = boot
  })

  test('production denies unless PAYLOAD_RBAC_BOOTSTRAP=1', async () => {
    const prev = process.env.NODE_ENV
    const boot = process.env.PAYLOAD_RBAC_BOOTSTRAP
    ;(process.env as { NODE_ENV?: string }).NODE_ENV = 'production'
    delete process.env.PAYLOAD_RBAC_BOOTSTRAP
    const { isRootBootstrapAllowed, isHttpBootstrapAllowed } = await import(
      '../../src/modules/bootstrap/config/bootstrap'
    )
    expect(isRootBootstrapAllowed()).toBe(false)
    expect(isHttpBootstrapAllowed()).toBe(false)
    process.env.PAYLOAD_RBAC_BOOTSTRAP = '1'
    expect(isRootBootstrapAllowed()).toBe(true)
    // HTTP stays closed in production even with CLI bootstrap flag.
    expect(isHttpBootstrapAllowed()).toBe(false)
    ;(process.env as { NODE_ENV?: string }).NODE_ENV = prev
    if (boot === undefined) delete process.env.PAYLOAD_RBAC_BOOTSTRAP
    else process.env.PAYLOAD_RBAC_BOOTSTRAP = boot
  })
})
