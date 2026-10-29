/**
 * Validates that every @klnap/payload-iam/client|rsc#Name string used in src/
 * is exported from the matching package entry.
 */
import { readdirSync, readFileSync, statSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const pkgRoot = dirname(dirname(fileURLToPath(import.meta.url)))
const srcRoot = join(pkgRoot, 'src')

const PATH_RE = /@klnap\/payload-iam\/(client|rsc)#([A-Za-z0-9_]+)/g

function walkTsFiles(dir: string): string[] {
  const out: string[] = []
  for (const name of readdirSync(dir)) {
    const full = join(dir, name)
    if (statSync(full).isDirectory()) {
      if (name === 'node_modules') continue
      out.push(...walkTsFiles(full))
      continue
    }
    if (name.endsWith('.ts') || name.endsWith('.tsx')) out.push(full)
  }
  return out
}

function loadRscExportSurface(): Record<string, unknown> {
  const rscPath = join(pkgRoot, 'src/exports/rsc.ts')
  const src = readFileSync(rscPath, 'utf8')
  const names: string[] = []
  const re = /export\s+\{\s*default\s+as\s+(\w+)\s*\}\s+from\s+['"]([^'"]+)['"]/g
  for (const match of src.matchAll(re)) {
    const exportName = match[1]
    if (exportName) names.push(exportName)
  }
  return Object.fromEntries(names.map((name) => [name, true]))
}

const files = walkTsFiles(srcRoot)
const referenced = new Map<string, Set<string>>()
for (const file of files) {
  const text = readFileSync(file, 'utf8')
  for (const match of text.matchAll(PATH_RE)) {
    const entry = match[1]!
    const name = match[2]!
    if (!referenced.has(entry)) referenced.set(entry, new Set())
    referenced.get(entry)!.add(name)
  }
}

const client = await import('@klnap/payload-iam/client')
const rsc = loadRscExportSurface()

let failed = false
const rows: string[] = []

for (const [entry, names] of [...referenced.entries()].sort()) {
  const mod = entry === 'client' ? client : rsc
  for (const name of [...names].sort()) {
    const key = `@klnap/payload-iam/${entry}#${name}`
    const exported = name in mod
    if (!exported) failed = true
    rows.push(`${key}\texport=${exported ? 'ok' : 'MISSING'}`)
  }
}

for (const file of files) {
  if (readFileSync(file, 'utf8').includes('@klnap/payload-iam/admin/')) {
    failed = true
    process.stderr.write(
      '[check-payload-component-exports] Stale @klnap/payload-iam/admin/ path in source\n'
    )
    break
  }
}

process.stdout.write(rows.join('\n'))
process.stdout.write('\n')

if (failed) process.exit(1)
process.stdout.write(
  '[check-payload-component-exports] All Payload component paths used in source are exported.\n'
)
