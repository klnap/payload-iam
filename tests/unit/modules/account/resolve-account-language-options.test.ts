import { describe, expect, test } from 'bun:test'
import { resolveAccountLanguageOptions } from '../../../../src/modules/account/services/load-account-overview-context'

describe('resolveAccountLanguageOptions', () => {
  test('keeps host list when multiple languages configured', () => {
    const host = [
      { label: 'English', value: 'en' },
      { label: 'Français', value: 'fr' },
    ]
    expect(resolveAccountLanguageOptions(host)).toEqual(host)
  })

  test('passes through a single host language without IAM overrides', () => {
    const host = [{ label: 'English', value: 'en' }]
    expect(resolveAccountLanguageOptions(host)).toEqual(host)
  })

  test('passes through empty list when Payload exposes no admin languages', () => {
    expect(resolveAccountLanguageOptions([])).toEqual([])
  })
})
