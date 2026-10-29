'use client'

import { useField } from '@payloadcms/ui'
import { emptyPermissions, type PermissionsValue } from '#iam/core/permissions/shape'
import { useLocalPermissionsUntilSave } from './use-local-permissions-until-save'

/** Role `permissions` JSON field — local state until save + typed patch helper. */
export function usePermissionsField() {
  const { value, setValue } = useField<PermissionsValue>({ path: 'permissions' })
  const [local, patchRaw] = useLocalPermissionsUntilSave(value, setValue)
  const perms = (local as PermissionsValue) ?? emptyPermissions()
  const patch = (next: PermissionsValue) => patchRaw(next as never)
  return { perms, patch }
}
