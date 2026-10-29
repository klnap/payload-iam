'use client'

import { SetStepNav, useConfig } from '@payloadcms/ui'
import { useIamTranslation } from '#iam/shared/i18n/use-iam-t'
import { accountRouteLabels, buildAccountStepNav } from './account-route-meta'
import type { AccountTabId } from './tabs'

type Props = {
  active: AccountTabId
}

export default function AccountStepNav({ active }: Props) {
  const { t } = useIamTranslation()
  const { config } = useConfig()
  const adminRoute = config?.routes?.admin ?? '/admin'
  const labels = accountRouteLabels(active, t)
  const nav = buildAccountStepNav(active, labels, adminRoute)

  return <SetStepNav nav={nav} />
}
