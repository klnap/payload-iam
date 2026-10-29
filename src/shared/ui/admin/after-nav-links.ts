import type { CustomComponent } from 'payload'

/** Import map path for {@link AccessNavLink} — keep in sync with payload-plugin registration. */
export const ACCESS_ADMIN_NAV_LINK = '@klnap/payload-iam/client#AccessNavLink'

type AfterNavLink = CustomComponent

/** IAM Access nav must stay last among `admin.components.afterNavLinks` (e.g. after Schedule). */
export function pinAccessNavLinkLast(links: readonly AfterNavLink[]): AfterNavLink[] {
  const rest = links.filter((link) => link !== ACCESS_ADMIN_NAV_LINK)
  if (!links.includes(ACCESS_ADMIN_NAV_LINK)) return [...rest]
  return [...rest, ACCESS_ADMIN_NAV_LINK]
}

export function withAccessAdminNavLink(links: readonly AfterNavLink[]): AfterNavLink[] {
  const next = links.includes(ACCESS_ADMIN_NAV_LINK)
    ? [...links]
    : [...links, ACCESS_ADMIN_NAV_LINK]
  return pinAccessNavLinkLast(next)
}

/** Insert a custom nav link before Access (Access remains last). */
export function insertAfterNavLinkBeforeAccess(
  links: readonly AfterNavLink[],
  link: AfterNavLink
): AfterNavLink[] {
  const without = links.filter((l) => l !== link && l !== ACCESS_ADMIN_NAV_LINK)
  const hadAccess = links.includes(ACCESS_ADMIN_NAV_LINK)
  const withLink = without.includes(link) ? without : [...without, link]
  return hadAccess ? [...withLink, ACCESS_ADMIN_NAV_LINK] : withLink
}
