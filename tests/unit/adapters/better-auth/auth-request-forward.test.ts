import { describe, expect, test } from 'bun:test'
import { forwardIamAuthRequest } from '../../../../src/adapters/better-auth/auth-request-forward'

describe('forwardIamAuthRequest', () => {
  test('forwards POST with serialized body without reading the original stream', async () => {
    const consumed = new Request(
      'http://localhost/api/iam/auth/email-and-password/login-otp/verify',
      {
        method: 'POST',
        body: '{"code":"123456"}',
      }
    )
    await consumed.text()

    let seenBody: string | undefined
    const handler = () => async (req: Request) => {
      seenBody = await req.text()
      return new Response('ok')
    }

    const res = await forwardIamAuthRequest(
      handler,
      consumed,
      '/two-factor/verify-otp',
      '{"code":"123456"}'
    )
    expect(res.status).toBe(200)
    expect(seenBody).toBe('{"code":"123456"}')
  })
})
