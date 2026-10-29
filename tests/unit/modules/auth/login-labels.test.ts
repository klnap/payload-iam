import { describe, expect, it } from 'bun:test'
import { getLoginViewLabels } from '../../../../src/modules/auth/ui/hooks/get-login-labels'

describe('getLoginViewLabels', () => {
  it('uses iam:rbac namespace for Google login copy', () => {
    const keys: string[] = []
    const t = (key: string) => {
      keys.push(key)
      if (key === 'iam:rbac:loginWithGoogle') return 'Login with Google'
      return key
    }

    const labels = getLoginViewLabels(t)
    expect(labels.loginWithGoogle).toBe('Login with Google')
    expect(keys).toContain('iam:rbac:loginWithGoogle')
    expect(keys).toContain('iam:rbac:loginOrContinueWith')
  })
})
