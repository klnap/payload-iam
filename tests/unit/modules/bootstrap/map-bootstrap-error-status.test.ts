import { describe, expect, test } from 'bun:test'
import { mapBootstrapErrorToHttpStatus } from '../../../../src/modules/bootstrap/http/map-bootstrap-error-status'

describe('mapBootstrapErrorToHttpStatus', () => {
  test('409 when root already exists', () => {
    expect(mapBootstrapErrorToHttpStatus('Root admin already exists')).toBe(409)
  })

  test('403 for production / env gate messages', () => {
    expect(mapBootstrapErrorToHttpStatus('disabled in production')).toBe(403)
    expect(mapBootstrapErrorToHttpStatus('Set PAYLOAD_RBAC_ALLOW_BOOTSTRAP=1')).toBe(403)
  })

  test('400 for other validation failures', () => {
    expect(mapBootstrapErrorToHttpStatus('Invalid email')).toBe(400)
  })
})
