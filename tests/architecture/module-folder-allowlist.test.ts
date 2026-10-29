import { describe, expect, test } from 'bun:test'
import { readdirSync, statSync } from 'node:fs'
import { join } from 'node:path'

const MODULES_ROOT = join(import.meta.dir, '../../src/modules')

const ALLOWED = new Set([
  'access',
  'collections',
  'config',
  'domain',
  'endpoints',
  'fields',
  'hooks',
  'http',
  'services',
  'ui',
  'methods', // auth only
  'emails', // auth + invitations only
  'module.ts',
  'index.ts',
])

function moduleIds(): string[] {
  return readdirSync(MODULES_ROOT).filter((name) => {
    const p = join(MODULES_ROOT, name)
    return statSync(p).isDirectory()
  })
}

describe('architecture — module folder dictionary', () => {
  test('each module uses only allowed top-level folders', () => {
    const violations: string[] = []
    for (const id of moduleIds()) {
      const root = join(MODULES_ROOT, id)
      for (const entry of readdirSync(root)) {
        const full = join(root, entry)
        const isDir = statSync(full).isDirectory()
        if (entry === 'methods' && id !== 'auth') {
          violations.push(`${id}/${entry} (methods only allowed under auth)`)
          continue
        }
        if (entry === 'emails' && id !== 'auth' && id !== 'invitations') {
          violations.push(`${id}/${entry} (emails only allowed under auth and invitations)`)
          continue
        }
        if (!ALLOWED.has(entry)) {
          violations.push(`${id}/${entry}${isDir ? '/' : ''}`)
        }
      }
    }
    expect(violations).toEqual([])
  })

  test('each module has index.ts', () => {
    const missing = moduleIds().filter((id) => {
      try {
        statSync(join(MODULES_ROOT, id, 'index.ts'))
        return false
      } catch {
        return true
      }
    })
    expect(missing).toEqual([])
  })
})
