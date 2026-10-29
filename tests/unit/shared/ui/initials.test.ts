import { describe, expect, test } from 'bun:test'
import { getInitials } from '../../../../src/shared/ui/admin/initials'

describe('getInitials', () => {
  test('first letter upper from name', () => {
    expect(getInitials('Klaudiusz')).toBe('K')
    expect(getInitials('  anna ')).toBe('A')
  })

  test('email local-part first letter', () => {
    expect(getInitials('kl.napierala@gmail.com')).toBe('K')
  })

  test('empty → ?', () => {
    expect(getInitials('')).toBe('?')
    expect(getInitials('   ')).toBe('?')
  })
})
