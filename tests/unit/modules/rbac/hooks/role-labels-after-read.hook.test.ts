import { describe, expect, test } from 'bun:test'
import { roleLabelsAfterRead } from '../../../../../src/modules/rbac/hooks/role-labels-after-read.hook'

describe('roleLabelsAfterRead', () => {
  test('populated role objects → joined names', async () => {
    const label = await roleLabelsAfterRead({
      data: {
        roles: [
          { id: '1', name: 'Editor' },
          { id: '2', name: 'Root' },
        ],
      },
      req: {} as never,
    } as never)
    expect(label).toBe('Editor, Root')
  })

  test('empty roles → em dash', async () => {
    const label = await roleLabelsAfterRead({
      data: { roles: [] },
      req: {} as never,
    } as never)
    expect(label).toBe('—')
  })

  test('id list → finds names via payload.find', async () => {
    const find = async () => ({
      docs: [
        { id: 'a', name: 'Editor' },
        { id: 'b', name: 'Viewer' },
      ],
    })
    const label = await roleLabelsAfterRead({
      data: { roles: ['a', 'b'] },
      req: { payload: { find } },
    } as never)
    expect(label).toBe('Editor, Viewer')
  })

  test('unknown id falls back to id string', async () => {
    const find = async () => ({ docs: [{ id: 'a', name: 'Editor' }] })
    const label = await roleLabelsAfterRead({
      data: { roles: ['a', 'missing'] },
      req: { payload: { find } },
    } as never)
    expect(label).toBe('Editor, missing')
  })
})
