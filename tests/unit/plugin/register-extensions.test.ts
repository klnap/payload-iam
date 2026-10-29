import { describe, expect, test } from 'bun:test'
import { resolveRbacRegisterConfig } from '../../../src/plugin/resolve-register-config'
import { resolveRbacModules } from '../../../src/types/modules'

describe('registerExtensions', () => {
  test('merges host extension tabs', () => {
    const resolved = resolveRbacRegisterConfig(
      {
        registerExtensions: [
          () => [
            {
              tab: 'Pkg',
              items: [{ id: 'from-host', label: 'From host glue' }],
            },
          ],
        ],
      },
      resolveRbacModules()
    )
    expect(resolved).toEqual([
      {
        tab: 'Pkg',
        items: [
          expect.objectContaining({
            id: 'from-host',
            ops: ['read'],
          }),
        ],
      },
    ])
  })
})
