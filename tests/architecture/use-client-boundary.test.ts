import { describe, expect, test } from 'bun:test'
import { readdirSync, readFileSync, statSync } from 'node:fs'
import { join } from 'node:path'

const srcRoot = join(import.meta.dir, '../../src')

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

const CLIENT_HOOK_ALLOWLIST = new Set(['src/shared/i18n/use-iam-t.ts'])

function isUiPath(file: string): boolean {
  const rel = file.replace(`${srcRoot}/`, 'src/')
  if (CLIENT_HOOK_ALLOWLIST.has(rel)) return true
  return /\/ui\//.test(file) || /\/shared\/ui\//.test(file)
}

describe('architecture — use client boundary', () => {
  test("'use client' only in ui/ and shared/ui/", () => {
    const offenders: string[] = []
    for (const file of walk(srcRoot)) {
      const text = readFileSync(file, 'utf8')
      if (!text.includes("'use client'") && !text.includes('"use client"')) continue
      if (!isUiPath(file)) offenders.push(file.replace(`${srcRoot}/`, 'src/'))
    }
    expect(offenders).toEqual([])
  })
})
