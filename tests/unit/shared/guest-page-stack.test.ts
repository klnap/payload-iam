import { describe, expect, test } from 'bun:test'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import {
  guestLayoutRoot,
  guestPage,
  guestPageHeader,
} from '../../../src/shared/ui/guest/guest.styles'

describe('GuestPage compound API', () => {
  test('exports tv variants for page shell and header', () => {
    expect(guestPage()).toContain('flex')
    expect(guestPage()).toContain('gap-')
    expect(guestPageHeader()).toContain('gap-2')
    expect(guestLayoutRoot()).toContain('login')
  })

  test('guest-page exposes Header compound part', () => {
    const src = readFileSync(
      join(import.meta.dir, '../../../src/shared/ui/guest/guest-page.tsx'),
      'utf8'
    )
    expect(src).toContain('Header: GuestPageHeader')
    expect(src).toContain('guestPage({ className })')
  })

  test('back actions use guest-page-back class', () => {
    const link = readFileSync(
      join(import.meta.dir, '../../../src/shared/ui/guest/guest-page-back.tsx'),
      'utf8'
    )
    expect(link).toContain('guest-page-back')
  })
})
