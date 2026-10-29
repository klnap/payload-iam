import { describe, expect, test } from 'bun:test'
import { HttpJsonError, postIamAuthJson } from '../../../../src/shared/http/json-fetch'

describe('postIamAuthJson', () => {
  test('throws on 200 body with error field (Better Auth compat)', async () => {
    const originalFetch = globalThis.fetch
    globalThis.fetch = async () =>
      new Response(JSON.stringify({ error: 'invalid_token' }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      })

    try {
      await expect(postIamAuthJson('/email-and-password/set-password', {})).rejects.toMatchObject({
        message: 'invalid_token',
        status: 200,
      })
    } finally {
      globalThis.fetch = originalFetch
    }
  })

  test('throws HttpJsonError on non-OK with message', async () => {
    const originalFetch = globalThis.fetch
    globalThis.fetch = async () =>
      new Response(JSON.stringify({ message: 'nope', code: 'X' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      })

    try {
      await expect(postIamAuthJson('/sign-out', {})).rejects.toBeInstanceOf(HttpJsonError)
    } finally {
      globalThis.fetch = originalFetch
    }
  })
})
