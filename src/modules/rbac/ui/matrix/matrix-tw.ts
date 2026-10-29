import { cx } from 'tailwind-variants'

/** Tailwind tokens for permissions matrix — scanned by host admin Tailwind (@source payload-iam). */

export const MATRIX_COLS_VAR = '--iam-matrix-cols'

const CHECK_COL = '2.25rem'
/** Fixed label track — keeps op columns vertically aligned across model + field rows. */
const LABEL_COL = '13rem'
const OP_COL = '4.75rem'

export function entityGrid(opsCount: number): string {
  return `${CHECK_COL} ${LABEL_COL} repeat(${opsCount}, ${OP_COL})`
}

export function matrixMinWidthPx(opsCount: number): number {
  const px = 16
  const rem = (n: number) => n * px
  return rem(2.25) + rem(13) + opsCount * rem(4.75) + rem(2)
}

/** Shared empty-state copy under matrix tabs / field blocks. */
export const matrixEmpty =
  'm-0 py-[calc(var(--base)*0.35)] text-sm font-normal leading-relaxed text-[var(--theme-elevation-500)]'

/** Base grid — `MatrixGrid` merges row-specific `className` on top. */
export const matrixGrid = cx(
  'grid w-full min-w-full items-center gap-x-[calc(var(--base)*0.45)] [grid-template-columns:var(--iam-matrix-cols)]',
  'iam-matrix-row-grid'
)

export const matrixLeadCell =
  'iam-matrix-lead-cell me-[calc(var(--base)*0.85)] flex items-center justify-center justify-self-center'

export const matrixLabelCell = 'flex min-w-0 items-center justify-start justify-self-stretch'

const matrixOpColBase = 'flex w-full items-center justify-center justify-self-center'

const matrixOpColBody = `${matrixOpColBase} min-h-[calc(var(--base)*2.25)]`

const matrixOpColHead = `${matrixOpColBase} min-h-0 py-0`

/** Permission column cell — shared by header row and entity/field rows. */
export function matrixOpColClasses(_opIndex: number, variant: 'head' | 'body' = 'body'): string {
  return variant === 'head' ? matrixOpColHead : matrixOpColBody
}
