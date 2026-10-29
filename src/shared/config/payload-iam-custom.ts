import type { RbacRegisterTab } from '#iam/types/config'

export type PayloadIamLoginCustom = {
  emailAndPassword?: boolean
  google?: boolean
  loginOtp?: boolean
  forgotPassword?: boolean
  length?: number
}

/** `config.custom.payloadIam` — runtime plugin flags (not i18n). */
export type PayloadIamCustom = {
  login?: PayloadIamLoginCustom
  register?: RbacRegisterTab[]
}

export function readPayloadIamCustom(
  custom: Record<string, unknown> | undefined
): PayloadIamCustom | undefined {
  const value = custom?.payloadIam
  if (!value || typeof value !== 'object') return undefined
  return value as PayloadIamCustom
}
