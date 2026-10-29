import type { AdminViewServerProps } from 'payload'
import type { AccountTabVisibility } from '#iam/modules/account/ui/account-tab-visibility'
import { resolveAccountTabVisibility } from '#iam/modules/account/ui/account-tab-visibility'
import type { AccountOverviewData } from '#iam/modules/account/ui/components/account-overview-panel'
import type { UserAuthAccountInsights } from '#iam/modules/users/domain/user-auth-account-insights'
import { readPayloadIamCustom } from '#iam/shared/config/payload-iam-custom'
import { loadAccountAuthInsights } from './load-account-auth-insights'
import { requireAccountUser } from './require-account-user'

function formatMemberSince(value: unknown): string {
  if (!value) return '—'
  const iso = typeof value === 'string' ? value : value instanceof Date ? value.toISOString() : ''
  if (!iso) return '—'
  try {
    return new Intl.DateTimeFormat(undefined, { dateStyle: 'long' }).format(new Date(iso))
  } catch {
    return iso
  }
}

export type AccountLanguageOption = { label: string; value: string }

/** Admin UI languages come from Payload `i18n.supportedLanguages` only (`initPageResult.languageOptions`). */
export function resolveAccountLanguageOptions(
  initOptions: AccountLanguageOption[]
): AccountLanguageOption[] {
  return initOptions
}

export type AccountOverviewContext = {
  authInsights: UserAuthAccountInsights
  data: AccountOverviewData
  languageOptions: AccountLanguageOption[]
  tabVisibility: AccountTabVisibility
}

export async function loadAccountOverviewContext(
  props: AdminViewServerProps
): Promise<AccountOverviewContext> {
  const user = requireAccountUser(props)
  const { req } = props.initPageResult
  const { payload } = req
  const usersSlug =
    typeof payload.config.admin?.user === 'string' ? payload.config.admin.user : 'users'

  const doc = await payload.findByID({
    collection: usersSlug,
    id: user.id,
    depth: 0,
    req,
    overrideAccess: false,
  })

  const roleLabelsRaw = (doc as { roleLabels?: unknown }).roleLabels
  const roleLabels = typeof roleLabelsRaw === 'string' ? roleLabelsRaw : ''

  const fullName = String((doc as { fullName?: string }).fullName ?? '')
  const email = String((doc as { email?: string }).email ?? '')

  const data: AccountOverviewData = {
    fullName,
    email,
    roleLabels,
    memberSince: formatMemberSince((doc as { createdAt?: unknown }).createdAt),
  }

  const languageOptions = resolveAccountLanguageOptions(
    (props.initPageResult.languageOptions ?? []).map((option) => {
      const raw = option as { code?: string; label?: string; value?: string }
      const value = raw.code ?? raw.value ?? ''
      return { label: String(raw.label ?? value), value: String(value) }
    })
  )

  const login = readPayloadIamCustom(
    payload.config.custom as Record<string, unknown> | undefined
  )?.login
  const googleLoginEnabled = Boolean(login?.google)
  const authInsights = await loadAccountAuthInsights(payload, String(user.id), googleLoginEnabled)

  const tabVisibility = resolveAccountTabVisibility({
    emailAndPassword: login?.emailAndPassword !== false,
    google: Boolean(login?.google),
    hasPassword: authInsights.hasPassword,
  })

  return { authInsights, data, languageOptions, tabVisibility }
}
