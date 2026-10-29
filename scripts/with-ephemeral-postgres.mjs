/**
 * Starts a dedicated Postgres container when the package test env var is unset,
 * runs the command after `--`, then removes the container.
 * When the env var is already set (CI), runs the command only.
 */
import { spawnSync } from 'node:child_process'
import config from './ephemeral-postgres.config.mjs'

const argv = process.argv.slice(2)
const sep = argv.indexOf('--')
if (sep === -1 || sep === argv.length - 1) {
  process.stderr.write(
    'usage: with-ephemeral-postgres.mjs -- <command...>\n' +
      'example: node scripts/with-ephemeral-postgres.mjs -- bun test tests/integration\n'
  )
  process.exit(1)
}

const cmd = argv.slice(sep + 1)

function docker(args, inherit = true) {
  return spawnSync('docker', args, {
    stdio: inherit ? 'inherit' : 'pipe',
    encoding: 'utf8',
  })
}

function sleepMs(ms) {
  spawnSync('sleep', [String(Math.max(1, Math.ceil(ms / 1000)))], { stdio: 'ignore' })
}

let startedContainer = false
const existing = process.env[config.envVar]?.trim()

if (!existing) {
  docker(['rm', '-f', config.containerName], false)
  const run = docker([
    'run',
    '--name',
    config.containerName,
    '-e',
    `POSTGRES_PASSWORD=${config.password}`,
    '-p',
    `${config.hostPort}:5432`,
    '-d',
    config.image,
  ])
  if (run.status !== 0) process.exit(run.status ?? 1)

  startedContainer = true
  let ready = false
  for (let attempt = 0; attempt < 45; attempt++) {
    const check = docker(['exec', config.containerName, 'pg_isready', '-U', 'postgres'], false)
    if (check.status === 0) {
      ready = true
      break
    }
    sleepMs(500)
  }
  if (!ready) {
    docker(['rm', '-f', config.containerName], false)
    process.stderr.write(`[test-postgres] ${config.containerName} did not become ready\n`)
    process.exit(1)
  }

  process.env[config.envVar] =
    `postgres://postgres:${config.password}@localhost:${config.hostPort}/postgres`
}

const env = { ...process.env }
const result = spawnSync(cmd[0], cmd.slice(1), { stdio: 'inherit', env })
const code = result.status ?? 1

if (startedContainer) {
  docker(['rm', '-f', config.containerName], false)
}

process.exit(code)
