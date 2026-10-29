import { describe, expect, test } from 'bun:test'
import {
  INVITE_FLOW_RESPONSE_HEADERS,
  jsonWithInviteFlowHeaders,
} from '../../../../src/modules/invitations/http/invite-flow-response-headers'

describe('invite flow response headers', () => {
  test('sets security headers on JSON response', async () => {
    const res = jsonWithInviteFlowHeaders({ ok: true })
    expect(res.headers.get('Referrer-Policy')).toBe(INVITE_FLOW_RESPONSE_HEADERS['Referrer-Policy'])
    expect(res.headers.get('X-Content-Type-Options')).toBe(
      INVITE_FLOW_RESPONSE_HEADERS['X-Content-Type-Options']
    )
    expect(await res.json()).toEqual({ ok: true })
  })

  test('preserves status and merges with existing headers', () => {
    const res = jsonWithInviteFlowHeaders(
      { error: 'invalid' },
      { status: 400, headers: { 'X-Custom': '1' } }
    )
    expect(res.status).toBe(400)
    expect(res.headers.get('X-Custom')).toBe('1')
    expect(res.headers.get('Referrer-Policy')).toBe('no-referrer')
  })
})
