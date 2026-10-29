const ACCOUNT_BASE = '/iam/account'

/** Self-service account IAM routes — `link` / `unlink` per sign-in method slug. */
export const ACCOUNT_LINK_METHOD = {
  password: 'password',
  passwordReset: 'password-reset',
} as const

export type AccountLinkMethod = (typeof ACCOUNT_LINK_METHOD)[keyof typeof ACCOUNT_LINK_METHOD]

export const ACCOUNT_UNLINK_METHOD = {
  google: 'google',
} as const

export type AccountUnlinkMethod = (typeof ACCOUNT_UNLINK_METHOD)[keyof typeof ACCOUNT_UNLINK_METHOD]

export function accountLinkPath(method: string): string {
  return `${ACCOUNT_BASE}/link/${method}`
}

export function accountUnlinkPath(method: string): string {
  return `${ACCOUNT_BASE}/unlink/${method}`
}

export const ACCOUNT_API_PATH = {
  changePassword: `${ACCOUNT_BASE}/change-password`,
  link: {
    password: accountLinkPath(ACCOUNT_LINK_METHOD.password),
    passwordReset: accountLinkPath(ACCOUNT_LINK_METHOD.passwordReset),
  },
  unlink: {
    google: accountUnlinkPath(ACCOUNT_UNLINK_METHOD.google),
  },
} as const
