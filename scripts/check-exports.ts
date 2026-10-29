import { existsSync, readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = dirname(dirname(fileURLToPath(import.meta.url)))
const pkg = JSON.parse(readFileSync(join(root, 'package.json'), 'utf8')) as {
  exports?: Record<string, unknown>
}
const snapshotPath = join(root, 'scripts/exports-snapshot.json')
const snapshot = JSON.parse(readFileSync(snapshotPath, 'utf8')) as Record<string, string[]>

const exportKeys = Object.keys(pkg.exports ?? {})
  .filter((key) => !key.includes('.css'))
  .sort()
const snapshotKeys = Object.keys(snapshot).sort()

let failed = false

if (exportKeys.join() !== snapshotKeys.join()) {
  failed = true
  process.stderr.write('[check:exports] package.json exports keys do not match snapshot\n')
  process.stderr.write(`  package.json: ${exportKeys.join(', ')}\n`)
  process.stderr.write(`  snapshot: ${snapshotKeys.join(', ')}\n`)
}

const toSpecifier = (subpath: string): string =>
  subpath === '.' ? '@klnap/payload-iam' : `@klnap/payload-iam${subpath.slice(1)}`

/** RSC admin views depend on `server-only` and Next RSC resolution — not loadable in plain Bun. */
function loadRscExportSurface(): Record<string, unknown> {
  const rscPath = join(root, 'src/exports/rsc.ts')
  const src = readFileSync(rscPath, 'utf8')
  const names: string[] = []
  const re = /export\s+\{\s*default\s+as\s+(\w+)\s*\}\s+from\s+['"]([^'"]+)['"]/g
  for (const match of src.matchAll(re)) {
    const exportName = match[1]
    const rel = match[2]
    if (!exportName || !rel) continue
    const target = join(dirname(rscPath), rel)
    const candidates = [
      `${target}.tsx`,
      `${target}.ts`,
      join(target, 'index.tsx'),
      join(target, 'index.ts'),
    ]
    if (!candidates.some((p) => existsSync(p))) {
      failed = true
      process.stderr.write(`[check:exports] ./rsc target missing for ${exportName}: ${rel}\n`)
    }
    names.push(exportName)
  }
  if (names.length === 0) {
    failed = true
    process.stderr.write('[check:exports] ./rsc: no exports found in src/exports/rsc.ts\n')
  }
  return Object.fromEntries(names.map((name) => [name, true]))
}

function loadNextExportSurface(): Record<string, unknown> {
  const nextPath = join(root, 'src/exports/next.ts')
  const src = readFileSync(nextPath, 'utf8')
  const names = ['createIamAuthRouteHandlers', 'GET', 'POST']
  if (!src.includes('createIamAuthRouteHandlers')) {
    failed = true
    process.stderr.write('[check:exports] ./next: createIamAuthRouteHandlers export missing\n')
  }
  const handlerPath = join(root, 'src/next/create-iam-auth-route-handlers.ts')
  if (!existsSync(handlerPath)) {
    failed = true
    process.stderr.write('[check:exports] ./next: create-iam-auth-route-handlers target missing\n')
  }
  return Object.fromEntries(names.map((name) => [name, true]))
}

for (const subpath of snapshotKeys) {
  const expected = snapshot[subpath]
  if (!expected) continue

  const specifier = toSpecifier(subpath)
  let mod: Record<string, unknown>
  try {
    if (subpath === './rsc') {
      mod = loadRscExportSurface()
    } else if (subpath === './next') {
      mod = loadNextExportSurface()
    } else {
      mod = await import(specifier)
    }
  } catch (error) {
    failed = true
    process.stderr.write(`[check:exports] Failed to import ${specifier}: ${String(error)}\n`)
    continue
  }

  const actual = Object.keys(mod).sort()
  const expectedSorted = [...expected].sort()

  const missing = expectedSorted.filter((name) => !actual.includes(name))
  const extra = actual.filter((name) => !expectedSorted.includes(name))

  if (missing.length || extra.length) {
    failed = true
    process.stderr.write(`[check:exports] Mismatch for ${subpath} (${specifier})\n`)
    if (missing.length) process.stderr.write(`  missing: ${missing.join(', ')}\n`)
    if (extra.length) process.stderr.write(`  extra: ${extra.join(', ')}\n`)
  }
}

if (failed) {
  process.exit(1)
}

process.stdout.write('[check:exports] All public subpaths resolve and match the export snapshot.\n')
