'use client'

import { useTranslation } from '@payloadcms/ui'
import type { IamTranslationKey } from '#iam/shared/i18n/t-iam'

/** Payload `t()` plus merged `iam:rbac:*` keys from plugin i18n. */
export function useIamTranslation() {
  return useTranslation<Record<string, unknown>, IamTranslationKey>()
}
