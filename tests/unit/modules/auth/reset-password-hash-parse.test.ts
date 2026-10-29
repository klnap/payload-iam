import { describe, expect, test } from 'bun:test'

/** Mirrors client hash parsing in reset-password-token-from-hash.tsx */
function parseResetTokenFromLocation(hash: string, search: string): string | null {
  const body = hash.replace(/^#/, '').replace(/^iam/, '')
  const fromHash = new URLSearchParams(body).get('token')
  if (fromHash) return fromHash
  return new URLSearchParams(search).get('token')
}

describe('reset password token from URL', () => {
  test('reads token from #token= hash (email link)', () => {
    expect(parseResetTokenFromLocation('#token=abc123', '')).toBe('abc123')
  })

  test('reads token from query when hash empty', () => {
    expect(parseResetTokenFromLocation('', '?token=q')).toBe('q')
  })

  test('returns null when missing', () => {
    expect(parseResetTokenFromLocation('#other=1', '')).toBeNull()
  })
})
