import { describe, expect, test } from 'bun:test'
import { readdirSync, statSync } from 'node:fs'
import { join } from 'node:path'

const srcRoot = join(import.meta.dir, '../../src/modules')

const KEBAB = /^[a-z0-9]+(?:-[a-z0-9]+)*\.(tsx|ts)$/

function moduleIds(): string[] {
  return readdirSync(srcRoot).filter((n) => statSync(join(srcRoot, n)).isDirectory())
}

describe('architecture — module UI filenames', () => {
  test('ui/fields use kebab-case *-field.tsx', () => {
    const bad: string[] = []
    for (const id of moduleIds()) {
      const dir = join(srcRoot, id, 'ui', 'fields')
      try {
        for (const f of readdirSync(dir)) {
          if (!f.endsWith('.tsx')) continue
          if (!KEBAB.test(f) || !f.endsWith('-field.tsx')) bad.push(`${id}/ui/fields/${f}`)
        }
      } catch {
        /* no fields */
      }
    }
    expect(bad).toEqual([])
  })

  test('ui/cells use kebab-case *-cell.tsx', () => {
    const bad: string[] = []
    for (const id of moduleIds()) {
      const dir = join(srcRoot, id, 'ui', 'cells')
      try {
        for (const f of readdirSync(dir)) {
          if (!f.endsWith('.tsx')) continue
          if (!KEBAB.test(f) || !f.endsWith('-cell.tsx')) bad.push(`${id}/ui/cells/${f}`)
        }
      } catch {
        /* no cells */
      }
    }
    expect(bad).toEqual([])
  })

  test('ui/views use kebab-case *-view.tsx', () => {
    const bad: string[] = []
    for (const id of moduleIds()) {
      const dir = join(srcRoot, id, 'ui', 'views')
      try {
        for (const f of readdirSync(dir)) {
          if (!f.endsWith('.tsx')) continue
          if (!KEBAB.test(f) || !f.endsWith('-view.tsx')) bad.push(`${id}/ui/views/${f}`)
        }
      } catch {
        /* no views */
      }
    }
    expect(bad).toEqual([])
  })

  test('no empty directories under src/modules', () => {
    const empty: string[] = []
    const scan = (dir: string, rel: string) => {
      const entries = readdirSync(dir)
      if (entries.length === 0) {
        empty.push(rel)
        return
      }
      for (const e of entries) {
        const full = join(dir, e)
        if (statSync(full).isDirectory()) scan(full, `${rel}/${e}`)
      }
    }
    for (const id of moduleIds()) scan(join(srcRoot, id), id)
    expect(empty).toEqual([])
  })
})
