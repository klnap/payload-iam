import { describe, expect, test } from 'bun:test'
import { readdirSync, readFileSync, statSync } from 'node:fs'
import { join, relative } from 'node:path'

const srcRoot = join(import.meta.dir, '../../src')
const sharedRoot = join(srcRoot, 'shared')

/** Global plugin registration — may be used by 0 modules directly (Payload shell). */
const PLUGIN_GLOBAL_ALLOWLIST = new Set([
  'shared/ui/admin/access-nav-link.tsx',
  'shared/ui/admin/admin-iam-styles.tsx',
  'shared/ui/admin/admin-session-guard.tsx',
  'shared/ui/admin/admin-tab-nav.tsx',
  'shared/ui/admin/header-account-hide.tsx',
  'shared/ui/admin/user-footer.tsx',
  'shared/ui/admin/user-avatar-mark.tsx',
  'shared/ui/admin/initials.ts',
  'shared/ui/admin/user-menu/theme-picker-menu.tsx',
  'shared/config/payload-iam-custom.ts',
  'shared/i18n/i18n-label.ts',
  'shared/i18n/t-iam.ts',
  'shared/i18n/translations.ts',
  'shared/i18n/email-translations.ts',
  'shared/i18n/use-iam-t.ts',
  'shared/ui/admin/after-nav-links.ts',
  'shared/lib/search-params.ts',
  'shared/runtime/random-bytes.ts',
  'shared/http/json-fetch.ts',
  'shared/paths/access-paths.ts',
  'shared/paths/account-api-paths.ts',
  'shared/paths/account-paths.ts',
  'shared/paths/admin-auth-paths.ts',
  'shared/paths/admin-absolute-url.ts',
  'shared/paths/iam-api-paths.ts',
  'shared/paths/auth-api-path.ts',
  'shared/paths/auth-routes.ts',
  'shared/styles/iam-admin-shell.css',
  'shared/styles/iam-guest-shell.css',
  'shared/styles/iam-admin.css',
  'shared/styles/iam-permissions-matrix.css',
  'shared/styles/iam-tailwind.css',
  'shared/ui/guest/browser-credential-save.ts',
  'shared/ui/guest/guest-layout.tsx',
  'shared/ui/guest/guest-payload-form.ts',
  'shared/ui/guest/guest-logo.tsx',
  'shared/ui/guest/guest-logo-props.ts',
  'shared/ui/guest/guest-page.tsx',
  'shared/ui/guest/guest.styles.ts',
  'shared/ui/guest/guest-page-back.tsx',
  'shared/ui/guest/index.ts',
  'shared/ui/guest/guest-security-meta.tsx',
  'shared/ui/guest/guest-theme-icon.tsx',
  'shared/ui/guest/guest-theme-toggle.tsx',
  'shared/ui/guest/use-guest-page-theme.ts',
  'shared/ui/icons/lock-icons.tsx',
  'shared/emails/email-fonts.tsx',
  'shared/emails/resolve-email-fonts.ts',
  'shared/emails/payload-email-theme-tokens.ts',
  'shared/emails/layout/transactional-email-layout.tsx',
  'shared/emails/layout/email-layout.tsx',
  'shared/emails/layout/email.tsx',
  'shared/emails/layout/email-logo.tsx',
  'shared/emails/layout/email-themed-logo-styles.ts',
  'shared/emails/email-wordmark-aspect.ts',
  'shared/emails/layout/email-primary-button.tsx',
  'shared/emails/layout/email-otp-code.tsx',
  'shared/paths/login-otp-email-link.ts',
  'shared/paths/auth-view-paths.ts',
  'shared/auth/run-iam-sign-out.ts',
])

function walk(dir: string): string[] {
  const out: string[] = []
  for (const name of readdirSync(dir)) {
    const full = join(dir, name)
    if (statSync(full).isDirectory()) {
      out.push(...walk(full))
      continue
    }
    if (name.endsWith('.ts') || name.endsWith('.tsx') || name.endsWith('.css')) out.push(full)
  }
  return out
}

function rel(file: string): string {
  return relative(srcRoot, file).replaceAll('\\', '/')
}

function countModuleUsers(basename: string): string[] {
  const users = new Set<string>()
  const needle = basename.replace(/\.(tsx|ts|css)$/, '')
  for (const file of walk(join(srcRoot, 'modules'))) {
    const text = readFileSync(file, 'utf8')
    if (!text.includes(needle)) continue
    const m = rel(file).match(/^modules\/([^/]+)\//)
    if (m) users.add(m[1]!)
  }
  return [...users].sort()
}

describe('architecture — shared placement', () => {
  test('each shared file is used by ≥2 modules or is on plugin-global allowlist', () => {
    const violations: string[] = []
    for (const file of walk(sharedRoot)) {
      const r = rel(file)
      if (PLUGIN_GLOBAL_ALLOWLIST.has(r)) continue
      const base = file.split('/').pop()!
      const mods = countModuleUsers(base)
      if (mods.length < 2) {
        violations.push(`${r} (modules: ${mods.join(', ') || 'none'})`)
      }
    }
    expect(violations).toEqual([])
  })
})
