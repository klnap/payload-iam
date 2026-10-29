import type { IamTranslationKey } from '#iam/shared/i18n/t-iam'
import { iamPluginTranslations } from '#iam/shared/i18n/translations'

const enRbac = iamPluginTranslations.en.iam.rbac as Record<string, string>

/**
 * Plain string for `admin.components.views.*.meta.title`.
 * Payload Next `generateCustomViewMetadata` spreads meta without resolving `LabelFunction`.
 */
export function adminViewMetaTitleEn(key: IamTranslationKey): string {
  const suffix = key.slice('iam:rbac:'.length)
  const value = enRbac[suffix]
  if (!value) {
    throw new Error(`adminViewMetaTitleEn: missing en.iam.rbac.${suffix}`)
  }
  return value
}
