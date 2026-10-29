import type { CollectionConfig } from 'payload'
import { i18n } from '#iam/shared/i18n/i18n-label'

/** Edit + API document tabs (no versions) for IAM-owned collections. */
export function mergeOwnedCollectionEditViews(
  admin: CollectionConfig['admin']
): CollectionConfig['admin'] {
  const prevViews = admin?.components?.views ?? {}
  const prevEdit = prevViews.edit ?? {}

  return {
    ...admin,
    hideAPIURL: false,
    components: {
      ...(admin?.components ?? {}),
      views: {
        ...prevViews,
        edit: {
          ...prevEdit,
          default: {
            ...(typeof prevEdit === 'object' && prevEdit && 'default' in prevEdit
              ? prevEdit.default
              : {}),
            tab: {
              label: i18n('iam:rbac:documentTabEdit'),
              order: 100,
            },
          },
          api: {
            ...(typeof prevEdit === 'object' && prevEdit && 'api' in prevEdit ? prevEdit.api : {}),
            tab: {
              label: i18n('iam:rbac:documentTabApi'),
              order: 200,
            },
          },
        },
      },
    },
  } as CollectionConfig['admin']
}
