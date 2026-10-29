'use client'

import { cx } from 'tailwind-variants'
import { MatrixGrid } from './matrix-grid'
import { matrixLabelCell, matrixLeadCell, matrixOpColClasses } from './matrix-tw'

export function MatrixColumnHeads({ ops }: { ops: string[] }) {
  return (
    <MatrixGrid
      className={cx(
        'iam-matrix-row min-h-0 py-0',
        'pt-[calc(var(--base)*0.25)] pb-[calc(var(--base)*0.35)]'
      )}
      opsCount={ops.length}
    >
      <span aria-hidden className={matrixLeadCell} />
      <span aria-hidden className={matrixLabelCell} />
      {ops.map((op, opIndex) => (
        <span className={matrixOpColClasses(opIndex, 'head')} key={op} role='columnheader'>
          <span
            className={cx(
              'm-0 block w-full text-center text-[0.9rem] font-normal uppercase leading-none tracking-wide',
              'text-[var(--theme-elevation-400)]'
            )}
          >
            {op}
          </span>
        </span>
      ))}
    </MatrixGrid>
  )
}
