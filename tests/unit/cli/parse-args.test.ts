import { describe, expect, test } from 'bun:test'
import { flagString, parseCliArgs } from '../../../src/cli/parse-args'

describe('parseCliArgs', () => {
  test('parses create-root with flags', () => {
    const parsed = parseCliArgs([
      'node',
      'payload-iam',
      'create-root',
      '--email',
      'a@b.c',
      '--config',
      './cfg.ts',
    ])
    expect(parsed.command).toBe('create-root')
    expect(flagString(parsed.flags, 'email')).toBe('a@b.c')
    expect(flagString(parsed.flags, 'config')).toBe('./cfg.ts')
  })
})
