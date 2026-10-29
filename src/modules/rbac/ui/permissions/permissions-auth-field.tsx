'use client'

import ModelsMatrix from '#iam/modules/rbac/ui/matrix/models-matrix'

/** Role → Access tab — users / roles / invitations (separate from content). */
export default function PermissionsAuthField() {
  return <ModelsMatrix mode='auth' />
}
