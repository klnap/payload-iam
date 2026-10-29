import { describe, expect, test } from 'bun:test'
import { matrixColsStyle } from '../../../../src/modules/rbac/ui/matrix/matrix-grid'
import { entityGrid, MATRIX_COLS_VAR } from '../../../../src/modules/rbac/ui/matrix/matrix-tw'

describe('entityGrid', () => {
  test('includes op column repeat', () => {
    expect(entityGrid(3)).toContain('repeat(3,')
  })
})

describe('matrixColsStyle', () => {
  test('sets CSS variable', () => {
    const style = matrixColsStyle(5)
    expect(style[MATRIX_COLS_VAR as keyof typeof style]).toBe(entityGrid(5))
  })
})
