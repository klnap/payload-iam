import { describe, expect, test } from 'bun:test'
import { normalizeEmail } from '../../src/adapters/email/email'
import { assertUuidV7, newId } from '../../src/core/identity/ids'

describe('Gate E — ID + email', () => {
  test('newId is UUIDv7 never v4', () => {
    for (let i = 0; i < 20; i++) {
      const id = newId()
      assertUuidV7(id)
      expect(id[14]).toBe('7')
    }
  })

  test('email normalize is ASCII lower+trim', () => {
    expect(normalizeEmail('  Foo@Bar.COM ')).toBe('foo@bar.com')
  })
})
