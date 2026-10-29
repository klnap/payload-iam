import { describe, expect, test } from 'bun:test'
import { ALLOWED_TRANSITIONS } from '../../src/modules/invitations/domain/state-machine'

describe('Property — invitation transitions', () => {
  test('accepted and superseded have empty outbound; expired can renew to pending', () => {
    expect(ALLOWED_TRANSITIONS.accepted).toEqual([])
    expect(ALLOWED_TRANSITIONS.superseded).toEqual([])
    expect(ALLOWED_TRANSITIONS.expired).toEqual(['pending'])
  })
})
