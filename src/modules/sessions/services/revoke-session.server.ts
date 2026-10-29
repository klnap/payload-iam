'use server'

import config from '@payload-config'
import { getPayload } from 'payload'
import { requireIamSurface } from '#iam/plugin/runtime/payload-iam-surface'

export async function revokeAdminUserSession(args: {
  token: string
  userId: string
}): Promise<void> {
  const payload = await getPayload({ config })
  const iam = requireIamSurface(payload)
  await iam.api.revokeUserSession({ targetUserId: args.userId, token: args.token })
}
