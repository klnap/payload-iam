import { describe, expect, test } from 'bun:test'
import { parseUserAgent } from '../../../../src/modules/sessions/domain/parse-user-agent'

describe('parseUserAgent', () => {
  test('returns unknown labels for empty input', () => {
    expect(parseUserAgent(null).deviceLabel).toBe('Unknown device')
    expect(parseUserAgent('').browserLabel).toBe('Unknown browser')
  })

  test('detects desktop Chrome on Windows', () => {
    const ua =
      'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
    const parsed = parseUserAgent(ua)
    expect(parsed.deviceLabel).toBe('Desktop')
    expect(parsed.browserLabel).toBe('Chrome')
    expect(parsed.osLabel).toBe('Windows')
  })

  test('detects mobile Safari on iOS', () => {
    const ua =
      'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1'
    const parsed = parseUserAgent(ua)
    expect(parsed.deviceLabel).toBe('Mobile')
    expect(parsed.browserLabel).toBe('Safari')
    expect(parsed.osLabel).toBe('iOS')
  })
})
