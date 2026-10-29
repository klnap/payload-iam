/**
 * Optional host check: component paths in src/ must appear in the host importMap.js.
 * Set PAYLOAD_IMPORT_MAP_PATH to the host file (absolute path).
 */
import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const importMapPath = process.env.PAYLOAD_IMPORT_MAP_PATH?.trim()

if (!importMapPath) {
  process.stderr.write(
    '[check-host-import-map] NOT EXECUTED: set PAYLOAD_IMPORT_MAP_PATH to your host importMap.js\n'
  )
  process.exit(2)
}

if (!existsSync(importMapPath)) {
  process.stderr.write(`[check-host-import-map] NOT EXECUTED: file not found: ${importMapPath}\n`)
  process.exit(2)
}

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
const importMapText = readFileSync(importMapPath, 'utf8')

let failed = false
for (const [entry, names] of referenced) {
  const mod = entry === 'client' ? client : rsc
  for (const name of names) {
    const key = `@klnap/payload-iam/${entry}#${name}`
    if (!(name in mod)) failed = true
    if (!importMapText.includes(`"${key}"`)) failed = true
  }
}

if (importMapText.includes('@klnap/payload-iam/admin/')) {
  failed = true
  process.stderr.write(
    '[check-host-import-map] Stale @klnap/payload-iam/admin/ entry in host import map\n'
  )
}

if (failed) process.exit(1)
process.stdout.write('[check-host-import-map] Host import map matches package component paths.\n')
