import { describe, expect, test } from 'bun:test'
import { createHash } from 'node:crypto'
import { newId } from '../../src/core/identity/ids'

describe('Gate E — hashed verification model (secret-independent)', () => {
  test('verification id hash does not incorporate secret', () => {
    const id = newId()
    const h1 = createHash('sha256').update(id).digest('hex')
    const h2 = createHash('sha256').update(id).digest('hex')
    expect(h1).toBe(h2)
    const withSecret = createHash('sha256').update(`${id}different-secret`).digest('hex')
    expect(h1).not.toBe(withSecret)
  })
})
