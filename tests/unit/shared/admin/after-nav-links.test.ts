import { describe, expect, test } from 'bun:test'

import {
  ACCESS_ADMIN_NAV_LINK,
  insertAfterNavLinkBeforeAccess,
  pinAccessNavLinkLast,
  withAccessAdminNavLink,
} from '../../../../src/shared/ui/admin/after-nav-links'

const OTHER = '@example/other#Nav'

describe('after-nav-links', () => {
  test('pinAccessNavLinkLast moves Access to the end', () => {
    expect(pinAccessNavLinkLast([ACCESS_ADMIN_NAV_LINK, OTHER])).toEqual([
      OTHER,
      ACCESS_ADMIN_NAV_LINK,
    ])
  })

  test('withAccessAdminNavLink appends Access when missing', () => {
    expect(withAccessAdminNavLink([OTHER])).toEqual([OTHER, ACCESS_ADMIN_NAV_LINK])
  })

  test('insertAfterNavLinkBeforeAccess keeps Access last', () => {
    const schedule = '@example/host-plugin/client#ScheduledEventsNavLink'
    expect(insertAfterNavLinkBeforeAccess([ACCESS_ADMIN_NAV_LINK], schedule)).toEqual([
      schedule,
      ACCESS_ADMIN_NAV_LINK,
    ])
    expect(insertAfterNavLinkBeforeAccess([OTHER, ACCESS_ADMIN_NAV_LINK], schedule)).toEqual([
      OTHER,
      schedule,
      ACCESS_ADMIN_NAV_LINK,
    ])
  })
})
