import { normalizeEmail } from '#iam/adapters/email/email'
import { runWithInternalOperation } from '#iam/adapters/payload/operation-als'
import { newId } from '#iam/core/identity/ids'

/** Sole caller of internalAdapter for user CRUD — Auth Users Facade */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function createAuthUsersFacade(auth: any) {
  return {
    async createUser(args: { id?: string; email: string; name: string }) {
      const id = args.id ?? newId()
      return runWithInternalOperation({ kind: 'FACADE_CREATE_USER', userId: id }, async () => {
        const ctx = await auth.$context
        return ctx.internalAdapter.createUser(
          {
            id,
            email: normalizeEmail(args.email),
            name: args.name,
            emailVerified: true,
          },
          { method: 'payload-iam-provision' }
        )
      })
    },

    async deleteUser(userId: string) {
      return runWithInternalOperation({ kind: 'FACADE_DELETE_USER', userId }, async () => {
        const ctx = await auth.$context
        await ctx.internalAdapter.deleteUserSessions(userId)
        return ctx.internalAdapter.deleteUser(userId)
      })
    },

    async createInviteVerification(args: {
      invitationId: string
      userId?: string
      token: string
      expiresAt: Date
      email?: string
    }) {
      return runWithInternalOperation(
        {
          kind: 'INVITATION_ISSUE',
          model: 'invitations',
          targetId: args.invitationId,
          fields: ['verification'],
        },
        async () => {
          const ctx = await auth.$context
          return ctx.internalAdapter.createVerificationValue({
            identifier: `invite:${args.token}`,
            value: args.userId ?? args.invitationId,
            expiresAt: args.expiresAt,
            invitationId: args.invitationId,
          })
        }
      )
    },

    /** Replace invite token in place — same invitationId, no new invitation row. */
    async replaceInviteVerification(args: {
      invitationId: string
      userId?: string
      token: string
      expiresAt: Date
      email?: string
    }) {
      return runWithInternalOperation(
        {
          kind: 'INVITATION_RESEND',
          model: 'invitations',
          targetId: args.invitationId,
          fields: ['verification'],
        },
        async () => {
          const ctx = await auth.$context
          // invitationId is UNIQUE — must clear old row before minting.
          // Delete by field (not id-loop): findMany can omit id / miss rows.
          try {
            await ctx.adapter.delete({
              model: 'verification',
              where: [{ field: 'invitationId', value: args.invitationId }],
            })
          } catch {
            // no row — ok
          }
          // Sweep leftovers if adapter delete-one left siblings.
          const leftover = (await ctx.adapter.findMany({
            model: 'verification',
            where: [{ field: 'invitationId', value: args.invitationId }],
          })) as Array<{ id?: string }>
          for (const row of leftover) {
            if (!row.id) continue
            await ctx.adapter.delete({
              model: 'verification',
              where: [{ field: 'id', value: row.id }],
            })
          }
          return ctx.internalAdapter.createVerificationValue({
            identifier: `invite:${args.token}`,
            value: args.userId ?? args.invitationId,
            expiresAt: args.expiresAt,
            invitationId: args.invitationId,
          })
        }
      )
    },

    async findUserById(userId: string) {
      const ctx = await auth.$context
      return ctx.internalAdapter.findUserById(userId)
    },

    async findUserByEmail(email: string) {
      const ctx = await auth.$context
      const row = await ctx.internalAdapter.findUserByEmail(normalizeEmail(email))
      // BA returns `{ user, accounts }` or user depending on version — normalize to user.
      if (row && typeof row === 'object' && 'user' in row) {
        return (row as { user: { id?: string; email?: string } | null }).user
      }
      return row as { id?: string; email?: string } | null
    },

    async findCredentialAccount(userId: string) {
      const ctx = await auth.$context
      return ctx.internalAdapter.findCredentialAccount(userId)
    },

    async hashPassword(password: string) {
      const ctx = await auth.$context
      return ctx.password.hash(password)
    },

    async createCredentialAccount(args: {
      userId: string
      passwordHash: string
      provisioningOperationId: string
    }) {
      return runWithInternalOperation(
        {
          kind: 'INVITATION_ACCEPT_PROVISION',
          model: 'invitations',
          targetId: args.userId,
          fields: ['credential'],
          userId: args.userId,
          provisioningOperationId: args.provisioningOperationId,
        },
        async () => {
          const ctx = await auth.$context
          return ctx.internalAdapter.createAccount({
            userId: args.userId,
            providerId: 'credential',
            accountId: args.userId,
            password: args.passwordHash,
          })
        }
      )
    },
  }
}

export type AuthUsersFacade = ReturnType<typeof createAuthUsersFacade>
