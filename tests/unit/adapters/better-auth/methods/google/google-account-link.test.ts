import { describe, expect, it } from 'vitest'
import { canProvisionedUserLinkGoogle } from '../../../../../../src/adapters/better-auth/methods/google/google-account-link'

describe('canProvisionedUserLinkGoogle', () => {
  const baseDeps = {
    findPayloadUser: async () => ({ isActive: true, provisioningStatus: 'none' }),
    hasCredentialAccount: async () => true,
    hasGoogleAccount: async () => false,
  }

  it('denies when user missing or inactive', async () => {
    expect(
      await canProvisionedUserLinkGoogle({ ...baseDeps, findPayloadUser: async () => null }, 'u1')
    ).toBe(false)
    expect(
      await canProvisionedUserLinkGoogle(
        { ...baseDeps, findPayloadUser: async () => ({ isActive: false }) },
        'u1'
      )
    ).toBe(false)
  })

  it('denies while provisioning', async () => {
    expect(
      await canProvisionedUserLinkGoogle(
        {
          ...baseDeps,
          findPayloadUser: async () => ({ isActive: true, provisioningStatus: 'provisioning' }),
        },
        'u1'
      )
    ).toBe(false)
  })

  it('denies without credential or when google already linked', async () => {
    expect(
      await canProvisionedUserLinkGoogle(
        { ...baseDeps, hasCredentialAccount: async () => false },
        'u1'
      )
    ).toBe(false)
    expect(
      await canProvisionedUserLinkGoogle({ ...baseDeps, hasGoogleAccount: async () => true }, 'u1')
    ).toBe(false)
  })

  it('allows active provisioned user with credential only', async () => {
    expect(await canProvisionedUserLinkGoogle(baseDeps, 'u1')).toBe(true)
  })
})
