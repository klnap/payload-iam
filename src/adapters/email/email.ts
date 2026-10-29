/** ASCII lowercase + trim only (not RFC canonical) */
export function normalizeEmail(email: string): string {
  return email.trim().toLowerCase()
}

export function assertNormalizedEmail(email: string): string {
  const n = normalizeEmail(email)
  if (n !== email.trim().toLowerCase() || n.length === 0) {
    throw new Error('email must be non-empty ASCII-lowercased trimmed')
  }
  return n
}
