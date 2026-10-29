'use client'

import {
  ListDrawerContextProvider,
  LoadingOverlay,
  useDocumentInfo,
  useFormFields,
  useServerFunctions,
  useTranslation,
} from '@payloadcms/ui'
import type { ListQuery } from 'payload'
import { hoistQueryParamsToAnd } from 'payload/shared'
import { type ReactNode, useCallback, useEffect, useState } from 'react'
import { useIamTranslation } from '#iam/shared/i18n/use-iam-t'
import { ROLE_USERS_COLLECTION, usersWithRoleWhere } from './role-users-list-shared'

/** Role edit → Users tab: Payload `render-list` (server list) + drawer context for paging. */
export default function RoleUsersListField() {
  const { t } = useIamTranslation()
  const { t: tGeneral } = useTranslation()
  const { id, docPermissions } = useDocumentInfo()
  const usersCount = useFormFields(([fields]) => {
    const value = fields.users?.value
    return typeof value === 'number' ? value : null
  })
  const { serverFunction } = useServerFunctions()
  const roleId = id != null ? String(id) : null

  const [listView, setListView] = useState<ReactNode>(null)
  const [loading, setLoading] = useState(false)

  const loadList = useCallback(
    async (query?: ListQuery) => {
      if (!roleId || !docPermissions?.read) return

      setLoading(true)
      try {
        const where = hoistQueryParamsToAnd(query?.where ?? {}, usersWithRoleWhere(roleId))
        const result = await serverFunction({
          name: 'render-list',
          args: {
            collectionSlug: ROLE_USERS_COLLECTION,
            disableBulkDelete: true,
            disableBulkEdit: true,
            disableQueryPresets: true,
            enableRowSelections: true,
            overrideEntityVisibility: true,
            query: {
              ...(query ?? {}),
              where,
            },
          },
        })
        const list = (result as { List?: ReactNode } | null)?.List ?? null
        setListView(list)
      } finally {
        setLoading(false)
      }
    },
    [docPermissions?.read, roleId, serverFunction]
  )

  useEffect(() => {
    if (!roleId) {
      setListView(null)
      return
    }
    void loadList()
  }, [loadList, roleId])

  const onQueryChange = useCallback(
    (query: ListQuery) => {
      void loadList(query)
    },
    [loadList]
  )

  const refresh = useCallback(async () => {
    await loadList()
  }, [loadList])

  if (!roleId) {
    return (
      <p className='m-0 text-[var(--theme-elevation-500)]'>
        {t('iam:rbac:roleUsersSaveRoleFirst')}
      </p>
    )
  }

  if (!docPermissions?.read) return null

  if (usersCount === 0) {
    return (
      <div className='field-type iam-role-users-embedded'>
        <div className='no-results'>
          <h3>{tGeneral('general:noResultsFound')}</h3>
          <p>{t('iam:rbac:roleUsersEmptyDescription')}</p>
        </div>
      </div>
    )
  }

  if (loading && !listView) {
    return <LoadingOverlay />
  }

  return (
    <div className='field-type iam-role-users-embedded'>
      <ListDrawerContextProvider
        allowCreate={false}
        enabledCollections={[ROLE_USERS_COLLECTION]}
        onQueryChange={onQueryChange}
        refresh={refresh}
        selectedOption={{
          label: t('iam:rbac:collectionUserPlural'),
          value: ROLE_USERS_COLLECTION,
        }}
      >
        {listView}
      </ListDrawerContextProvider>
    </div>
  )
}
