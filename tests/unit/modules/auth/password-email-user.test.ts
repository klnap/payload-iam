import { describe, expect, it, mock } from 'bun:test'
import { loadActiveUserForPasswordEmail } from '#iam/modules/auth/methods/email-and-password/services/password-email-user'

describe('loadActiveUserForPasswordEmail', () => {
  it('reports provisioning before inactive for invite-anchor users', async () => {
    const host = {
      getPayload: mock(async () => ({
        config: { admin: { user: 'users' } },
        findByID: mock(async () => ({
          email: 'anchor@stolbek.test',
          isActive: false,
          provisioningStatus: 'provisioning',
        })),
      })),
    } as never

    await expect(loadActiveUserForPasswordEmail(host, 'user-1')).rejects.toThrow(
      'user provisioning in progress'
    )
  })
})
