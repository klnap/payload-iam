import { resolveLoginOtpFromOptions } from '#iam/modules/auth/methods/email-and-password/config/login-otp.config'
import type { BetterAuthHostOptions, HostRuntimeDeps, IamOptions } from '#iam/types/config'
import { validateRbacModulesToggle } from '#iam/types/modules'
import {
  isEmailAndPasswordEnabled,
  resolveGoogleMethod,
  toBetterAuthHostOptions,
} from './auth/resolve-auth-config'
import { resolveRbacRegisterConfig } from './resolve-register-config'

const FORBIDDEN_IN_BETTER_AUTH = [
  'database',
  'baseURL',
  'basePath',
  'trustedOrigins',
  'appName',
  'databaseHooks',
] as const

export function assertNoForbiddenHostAuthKeys(betterAuthOptions: Record<string, unknown>): void {
  for (const key of FORBIDDEN_IN_BETTER_AUTH) {
    if (key in betterAuthOptions && betterAuthOptions[key] != null) {
      throw new Error(`payload-iam: reserved auth key "${key}" — derived from Payload`)
    }
  }
}

export function validateSessionPolicy(session?: BetterAuthHostOptions['session']): {
  expiresIn: number
  updateAge: number
  freshAge: number
} {
  const expiresIn = typeof session?.expiresIn === 'number' ? session.expiresIn : 60 * 60 * 24 * 7
  const updateAge = typeof session?.updateAge === 'number' ? session.updateAge : 60 * 60 * 24
  const freshAge = typeof session?.freshAge === 'number' ? session.freshAge : 60 * 60 * 24
  if (expiresIn <= 0) throw new Error('session.expiresIn must be > 0')
  if (updateAge < 0) throw new Error('session.updateAge must be >= 0')
  if (freshAge <= 0) throw new Error('session.freshAge must be > 0')
  if (freshAge > expiresIn) {
    throw new Error('session.freshAge must be <= expiresIn')
  }
  return { expiresIn, updateAge, freshAge }
}

export function validateIamOptions(config: IamOptions): void {
  if (!config.secret || config.secret.length < 32) {
    throw new Error('iam: secret must be at least 32 characters')
  }
  const ba = toBetterAuthHostOptions(config)
  assertNoForbiddenHostAuthKeys(ba as unknown as Record<string, unknown>)

  const methods = config.methods
  if (
    methods?.emailAndPassword?.enabled !== undefined &&
    typeof methods.emailAndPassword.enabled !== 'boolean'
  ) {
    throw new Error('iam: methods.emailAndPassword.enabled must be a boolean')
  }
  if (
    methods?.emailAndPassword?.forgotPassword?.enabled !== undefined &&
    typeof methods.emailAndPassword.forgotPassword.enabled !== 'boolean'
  ) {
    throw new Error('iam: methods.emailAndPassword.forgotPassword.enabled must be a boolean')
  }
  if (methods?.google?.enabled !== undefined && typeof methods.google.enabled !== 'boolean') {
    throw new Error('iam: methods.google.enabled must be a boolean')
  }

  const emailOn = isEmailAndPasswordEnabled(methods)
  const googleActive = resolveGoogleMethod(methods)
  if (!emailOn && !googleActive) {
    throw new Error(
      'iam: enable methods.emailAndPassword and/or methods.google (omit `enabled` or set `enabled: true`)'
    )
  }
  if (googleActive) {
    if (!googleActive.clientId || !googleActive.clientSecret) {
      throw new Error('iam: methods.google.clientId and clientSecret required')
    }
  }
  validateSessionPolicy(ba.session)
  resolveLoginOtpFromOptions(config)
  const modules = validateRbacModulesToggle(config.modules)

  if (config.register !== undefined && !Array.isArray(config.register)) {
    throw new Error('iam: register must be an array')
  }
  if (config.models !== undefined && !Array.isArray(config.models)) {
    throw new Error('iam: models must be an array')
  }
  if (config.registerExtensions !== undefined) {
    if (
      !Array.isArray(config.registerExtensions) ||
      config.registerExtensions.some((fn) => typeof fn !== 'function')
    ) {
      throw new Error('iam: registerExtensions must be an array of functions')
    }
  }
  resolveRbacRegisterConfig(config, modules)

  if (config.email?.locale?.defaultLocale != null) {
    if (typeof config.email.locale.defaultLocale !== 'string') {
      throw new Error('iam: email.locale.defaultLocale must be a string')
    }
  }
  if (config.email?.templates != null && typeof config.email.templates !== 'object') {
    throw new Error('iam: email.templates must be an object')
  }
}

export function validateHostRuntime(config: HostRuntimeDeps): void {
  if (!config.database) throw new Error('database required')
  if (!config.getPayload) throw new Error('getPayload required')
  if (!config.withAdvisoryLocks) throw new Error('withAdvisoryLocks required')
  if (!config.dbNow) throw new Error('dbNow required')
  if (!config.baseURL) throw new Error('baseURL required')
  if (!config.trustedOrigins?.length) throw new Error('trustedOrigins required')
  if (config.trustedOrigins.includes('*')) {
    throw new Error('trustedOrigins must not include *')
  }
  if (!config.serviceTokens?.length) {
    throw new Error('serviceTokens required (from payload.secret)')
  }
  validateSessionPolicy(config.betterAuthOptions.session)
}
