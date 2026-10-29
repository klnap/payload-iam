import { runCreateRootCommand } from './create-root-command'
import { flagString, parseCliArgs } from './parse-args'

const HELP = `@klnap/payload-iam — host CLI

Usage:
  payload-iam create-root [--email <addr>] [--password <secret>] [--full-name <name>] [--config <path>]

  create-root   Ensure Root role, or create the first Root user when --email is set and no Root exists.
                Without --password, generates a strong password (same as admin bootstrap UI).

Environment:
  PAYLOAD_CONFIG_PATH   Path to payload.config (optional if ./src/payload.config.ts exists)
  PAYLOAD_RBAC_BOOTSTRAP  Set automatically by this CLI for production bootstrap.

Examples:
  payload-iam create-root --email admin@example.com
  PAYLOAD_CONFIG_PATH=./src/payload.config.ts payload-iam create-root --email admin@example.com
`

export async function runCli(argv: string[]): Promise<number> {
  const parsed = parseCliArgs(argv)
  const cmd = parsed.command ?? 'help'

  if (cmd === 'help' || cmd === '--help' || cmd === '-h') {
    console.log(HELP.trim())
    return 0
  }

  if (cmd === 'create-root') {
    return runCreateRootCommand({
      config: flagString(parsed.flags, 'config'),
      email: flagString(parsed.flags, 'email'),
      password: flagString(parsed.flags, 'password'),
      fullName: flagString(parsed.flags, 'full-name'),
    })
  }

  console.error(`Unknown command: ${cmd}\n`)
  console.log(HELP.trim())
  return 1
}
