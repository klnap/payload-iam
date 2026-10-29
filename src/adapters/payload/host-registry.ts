import type { HostRuntimeDeps } from '#iam/types/config'

type HostRegistryGlobal = typeof globalThis & {
  __klnapPayloadIamHost?: HostRuntimeDeps
}

const g = globalThis as HostRegistryGlobal

/** Survive Turbopack/HMR module re-eval (Payload singleton stays; module lets do not). */
export function setRegisteredHost(host: HostRuntimeDeps): void {
  g.__klnapPayloadIamHost = host
}

/** Internal — serialized root bootstrap and reconcile paths. */
export function getRegisteredHost(): HostRuntimeDeps {
  const host = g.__klnapPayloadIamHost
  if (!host) {
    throw new Error('payload-iam: host not initialized — wait for Payload onInit')
  }
  return host
}
