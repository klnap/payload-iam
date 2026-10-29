/** Payload `t()` keys for IAM RBAC UI copy (`iam:rbac:*` → `translations.iam.rbac`). */
export const IAM_RBAC_I18N_NS = 'iam:rbac'

export const IAM_EMAIL_I18N_NS = 'iam:email'

export type IamRbacTranslationKey = `${typeof IAM_RBAC_I18N_NS}:${string}`

export type IamEmailTranslationKey = `${typeof IAM_EMAIL_I18N_NS}:${string}`

/** All IAM plugin translation keys (extend when adding `iam:<module>:*` namespaces). */
export type IamTranslationKey = IamRbacTranslationKey | IamEmailTranslationKey

export function iamRbacKey(suffix: string): IamRbacTranslationKey {
  return `${IAM_RBAC_I18N_NS}:${suffix}`
}

export function tIam(
  t: unknown,
  key: IamTranslationKey,
  options?: Record<string, string | number>
): string {
  const fn = t as (key: string, options?: Record<string, string | number>) => string
  return fn(key, options)
}
