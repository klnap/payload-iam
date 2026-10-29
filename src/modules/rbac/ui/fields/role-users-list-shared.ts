import type { ListQuery, Where } from 'payload'

export const ROLE_USERS_COLLECTION = 'users' as const

export function roleUsersDrawerSlug(roleId: string): string {
  return `iam-role-users-${roleId}`
}

export function usersWithRoleWhere(roleId: string): Where {
  return {
    roles: {
      contains: roleId,
    },
  }
}

export function roleUsersListQuery(roleId: string, query?: ListQuery): ListQuery {
  const base = query ?? {}
  const roleWhere = usersWithRoleWhere(roleId)
  const existing = base.where

  if (!existing || Object.keys(existing).length === 0) {
    return { ...base, where: roleWhere }
  }

  return {
    ...base,
    where: {
      and: [existing, roleWhere],
    },
  }
}
