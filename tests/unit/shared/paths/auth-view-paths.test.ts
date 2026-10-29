import { describe, expect, test } from 'bun:test'
import {
  IAM_SESSION_ENDED_PATH,
  IAM_SIGN_OUT_PATH,
} from '../../../../src/shared/paths/auth-view-paths'

describe('IAM auth view paths', () => {
  test('use non-stock segments so Payload oneSegmentMeta does not map to Unauthorized', () => {
    expect(IAM_SIGN_OUT_PATH).toBe('/sign-out')
    expect(IAM_SESSION_ENDED_PATH).toBe('/session-ended')
  })
})
