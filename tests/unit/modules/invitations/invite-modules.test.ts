import { describe, expect, test } from 'bun:test'
import { validateRbacModulesToggle } from '../../../../src/types/modules'

describe('validateRbacModulesToggle — invitations', () => {
  test('rejects invitations without users', () => {
    expect(() => validateRbacModulesToggle({ invitations: true, users: false })).toThrow(
      /invitations requires modules.users/
    )
  })

  test('allows invitations with users enabled', () => {
    expect(validateRbacModulesToggle({ invitations: true, users: true }).invitations).toBe(true)
  })
})
