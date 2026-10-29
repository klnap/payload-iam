import { describe, expect, test } from 'bun:test'
import { createIamAuthRouteHandlers } from '../../../src/next/create-iam-auth-route-handlers'

describe('createIamAuthRouteHandlers', () => {
  test('returns GET and POST with the same handler function', () => {
    const { GET, POST } = createIamAuthRouteHandlers({} as never)
    expect(typeof GET).toBe('function')
    expect(typeof POST).toBe('function')
    expect(GET).toBe(POST)
  })
})
