import { describe, expect, test } from 'bun:test'
import RoleUsersCell from '../../../../src/modules/rbac/ui/cells/role-users-cell'

describe('RoleUsersCell', () => {
  test('number', () => {
    const el = RoleUsersCell({ cellData: 3 } as never)
    expect(el?.props?.children).toBe(3)
  })

  test('null → 0', () => {
    const el = RoleUsersCell({ cellData: null } as never)
    expect(el?.props?.children).toBe(0)
  })
})
