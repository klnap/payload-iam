import { describe, expect, test } from 'bun:test'
import { readdirSync, readFileSync, statSync } from 'node:fs'
import { join, relative } from 'node:path'

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

function fileText(path: string): string {
  return readFileSync(path, 'utf8')
}

function isClientModule(path: string): boolean {
  const text = fileText(path)
  return text.includes("'use client'") || text.includes('"use client"')
}

function staticImportTargets(path: string): string[] {
  const text = fileText(path)
  const imports: string[] = []
  const re = /from ['"](\.\.?\/[^'"]+)['"]/g
  let m = re.exec(text)
  while (m !== null) {
    imports.push(m[1]!)
    m = re.exec(text)
  }
  return imports
}

function resolveRelative(fromFile: string, spec: string): string | null {
  const base = join(fromFile, '..', spec)
  const candidates = [base, `${base}.ts`, `${base}.tsx`, join(base, 'index.ts')]
  for (const candidate of candidates) {
    try {
      if (statSync(candidate).isFile()) return candidate
    } catch {
      /* try next */
    }
  }
  return null
}

function collectStaticGraph(entry: string): string[] {
  const seen = new Set<string>()
  const stack = [entry]
  while (stack.length) {
    const file = stack.pop()!
    if (seen.has(file)) continue
    seen.add(file)
    for (const spec of staticImportTargets(file)) {
      if (!spec.startsWith('.')) continue
      const resolved = resolveRelative(file, spec)
      if (resolved) stack.push(resolved)
    }
  }
  return [...seen]
}

const SERVER_MODULE_BARRELS = new Set([
  'src/modules/auth/index.ts',
  'src/modules/bootstrap/index.ts',
  'src/modules/invitations/index.ts',
  'src/modules/rbac/index.ts',
  'src/modules/sessions/index.ts',
  'src/modules/users/index.ts',
])

function rel(file: string): string {
  return relative(srcRoot, file).replaceAll('\\', '/')
}

describe('architecture — client runtime boundary', () => {
  test("'use client' graphs do not reach server-only module barrels or node:*", () => {
    const violations: string[] = []

    for (const file of walk(srcRoot)) {
      if (!isClientModule(file)) continue
      for (const reached of collectStaticGraph(file)) {
        const r = rel(reached)
        if (SERVER_MODULE_BARRELS.has(r)) {
          violations.push(`${rel(file)} → server barrel ${r}`)
        }
        if (/from ['"]node:/.test(fileText(reached))) {
          violations.push(`${rel(file)} → node import in ${r}`)
        }
        if (r === 'src/adapters/payload/operation-als.ts') {
          violations.push(`${rel(file)} → ${r}`)
        }
      }
    }

    expect(violations).toEqual([])
  })

  test("'use client' modules do not import server module index barrels directly", () => {
    const direct: string[] = []
    const barrelRe = /from ['"](\.\.\/)+(auth|bootstrap|invitations|rbac|sessions|users)['"]/

    for (const file of walk(srcRoot)) {
      if (!isClientModule(file)) continue
      if (barrelRe.test(fileText(file))) {
        direct.push(rel(file))
      }
    }

    expect(direct).toEqual([])
  })
})
