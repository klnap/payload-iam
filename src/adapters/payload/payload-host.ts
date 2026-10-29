import type { HostRuntimeDeps } from '#iam/types/config'

/** Untyped Payload surface — avoids host GeneratedTypes leaking into package. */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type HostPayload = any

export async function hostPayload(host: HostRuntimeDeps): Promise<HostPayload> {
  return host.getPayload()
}
