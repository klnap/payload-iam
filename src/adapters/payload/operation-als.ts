import { AsyncLocalStorage } from 'node:async_hooks'

/** Closed discriminated union — no open index. HTTP body markers MUST be ignored. */
export type InternalOperation =
  | {
      kind: 'ROLE_PERMISSIONS_UPDATE'
      model: 'roles'
      targetId: string
      fields: readonly ['permissions']
    }
  | {
      kind: 'ROLE_ROOT_UPDATE'
      model: 'roles'
      targetId: string
      fields: readonly ['name']
    }
  | { kind: 'ROLE_DELETE'; model: 'roles'; targetId: string; fields: readonly [] }
  | {
      kind: 'ROLE_CREATE'
      model: 'roles'
      targetId: string
      fields: readonly string[]
    }
  | {
      kind: 'USER_ROLES_UPDATE'
      model: 'users'
      targetId: string
      fields: readonly ['roles']
    }
  | {
      kind: 'USER_ACTIVE_UPDATE'
      model: 'users'
      targetId: string
      fields: readonly ['isActive']
    }
  | {
      kind: 'USER_CREATE'
      model: 'users'
      targetId: string
      fields: readonly string[]
      provisioningOperationId?: string
    }
  | {
      kind: 'USER_PROVISIONING_UPDATE'
      model: 'users'
      targetId: string
      fields: readonly ['isActive', 'provisioningStatus']
    }
  | {
      kind: 'USER_PROVISIONING_FINALIZE'
      model: 'users'
      targetId: string
      fields: readonly ['roles', 'isActive', 'provisioningStatus']
    }
  | { kind: 'USER_DELETE'; model: 'users'; targetId: string; fields: readonly [] }
  | {
      kind: 'USER_PROFILE_UPDATE'
      model: 'users'
      targetId: string
      fields: readonly string[]
    }
  | {
      kind: 'INVITATION_ISSUE'
      model: 'invitations'
      targetId: string
      fields: readonly string[]
    }
  | {
      kind: 'INVITATION_RESEND'
      model: 'invitations'
      targetId: string
      fields: readonly string[]
    }
  | {
      kind: 'INVITATION_ACCEPT_PROVISION'
      model: 'invitations'
      targetId: string
      fields: readonly string[]
      userId?: string
      provisioningOperationId?: string
    }
  | {
      kind: 'INVITATION_REVOKE'
      model: 'invitations'
      targetId: string
      fields: readonly string[]
    }
  | {
      kind: 'INVITATION_EXPIRE'
      model: 'invitations'
      targetId: string
      fields: readonly string[]
    }
  | {
      kind: 'INVITATION_ROLES_UPDATE'
      model: 'invitations'
      targetId: string
      fields: readonly ['authorizedRoleIds']
    }
  | {
      kind: 'PUBLISH'
      model: string
      targetId: string
      fields: readonly string[]
    }
  | { kind: 'RECONCILE_REPAIR'; model?: string; targetId?: string }
  | { kind: 'BOOTSTRAP'; userId?: string; provisioningOperationId?: string }
  | {
      kind: 'SET_PASSWORD'
      userId: string
      provisioningOperationId?: string
    }
  | {
      kind: 'SET_PASSWORD_EMAIL'
      userId: string
    }
  | {
      kind: 'CHANGE_PASSWORD'
      userId: string
    }
  | {
      kind: 'FIRST_GOOGLE'
      userId: string
      provisioningOperationId?: string
    }
  | {
      kind: 'AUTHENTICATED_GOOGLE_LINK'
      userId: string
      provisioningOperationId?: string
    }
  | { kind: 'OAUTH_SIGN_IN'; userId?: string }
  | {
      kind: 'FACADE_CREATE_USER'
      userId: string
      provisioningOperationId?: string
    }
  | { kind: 'FACADE_DELETE_USER'; userId: string }
  | { kind: 'GENERIC_RESET'; userId?: string }
  | {
      kind: 'GOOGLE_ACCOUNT_ROLLBACK'
      userId?: string
    }
  | { kind: 'CREDENTIAL_COMPENSATION'; userId?: string }

export type InternalOperationKind = InternalOperation['kind']

type AlsGlobal = typeof globalThis & {
  __klnapPayloadRbacOperationAls?: AsyncLocalStorage<InternalOperation>
}

/**
 * Process-wide ALS — Turbopack/HMR can re-eval this module; a fresh
 * AsyncLocalStorage would make hooks see empty store (User.create stock DENY).
 */
const g = globalThis as AlsGlobal
if (g.__klnapPayloadRbacOperationAls === undefined) {
  g.__klnapPayloadRbacOperationAls = new AsyncLocalStorage<InternalOperation>()
}
/** Private — never export from package public API */
export const PAYLOAD_RBAC_OPERATION = g.__klnapPayloadRbacOperationAls

export function getInternalOperation(): InternalOperation | undefined {
  return PAYLOAD_RBAC_OPERATION.getStore()
}

/** Payload local API `context` key — survives when ALS is lost across Turbopack chunks. */
export const PAYLOAD_RBAC_OP_CONTEXT_KEY = 'payloadRbacOp' as const

export type PayloadRbacOpContext = {
  [PAYLOAD_RBAC_OP_CONTEXT_KEY]?: InternalOperationKind
}

/** ALS first; fall back to req.context from payload.create/update options. */
export function resolveInternalOperationKind(
  context?: Record<string, unknown> | null
): InternalOperationKind | undefined {
  const fromAls = getInternalOperation()?.kind
  if (fromAls) return fromAls
  const fromCtx = context?.[PAYLOAD_RBAC_OP_CONTEXT_KEY]
  return typeof fromCtx === 'string' ? (fromCtx as InternalOperationKind) : undefined
}

export function runWithInternalOperation<T>(
  op: InternalOperation,
  fn: () => Promise<T>
): Promise<T> {
  return PAYLOAD_RBAC_OPERATION.run(op, fn)
}
