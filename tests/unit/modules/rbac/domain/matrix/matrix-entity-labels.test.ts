import { describe, expect, test } from 'bun:test'
import {
  isPayloadSystemEntity,
  matrixEntityLabel,
  pickLocalizedLabel,
} from '../../../../../../src/modules/rbac/domain/matrix/matrix-entity-labels'

describe('pickLocalizedLabel', () => {
  test('prefers non-empty string', () => {
    expect(pickLocalizedLabel('Posts')).toBe('Posts')
  })

  test('first string value from record', () => {
    expect(pickLocalizedLabel({ en: 'Posts', pl: 'Wpisy' })).toBe('Posts')
  })
})

describe('matrixEntityLabel', () => {
  test('falls back to slug', () => {
    expect(matrixEntityLabel({ slug: 'posts' })).toBe('posts')
  })

  test('uses labels.singular', () => {
    expect(matrixEntityLabel({ slug: 'posts', labels: { singular: 'Post' } })).toBe('Post')
  })
})

describe('isPayloadSystemEntity', () => {
  test('payload slug prefix', () => {
    expect(isPayloadSystemEntity({ slug: 'payload-kv' })).toBe(true)
  })

  test('payload label prefix', () => {
    expect(isPayloadSystemEntity({ slug: 'kv', label: 'Payload KV' })).toBe(true)
  })
})
