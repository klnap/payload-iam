/** Shared invite / bootstrap password rules — enforce client + server. */
export const PASSWORD_MIN_LENGTH = 12

export function passwordPolicyMessage(): string {
  return `At least ${PASSWORD_MIN_LENGTH} characters, with upper, lower, number, and symbol`
}

export function isStrongPassword(password: string): boolean {
  if (password.length < PASSWORD_MIN_LENGTH) return false
  if (!/[a-z]/.test(password)) return false
  if (!/[A-Z]/.test(password)) return false
  if (!/\d/.test(password)) return false
  if (!/[^A-Za-z0-9]/.test(password)) return false
  return true
}

const PASSWORD_ALPHABET = 'abcdefghijkmnopqrstuvwxyzABCDEFGHJKLMNPQRSTUVWXYZ23456789!@#$%^&*-_'

function fillRandomBytes(bytes: Uint8Array): void {
  globalThis.crypto.getRandomValues(bytes)
}

/** Cryptographically random password that always passes isStrongPassword. */
export function generateStrongPassword(length = 16): string {
  const size = Math.max(length, PASSWORD_MIN_LENGTH)
  const bytes = new Uint8Array(size)
  fillRandomBytes(bytes)
  const chars = Array.from(bytes, (b) => PASSWORD_ALPHABET[b % PASSWORD_ALPHABET.length]!)
  const lower = 'abcdefghijkmnopqrstuvwxyz'
  const upper = 'ABCDEFGHJKLMNPQRSTUVWXYZ'
  const digit = '23456789'
  const symbol = '!@#$%^&*-_'
  const pick = (set: string) => {
    const b = new Uint8Array(1)
    fillRandomBytes(b)
    return set[b[0]! % set.length]!
  }
  chars[0] = pick(lower)
  chars[1] = pick(upper)
  chars[2] = pick(digit)
  chars[3] = pick(symbol)
  for (let i = chars.length - 1; i > 0; i--) {
    const b = new Uint8Array(1)
    fillRandomBytes(b)
    const j = b[0]! % (i + 1)
    const tmp = chars[i]!
    chars[i] = chars[j]!
    chars[j] = tmp
  }
  return chars.join('')
}

/** Resolve password for accept/bootstrap: use provided or generate server-side. */
export function resolveProvisionPassword(password: string | undefined): {
  password: string
  generated: boolean
} {
  const trimmed = password?.trim() ?? ''
  if (trimmed) {
    if (!isStrongPassword(trimmed)) {
      throw new Error(passwordPolicyMessage())
    }
    return { password: trimmed, generated: false }
  }
  return { password: generateStrongPassword(16), generated: true }
}
