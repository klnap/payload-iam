'use client'

import type { CSSProperties, HTMLAttributes, ReactNode } from 'react'
import { cn } from 'tailwind-variants'
import { entityGrid, MATRIX_COLS_VAR, matrixGrid } from './matrix-tw'

export function matrixColsStyle(opsCount: number): CSSProperties {
  return {
    [MATRIX_COLS_VAR]: entityGrid(opsCount),
    width: '100%',
    maxWidth: '100%',
  } as CSSProperties
}

type MatrixGridProps = {
  opsCount: number
  className?: string
  style?: CSSProperties
  children: ReactNode
} & Omit<HTMLAttributes<HTMLDivElement>, 'className' | 'children' | 'style'>

export function MatrixGrid({ opsCount, className, children, style, ...rest }: MatrixGridProps) {
  return (
    <div
      className={cn(matrixGrid, className)}
      style={{ ...matrixColsStyle(opsCount), ...style }}
      {...rest}
    >
      {children}
    </div>
  )
}
