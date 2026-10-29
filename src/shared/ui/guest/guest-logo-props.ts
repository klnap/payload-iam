import 'server-only'

import type { AdminViewServerProps } from 'payload'

export type GuestLogoProps = Pick<
  AdminViewServerProps,
  'initPageResult' | 'params' | 'searchParams'
>

export function guestLogoPropsFromAdminView(
  initPageResult: AdminViewServerProps['initPageResult'],
  params: AdminViewServerProps['params'],
  searchParams: AdminViewServerProps['searchParams']
): GuestLogoProps {
  return { initPageResult, params, searchParams }
}
