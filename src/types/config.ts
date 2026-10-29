import type { BetterAuthOptions } from 'better-auth'
import type { CollectionConfig, Plugin } from 'payload'
import type { RbacPermissionModel } from '#iam/core/rbac/register-model'
import type { ServicePrincipal } from './service-principal'

export type { ServicePrincipal } from './service-principal'

import type { SessionView } from '#iam/modules/sessions/domain/session-view'
import type { UserAuthAccountInsights } from '#iam/modules/users/domain/user-auth-account-insights'
import type { IamEmailOptions } from './email'
import type { RbacModulesToggle } from './modules'

export type {
  RbacModelFieldDef,
  RbacPermissionModel,
} from '#iam/core/rbac/register-model'
export { defineRbacModel } from '#iam/core/rbac/register-model'
export type {
  EmailRenderContext,
  IamEmailBrand,
  IamEmailCopyByKind,
  IamEmailDataByKind,
  IamEmailFontFace,
  IamEmailFontsOptions,
  IamEmailFontsResolved,
  IamEmailKind,
  IamEmailLocaleOptions,
  IamEmailLogo,
  IamEmailOptions,
  IamEmailRenderProps,
  IamEmailTemplateRegistry,
  IamEmailThemeProvider,
  IamEmailThemeResolved,
  IamInvitationEmailData,
  IamLoginOtpEmailData,
  IamResetPasswordEmailData,
  IamSetPasswordEmailData,
} from './email'

export type AuthHttpMethod = 'GET' | 'POST'

export type AuthRouteRule = {
  method: AuthHttpMethod
  path: string
}

export type AdvisoryLock =
  | { kind: 'EMAIL_PROVISION_GUARD'; email: string }
  | { kind: 'USER_LIFECYCLE_GUARD'; userId: string }
  | { kind: 'ROLE_GUARD'; roleId: string }
  | { kind: 'AUTHZ_ROOT_GUARD' }

export type Actor =
  | { type: 'human'; userId: string }
  | { type: 'service'; id: string }
  | { type: 'system'; reason: string }

export type ServiceTokenRecord = {
  id: string
  hash: string
  active: boolean
  expiresAt?: Date | null
}

/**
 * Keys Payload / this plugin own — do not pass them.
 * Derived: appName, baseURL, trustedOrigins, database, basePath, databaseHooks.
 */
export type BetterAuthOwnedKeys =
  | 'appName'
  | 'baseURL'
  | 'basePath'
  | 'trustedOrigins'
  | 'database'
  | 'databaseHooks'

/** @internal — composed for Better Auth; use `IamOptions` at the host. */
export type BetterAuthHostOptions = Omit<BetterAuthOptions, BetterAuthOwnedKeys> & {
  secret: string
}

/** Login email OTP (Better Auth two-factor OTP). Default: disabled, 6 digits when enabled. */
export type RbacLoginOtpOptions = {
  /** Default `false`. Set `true` to require email OTP after password sign-in. */
  enabled?: boolean
  /** OTP digit count when enabled. Default `6` (allowed: 4–10). */
  length?: number
}

export type RbacForgotPasswordOptions = {
  /** Default `true` when email/password sign-in is enabled. Set `false` to hide forgot-password UI and block `/request-password-reset`. */
  enabled?: boolean
}

export type RbacEmailPasswordMethod = {
  /** Default `true` when `emailAndPassword` is declared. Set `false` to disable. */
  enabled?: boolean
  otp?: RbacLoginOtpOptions
  forgotPassword?: RbacForgotPasswordOptions
}

export type RbacGoogleMethod = {
  /** Default `true` when `google` is declared. Set `false` to disable. */
  enabled?: boolean
  clientId: string
  clientSecret: string
}

/** Sign-in methods wired by the plugin. */
export type RbacAuthMethods = {
  /** Default `{ enabled: true }` when `methods` is omitted. */
  emailAndPassword?: RbacEmailPasswordMethod
  google?: RbacGoogleMethod
}

export type RbacSessionOptions = {
  expiresIn?: number
  updateAge?: number
  freshAge?: number
}

/**
 * Payload IAM plugin options (`plugins: [iam({ … })]`).
 *
 * ```ts
 * iam({
 *   secret: env.AUTH_SECRET,
 *   methods: {
 *     emailAndPassword: { otp: { enabled: true, length: 6 } },
 *     google: {
 *       clientId: env.GOOGLE_CLIENT_ID,
 *       clientSecret: env.GOOGLE_CLIENT_SECRET,
 *     },
 *   },
 * })
 * ```
 */
export type IamOptions = {
  secret: string
  methods?: RbacAuthMethods
  session?: RbacSessionOptions
  /**
   * Auth users collection (host registers it in `collections`).
   * Slug omitted → `admin.user`, then `users`.
   */
  users?: CollectionConfig
  /**
   * Register custom admin routes/views for the Role permissions matrix.
   * Each tab becomes a Roles tab; items map to `permissions.register[id]`.
   *
   * Simple route (read-only gate):
   * `{ id, label, path? }` — default op `read`.
   *
   * Full model: use `defineRbacModel()` or set `ops` / `fields` on the item.
   * Reusable models can also be passed via `models` or package `contributeRegister`.
   */
  register?: RbacRegisterTab[]
  /**
   * Permission models (same shape as register items). Grouped by `model.tab` (default `Custom`).
   * Ideal for `import { myViewModel } from '@acme/feature/rbac'`.
   */
  models?: RbacPermissionModel[]
  /**
   * Host-defined register fragments (merged after `register`, `models`, module `contributeRegister`).
   * Use for host-specific RBAC registration paths — not inside plugin modules.
   */
  registerExtensions?: ReadonlyArray<RbacRegisterExtension>
  /** Feature modules (default: all enabled). */
  modules?: RbacModulesToggle
  onAudit?: (event: Record<string, unknown>) => void
  /** Transactional email logo, locale, theme, and optional template overrides. */
  email?: IamEmailOptions
}

