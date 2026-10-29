import { base64Url } from '@better-auth/utils/base64'
import { createHash } from '@better-auth/utils/hash'

/** Same algorithm as Better Auth `otpOptions.storeOTP: 'hashed'`. */
export async function hashLoginOtpForStorage(code: string): Promise<string> {
  const hash = await createHash('SHA-256').digest(new TextEncoder().encode(code))
  return base64Url.encode(new Uint8Array(hash), { padding: false })
}
