/** CSPRNG bytes — Web Crypto (Workers + Node 18+) without `node:crypto`. */
export function randomBytes(length: number): Uint8Array {
  const bytes = new Uint8Array(length)
  globalThis.crypto.getRandomValues(bytes)
  return bytes
}

/** Same shape as `randomBytes(n).toString('base64url')` on Node `Buffer`. */
export function randomBytesBase64Url(length: number): string {
  return Buffer.from(randomBytes(length)).toString('base64url')
}
