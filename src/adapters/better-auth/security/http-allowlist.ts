import { IAM_AUTH_API_BASE_PATH } from '#iam/shared/paths/auth-api-path'
import {
  buildIamAuthAllowlistRoutes,
  IAM_AUTH_ROUTE_RULES_ALL,
} from '#iam/shared/paths/auth-routes'
import type { AuthHttpMethod, AuthRouteRule } from '#iam/types/config'

export type AuthMethodFlags = {
  emailAndPassword: boolean
  google: boolean
  loginOtp: boolean
  forgotPassword: boolean
}

export const ALL_AUTH_METHODS_ENABLED: AuthMethodFlags = {
  emailAndPassword: true,
  google: true,
  loginOtp: true,
  forgotPassword: true,
}

/** @deprecated Use `IAM_AUTH_ROUTE_RULES_ALL` from `shared/paths/auth-routes`. */
export const HTTP_AUTH_ALLOWLIST: readonly AuthRouteRule[] = IAM_AUTH_ROUTE_RULES_ALL

function toAllowSet(routes: readonly AuthRouteRule[]): Set<string> {
  return new Set(routes.map((rule) => `${rule.method}:${rule.path}`))
}

const DEFAULT_ALLOW_SET = toAllowSet(IAM_AUTH_ROUTE_RULES_ALL)

/**
 * Exact METHOD + pathname allowlist (v1).
 * BA disabledPaths is path-only — package wrapper enforces method too.
 */
export function createAllowlistGate(flags: AuthMethodFlags = ALL_AUTH_METHODS_ENABLED) {
  const allowed = toAllowSet(buildIamAuthAllowlistRoutes(flags))
  return (request: Request, basePath = IAM_AUTH_API_BASE_PATH): Response | null => {
    const path = normalizeAuthPathname(request.url, basePath)
    const m = request.method.toUpperCase() as AuthHttpMethod
    if (m !== 'GET' && m !== 'POST') {
      return new Response('Not Found', { status: 404 })
    }
    if (!allowed.has(`${m}:${path}`)) {
      return new Response('Not Found', { status: 404 })
    }
    return null
  }
}

/** Normalize like BA 1.7.6 normalizePathname — strip basePath + trailing slash */
export function normalizeAuthPathname(requestUrl: string, basePath: string): string {
  let pathname: string
  try {
    pathname = new URL(requestUrl).pathname.replace(/\/+$/, '') || '/'
  } catch {
    return '/'
  }
  const normalizedBasePath = basePath.replace(/\/+$/, '')
  if (normalizedBasePath === '') return pathname
  if (pathname === normalizedBasePath) return '/'
  if (pathname.startsWith(`${normalizedBasePath}/`)) {
    return pathname.slice(normalizedBasePath.length).replace(/\/+$/, '') || '/'
  }
  return pathname
}

export function isAuthRouteAllowed(
  method: string,
  path: string,
  flags: AuthMethodFlags = ALL_AUTH_METHODS_ENABLED
): boolean {
  const m = method.toUpperCase() as AuthHttpMethod
  if (m !== 'GET' && m !== 'POST') return false
  const allowed = toAllowSet(buildIamAuthAllowlistRoutes(flags))
  return allowed.has(`${m}:${path}`)
}

export function allowlistGate(
  request: Request,
  basePath = IAM_AUTH_API_BASE_PATH
): Response | null {
  const path = normalizeAuthPathname(request.url, basePath)
  const m = request.method.toUpperCase() as AuthHttpMethod
  if (m !== 'GET' && m !== 'POST') return new Response('Not Found', { status: 404 })
  if (!DEFAULT_ALLOW_SET.has(`${m}:${path}`)) {
    return new Response('Not Found', { status: 404 })
  }
  return null
}
