export type ParsedCliArgs = {
  command?: string
  positional: string[]
  flags: Map<string, string | true>
}

export function parseCliArgs(argv: string[]): ParsedCliArgs {
  const args = argv.slice(2)
  const flags = new Map<string, string | true>()
  const positional: string[] = []
  let command: string | undefined

  for (let i = 0; i < args.length; i++) {
    const token = args[i]!
    if (token === '--') continue
    if (token.startsWith('--')) {
      const key = token.slice(2)
      const next = args[i + 1]
      if (next && !next.startsWith('--')) {
        flags.set(key, next)
        i++
      } else {
        flags.set(key, true)
      }
      continue
    }
    if (!command) command = token
    else positional.push(token)
  }

  return { command, positional, flags }
}

export function flagString(flags: Map<string, string | true>, name: string): string | undefined {
  const v = flags.get(name)
  return typeof v === 'string' ? v : undefined
}
