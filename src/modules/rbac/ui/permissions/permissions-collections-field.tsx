'use client'

import ModelsMatrix from '#iam/modules/rbac/ui/matrix/models-matrix'

/** Role → Collections tab — CMS content only (no users/roles/invitations). */
export default function PermissionsCollectionsField() {
  return <ModelsMatrix mode='content' />
}
