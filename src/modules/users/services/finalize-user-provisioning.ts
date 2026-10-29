import { findDocById } from '#iam/adapters/payload/find-doc-by-id'
import { runWithInternalOperation } from '#iam/adapters/payload/operation-als'
import { hostPayload } from '#iam/adapters/payload/payload-host'
import type { HostRuntimeDeps } from '#iam/types/config'

/** Activate a user still in invite provisioning (isActive + provisioningStatus). */
export async function finalizeUserProvisioning(
  host: HostRuntimeDeps,
  args: { userId: string; provisioningOperationId?: string }
): Promise<{ ok: true } | { error: 'not_provisioning' }> {
  const payload = await hostPayload(host)
  return runWithInternalOperation(
    {
      kind: 'USER_PROVISIONING_FINALIZE',
      model: 'users',
      targetId: args.userId,
      fields: ['roles', 'isActive', 'provisioningStatus'],
    },
    async () => {
      const user = await findDocById<{
        provisioningStatus?: string
        isActive?: boolean
        provisioningOperationId?: string
      }>(payload, { collection: 'users', id: args.userId })
      if (!user) return { error: 'not_provisioning' as const }
      if (user.provisioningStatus !== 'provisioning') {
        if (user.provisioningStatus === 'none' && user.isActive) return { ok: true as const }
        return { error: 'not_provisioning' as const }
      }
      if (
        args.provisioningOperationId &&
        user.provisioningOperationId &&
        user.provisioningOperationId !== args.provisioningOperationId
      ) {
        return { error: 'not_provisioning' as const }
      }
      await payload.update({
        collection: 'users',
        id: args.userId,
        data: {
          isActive: true,
          provisioningStatus: 'none',
        },
        overrideAccess: true,
        context: { payloadRbacOp: 'USER_PROVISIONING_FINALIZE' },
      })
      return { ok: true as const }
    }
  )
}
