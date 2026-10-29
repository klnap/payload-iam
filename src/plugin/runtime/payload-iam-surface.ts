import type { Payload } from 'payload'
import type { IamSurface } from '#iam/types/config'

export type PayloadWithIam = Payload & { iam: IamSurface }

export function readIamSurface(payload: Payload): IamSurface | undefined {
  return (payload as Payload & { iam?: IamSurface }).iam
}

export function requireIamSurface(payload: Payload): IamSurface {
  const iam = readIamSurface(payload)
  if (!iam) {
    throw new Error('payload.iam missing — is iam() plugin wired?')
  }
  return iam
}
