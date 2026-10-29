import { ACCOUNT_API_PATH } from './account-api-paths'

/** Payload custom IAM HTTP routes (`/api` + path). */
export const IAM_API_PATH = {
  bootstrap: {
    root: '/iam/bootstrap/root',
  },
  invitations: {
    invite: '/iam/invitations/invite',
    revoke: '/iam/invitations/revoke',
    resend: '/iam/invitations/resend',
  },
  users: {
    requestPasswordEmail: '/iam/users/request-password-email',
    sendPasswordReset: '/iam/users/send-password-reset',
    sessions: '/iam/users/sessions',
    transferRoot: '/iam/users/transfer-root',
  },
  sessions: {
    list: '/iam/sessions',
    revoke: '/iam/sessions/revoke',
  },
  account: ACCOUNT_API_PATH,
} as const
