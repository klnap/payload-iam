/** Self-service admin views — relative to `routes.admin`. */
export const ACCOUNT_BASE_PATH = '/account' as const

export const ACCOUNT_SESSIONS_PATH = `${ACCOUNT_BASE_PATH}/sessions` as const

export const ACCOUNT_LINKED_PATH = `${ACCOUNT_BASE_PATH}/linked` as const

export const ACCOUNT_SECURITY_PATH = `${ACCOUNT_BASE_PATH}/security` as const
