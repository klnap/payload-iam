import { describe, expect, test } from 'bun:test'
import { roleLabelsIndicateRoot } from '../../../../../src/modules/rbac/ui/hooks/use-caller-ceiling'

describe('roleLabelsIndicateRoot', () => {
  test('detects Root in comma-separated labels', () => {
    expect(roleLabelsIndicateRoot({ roleLabels: 'E2E Reader, Root' })).toBe(true)
    expect(roleLabelsIndicateRoot({ roleLabels: 'Root' })).toBe(true)
  })

  test('ignores partial name matches', () => {
    expect(roleLabelsIndicateRoot({ roleLabels: 'Rootish' })).toBe(false)
    expect(roleLabelsIndicateRoot({ roleLabels: 'E2E Junior IAM' })).toBe(false)
  })
})
