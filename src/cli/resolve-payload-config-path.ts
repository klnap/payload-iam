import { existsSync } from 'node:fs'
import path from 'node:path'

const CONFIG_CANDIDATES = [
  'src/payload.config.ts',
  'payload.config.ts',
  'src/payload.config.js',
  'payload.config.js',
] as const

export function resolvePayloadConfigPath(explicit?: string): string {
  if (process.env.PAYLOAD_CONFIG_PATH) {
    return path.resolve(process.env.PAYLOAD_CONFIG_PATH)
  }
  if (explicit) {
    return path.resolve(explicit)
  }
  for (const relative of CONFIG_CANDIDATES) {
    const candidate = path.resolve(process.cwd(), relative)
    if (existsSync(candidate)) return candidate
  }
  throw new Error(
    'Payload config not found. Set PAYLOAD_CONFIG_PATH or pass --config <path> (e.g. src/payload.config.ts).'
  )
}