/** Host factory: extra Roles-matrix tabs from app integrations. */
export type RbacRegisterExtension = () => RbacRegisterTab[]

/** One Roles-matrix tab of registered admin routes. */
export type RbacRegisterTab = {
  /** Tab label on Role edit (e.g. `Other`). */
  tab: string
  items: RbacRegisterItem[]
}

/** One registered admin route / custom model row. @see RbacPermissionModel */
export type RbacRegisterItem = RbacPermissionModel

/** Internal — Payload pool + BA host options + package wiring. */
export type HostRuntimeDeps = {
  database: BetterAuthOptions['database']
  getPayload: () => Promise<any>
  withAdvisoryLocks: <T>(locks: readonly AdvisoryLock[], fn: () => Promise<T>) => Promise<T>
  dbNow: () => Promise<Date>
  consumeRateLimit: (args: {
    key: string
    limit: number
    windowMs: number
  }) => Promise<{ allowed: boolean }>
  baseURL: string
  /** Payload `routes.admin` — used for auth error → login redirect. */
  adminRoute: string
  trustedOrigins: string[]
  appName: string
  betterAuthOptions: BetterAuthHostOptions
  serviceTokens: ServiceTokenRecord[]
  sendInviteEmail: (args: { to: string; inviteUrl: string; expiresAt: Date }) => Promise<void>
  sendResetEmail: (args: { to: string; resetUrl: string; expiresAt: Date }) => Promise<void>
  sendSetPasswordEmail: (args: {
    to: string
    setPasswordUrl: string
    expiresAt: Date
  }) => Promise<void>
  sendLoginOtpEmail: (args: { to: string; otp: string; expiresInMinutes: number }) => Promise<void>
  loginOtp: {
    enabled: boolean
    length: number
  }
  authMethods: {
    emailAndPassword: boolean
    google: boolean
    loginOtp: boolean
    forgotPassword: boolean
  }
  onAudit?: (event: Record<string, unknown>) => void
}

export type IamApi = {
  createSharedUser: (input: {
    email: string
    fullName: string
    roleId?: string
    roleIds?: string[]
    actor: Actor
    id?: string
    idempotencyKey?: string
    /** Active user, no invitation (bootstrap Root Admin). */
    skipInvite?: boolean
  }) => Promise<
    { id: string; email: string } | { email: string; invitationId: string; inviteUrl: string }
  >
  deleteSharedUser: (args: { userId: string; actor: Actor }) => Promise<{ ok: boolean }>
  issueInviteReset: (args: {
    userId?: string
    email: string
    roleId?: string
    roleIds?: string[]
    actor: Actor
    reason: 'create' | 'resend'
    sendEmail?: boolean
    /** Resend target — pending or expired row. */
    invitationId?: string
  }) => Promise<{ invitationId: string; expiresAt: Date; inviteUrl: string }>
  expireInvitation: (args: { invitationId: string; actor: Actor }) => Promise<{ ok: boolean }>
  revokeInvitation: (args: { invitationId: string; actor: Actor }) => Promise<{ ok: boolean }>
  acceptInvite: (args: {
    invitationId: string
    token: string
    password?: string
    request?: Request
  }) => Promise<unknown>
  setPassword: (args: { userId: string; password: string }) => Promise<unknown>
  changePassword: (args: {
    userId: string
    currentPassword: string
    newPassword: string
    headers: Headers
  }) => Promise<unknown>
  sendPasswordReset: (args: {
    userId: string
    actor: Actor
    redirectTo?: string
  }) => Promise<{ ok: true }>
  sendSetPassword: (args: {
    userId: string
    actor: Actor
    redirectTo?: string
  }) => Promise<{ ok: true }>
  requestPasswordEmail: (args: { email: string }) => Promise<{ ok: true }>
  listUserSessions: (args: { targetUserId: string; headers: Headers }) => Promise<SessionView[]>
  revokeUserSession: (args: { targetUserId: string; token: string }) => Promise<{ ok: true }>
  revokeAllUserSessions: (args: { targetUserId: string }) => Promise<{ ok: true }>
  userHasPasswordLogin: (args: { userId: string }) => Promise<boolean>
  getUserAuthAccountInsights: (args: { userId: string }) => Promise<UserAuthAccountInsights>
  unlinkGoogleAccount: (args: { userId: string }) => Promise<{ ok: true }>
  transferRoot: (args: { targetUserId: string; actor: Actor }) => Promise<{ ok: true }>
  reconcile: () => Promise<{
    orphansPayload: string[]
    orphansBa: string[]
    repaired: string[]
    manual: string[]
    fatal: string[]
  }>
}

export type IamSurface = {
  handler: (request: Request) => Promise<Response>
  api: IamApi
}

export type PayloadIamRuntime = {
  handler: IamSurface['handler']
  payloadPlugin: Plugin
  api: IamApi
}

export type PrePayloadServiceAuth = (
  request: Request
) => Promise<ServicePrincipal | Response | null>
