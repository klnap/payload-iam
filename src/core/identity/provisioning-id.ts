import { createHash } from 'node:crypto'

/** Namespaced retry identity — both forms ALWAYS produce operationId. */
export function provisioningOperationIdFromKey(callerId: string, idempotencyKey: string): string {
  return createHash('sha256').update(`${callerId}:${idempotencyKey}`).digest('hex')
}

export function provisioningOperationIdFromUserId(callerId: string, userId: string): string {
  return createHash('sha256').update(`${callerId}:userId:${userId}`).digest('hex')
}

export function provisioningRequestHash(args: {
  email: string
  fullName: string
  roleIds: readonly string[]
}): string {
  const roles = [...args.roleIds].sort((a, b) => a.localeCompare(b)).join(',')
  return createHash('sha256')
    .update(
      JSON.stringify({
        email: args.email,
        fullName: args.fullName,
        roles,
      })
    )
    .digest('hex')
}
