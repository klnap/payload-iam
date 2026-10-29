/**
 * @deprecated Prefer `payload-iam create-root` (package bin). Kept for `bun pkg payload-iam create-root`.
 */
import { runCreateRootCommand } from '../src/cli/create-root-command.ts'
import { flagString, parseCliArgs } from '../src/cli/parse-args.ts'

const parsed = parseCliArgs(process.argv)

runCreateRootCommand({
  config: flagString(parsed.flags, 'config'),
  email: flagString(parsed.flags, 'email'),
  password: flagString(parsed.flags, 'password'),
  fullName: flagString(parsed.flags, 'full-name'),
})
  .then((code) => process.exit(code))
  .catch((err) => {
    console.error(err instanceof Error ? err.message : err)
    process.exit(1)
  })
