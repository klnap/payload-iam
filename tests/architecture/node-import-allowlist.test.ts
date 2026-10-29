import { describe, expect, test } from 'bun:test'
import { readdirSync, readFileSync, statSync } from 'node:fs'
import { join, relative } from 'node:path'

const srcRoot = join(import.meta.dir, '../../src')

/** Server-only `node:*` — must never appear in a `'use client'` graph (see client-runtime-boundary.test.ts). */
const ALLOWED_NODE_IMPORT_FILES = new Set([
  'src/adapters/better-auth/methods/google/invite-google-cookie.ts',
  'src/adapters/payload/operation-als.ts',
  'src/adapters/pg/pg-host.ts',
  'src/cli/create-root-command.ts',
  'src/cli/resolve-payload-config-path.ts',
  'src/core/identity/provisioning-id.ts',
  'src/modules/auth/services/pre-payload-service-auth.ts',
])

function walk(dir: string): string[] {
  const out: string[] = []
  for (const name of readdirSync(dir)) {
    const full = join(dir, name)
    if (statSync(full).isDirectory()) {
      out.push(...walk(full))
      continue
    }
    if (name.endsWith('.ts') || name.endsWith('.tsx')) out.push(full)
  }
  return out
}

function rel(file: string): string {
  return relative(srcRoot, file).replaceAll('\\', '/')
}

describe('architecture — node import allowlist', () => {
  test('every src file that imports node:* is on the server allowlist', () => {
    const unexpected: string[] = []
    for (const file of walk(srcRoot)) {
      const text = readFileSync(file, 'utf8')
      if (!/from ['"]node:/.test(text)) continue
      const r = `src/${rel(file)}`
      if (!ALLOWED_NODE_IMPORT_FILES.has(r)) unexpected.push(r)
    }
    expect(unexpected).toEqual([])
  })
})
