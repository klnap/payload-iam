import { describe, expect, test } from 'bun:test'
import {
  enabledModuleDescriptors,
  ownedCollectionSlugsFor,
  RBAC_MODULE_REGISTRY,
} from '../../../src/plugin/runtime/module-registry'
import { resolveRbacModules, validateRbacModulesToggle } from '../../../src/types/modules'

describe('module registry', () => {
  test('registry lists every module id once', () => {
    const ids = RBAC_MODULE_REGISTRY.map((m) => m.id)
    expect(new Set(ids).size).toBe(ids.length)
    expect(ids.sort()).toEqual(['auth', 'bootstrap', 'invitations', 'rbac', 'users'])
  })

  test('default enables all modules', () => {
    const resolved = resolveRbacModules()
    expect(enabledModuleDescriptors(resolved)).toHaveLength(5)
    expect(ownedCollectionSlugsFor(resolved)).toEqual(new Set(['roles', 'invitations']))
  })

  test('disabling invitations drops invitations collection slug', () => {
    const resolved = validateRbacModulesToggle({ invitations: false })
    expect(ownedCollectionSlugsFor(resolved)).toEqual(new Set(['roles']))
  })
})

describe('validateRbacModulesToggle', () => {
  const secret = 's'.repeat(32)

  test('rejects disabling auth or rbac', () => {
    expect(() => validateRbacModulesToggle({ auth: false })).toThrow(/modules\.auth/)
    expect(() => validateRbacModulesToggle({ rbac: false })).toThrow(/modules\.rbac/)
  })

  test('rejects invitations without users', () => {
    expect(() => validateRbacModulesToggle({ invitations: true, users: false })).toThrow(
      /modules\.invitations requires modules\.users/
    )
  })

  test('validateIamOptions runs module validation', async () => {
    const { validateIamOptions } = await import('../../../src/plugin/validate-config')
    expect(() =>
      validateIamOptions({
        secret,
        methods: { emailAndPassword: { enabled: true } },
        modules: { rbac: false },
      })
    ).toThrow(/modules\.rbac/)
  })
})
