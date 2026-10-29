import { describe, expect, test } from 'bun:test'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'

describe('LogoutClient sign-out contract', () => {
  test('uses shared Better Auth sign-out helper, not Payload users logout', () => {
    const path = join(
      import.meta.dir,
      '../../../../src/modules/auth/ui/components/logout-client.tsx'
    )
    const src = readFileSync(path, 'utf8')
    expect(src).toContain('runIamSignOut')
    expect(src).not.toMatch(/postIamAuthJson\(['"`]\/users\/logout/)
  })
})

describe('runIamSignOut', () => {
  test('posts to Better Auth sign-out route', () => {
    const path = join(import.meta.dir, '../../../../src/shared/auth/run-iam-sign-out.ts')
    const src = readFileSync(path, 'utf8')
    expect(src).toContain('IAM_AUTH_ROUTES.session.signOut')
  })
})
