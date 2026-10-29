import { getPayload, type SanitizedConfig } from 'payload'
import type { IamSurface } from '#iam/types/config'
import { getRegisteredIam } from './create-runtime'
import type { PayloadWithIam } from './payload-iam-surface'

export type { PayloadWithIam } from './payload-iam-surface'

async function waitForIam(
  payload: PayloadWithIam,
  attempts = 50,
  delayMs = 50
): Promise<IamSurface> {
  for (let i = 0; i < attempts; i++) {
    if (payload.iam) return payload.iam
    try {
      return getRegisteredIam()
    } catch {
      await new Promise((r) => setTimeout(r, delayMs))
    }
  }
  return getRegisteredIam()
}

export async function getPayloadIam(
  config: Promise<SanitizedConfig> | SanitizedConfig
): Promise<PayloadWithIam> {
  const payload = (await getPayload({
    config: config as SanitizedConfig,
  })) as PayloadWithIam

  if (!payload.iam) {
    payload.iam = await waitForIam(payload)
  }
  return payload
}
