/**
 * Missing Root Admin:
 * - production → fatal onInit (unless PAYLOAD_RBAC_BOOTSTRAP=1 for CLI/seed)
 * - development → LoginView shows create form
 *
 * HTTP bootstrap endpoint is never available in production (even with
 * PAYLOAD_RBAC_BOOTSTRAP=1) — that flag is CLI/seed only.
 */
export function isRootBootstrapAllowed(): boolean {
  if (process.env.PAYLOAD_RBAC_BOOTSTRAP === '1') return true
  return process.env.NODE_ENV !== 'production'
}

/** Unauthenticated HTTP mint-Root — non-production only. */
export function isHttpBootstrapAllowed(): boolean {
  return process.env.NODE_ENV !== 'production'
}

export const MISSING_ROOT_PROD_MESSAGE =
  'payload-iam: no Root Admin — run `PAYLOAD_RBAC_BOOTSTRAP=1 bun run iam:create-root --email … --password …` (or seed) before starting production'

export const HTTP_BOOTSTRAP_DISABLED_MESSAGE =
  'HTTP bootstrap is disabled in production — use the CLI create-root command'
