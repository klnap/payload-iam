import { describe, expect, test } from 'bun:test'
import {
  accessCollectionListPath,
  isAccessHubPath,
  listSearchParamsWithoutView,
  parseAccessCollectionListTab,
  parseAccessTabFromPath,
  parseAccessViewParam,
} from '../../../../src/shared/paths/access-paths'

describe('access-paths', () => {
  test('parseAccessViewParam', () => {
    expect(parseAccessViewParam({ view: 'users' })).toBe('users')
    expect(parseAccessViewParam({ view: 'roles' })).toBe('roles')
    expect(parseAccessViewParam({})).toBe(null)
    expect(parseAccessViewParam({ view: 'nope' })).toBe(null)
  })

  test('isAccessHubPath', () => {
    expect(isAccessHubPath('/access', '/')).toBe(true)
    expect(isAccessHubPath('/collections/users', '/')).toBe(false)
  })

  test('listSearchParamsWithoutView', () => {
    expect(listSearchParamsWithoutView({ view: 'users', page: '2' })).toEqual({ page: '2' })
  })

  test('accessCollectionListPath', () => {
    expect(accessCollectionListPath('users')).toBe('/collections/users')
  })

  test('parseAccessCollectionListTab', () => {
    expect(parseAccessCollectionListTab('/collections/users', '/')).toBe('users')
    expect(parseAccessCollectionListTab('/collections/users/abc', '/')).toBe(null)
    expect(parseAccessCollectionListTab('/admin/collections/roles', '/admin')).toBe('roles')
  })

  test('parseAccessTabFromPath includes document routes', () => {
    expect(parseAccessTabFromPath('/collections/users/abc', '/')).toBe('users')
  })
})
