import { spawnSync } from 'node:child_process'
import { readdirSync, statSync } from 'node:fs'
import { join } from 'node:path'

const dir = process.argv[2]
if (!dir) {
  process.stderr.write('usage: run-bun-test-dir.mjs <directory>\n')
  process.exit(1)
}

function hasTests(root) {
  try {
    for (const name of readdirSync(root)) {
      const full = join(root, name)
      if (statSync(full).isDirectory()) {
        if (hasTests(full)) return true
        continue
      }
      if (/\.(test|spec)\.(t|j)sx?$/.test(name) || /\.int\.test\.(t|j)sx?$/.test(name)) {
        return true
      }
    }
  } catch {
    return false
  }
  return false
}

if (!hasTests(dir)) {
  process.stdout.write(`[test] No tests under ${dir}; skipping.\n`)
  process.exit(0)
}

const result = spawnSync('bun', ['test', dir], { stdio: 'inherit' })
process.exit(result.status ?? 1)
