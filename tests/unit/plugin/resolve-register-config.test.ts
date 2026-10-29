import { describe, expect, test } from 'bun:test'
import { resolveRbacRegisterConfig } from '../../../src/plugin/resolve-register-config'
import { resolveRbacModules } from '../../../src/types/modules'

describe('resolveRbacRegisterConfig', () => {
  const modules = resolveRbacModules()

  test('merges register tabs and models', () => {
    const resolved = resolveRbacRegisterConfig(
      {
        register: [
          {
            tab: 'Other',
            items: [{ id: 'a', label: 'A' }],
          },
        ],
        models: [{ id: 'b', label: 'B', tab: 'Integrations' }],
      },
      modules
    )
    expect(resolved.map((t) => t.tab).sort()).toEqual(['Integrations', 'Other'])
    expect(resolved.find((t) => t.tab === 'Other')?.items[0]?.ops).toEqual(['read'])
  })

  test('rejects duplicate ids across sources', () => {
    expect(() =>
      resolveRbacRegisterConfig(
        {
          register: [{ tab: 'T', items: [{ id: 'dup', label: '1' }] }],
          models: [{ id: 'dup', label: '2' }],
        },
        modules
      )
    ).toThrow(/duplicate/)
  })
})
