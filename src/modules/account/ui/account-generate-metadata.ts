import type { AdminViewServerProps } from 'payload'
import { accountDocumentTitleKey } from './account-route-meta'
import type { AccountTabId } from './tabs'

/** SSR `<title>` for `/account/*` custom views (client `AccountDocumentTitle` still updates in-browser). */
export function generateAccountTabMetadata(active: AccountTabId) {
  return async function generateMetadata({
    initPageResult,
  }: AdminViewServerProps): Promise<{ title: string }> {
    const { req } = initPageResult
    const key = accountDocumentTitleKey(active)
    const title = (req.i18n.t as (k: string) => string)(key)
    const suffix = req.payload.config.admin?.meta?.titleSuffix?.trim()
    return { title: suffix ? `${title}${suffix}` : title }
  }
}
