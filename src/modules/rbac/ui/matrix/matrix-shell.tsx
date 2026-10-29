'use client'

import type { CSSProperties, ReactNode, UIEvent } from 'react'
import { useCallback, useRef } from 'react'
import { cx } from 'tailwind-variants'
import { useIamTranslation } from '#iam/shared/i18n/use-iam-t'
import { MatrixColumnHeads } from './matrix-heads'
import { matrixMinWidthPx } from './matrix-tw'

type Props = {
  ops: string[]
  children: ReactNode
}

export function MatrixPermissionsFrame({ ops, children }: Props) {
  const { t } = useIamTranslation()
  const minWidth = matrixMinWidthPx(ops.length)
  const widthStyle = { minWidth: `${minWidth}px` } satisfies CSSProperties
  const headsScrollRef = useRef<HTMLDivElement>(null)
  const bodyScrollRef = useRef<HTMLDivElement>(null)

  const syncHeadsToBody = useCallback((e: UIEvent<HTMLDivElement>) => {
    const x = e.currentTarget.scrollLeft
    if (headsScrollRef.current && headsScrollRef.current.scrollLeft !== x) {
      headsScrollRef.current.scrollLeft = x
    }
  }, [])

  const syncBodyToHeads = useCallback((e: UIEvent<HTMLDivElement>) => {
    const x = e.currentTarget.scrollLeft
    if (bodyScrollRef.current && bodyScrollRef.current.scrollLeft !== x) {
      bodyScrollRef.current.scrollLeft = x
    }
  }, [])

  return (
    <div className={cx('iam-permissions-matrix w-full max-w-none')}>
      <div className='relative w-full min-w-0'>
        <div
          className={cx(
            'iam-matrix-heads-band sticky top-[var(--doc-controls-height,0px)] z-[3]',
            'mb-[calc(var(--base)*0.75)] -mx-[var(--gutter-h)] border-b border-[var(--theme-elevation-100)]',
            'px-[var(--gutter-h)] pt-[calc(var(--base)*0.85)] pb-[calc(var(--base)*0.45)]'
          )}
        >
          <div
            className={cx(
              'iam-matrix-heads-scroll w-full min-w-0 overflow-x-auto overflow-y-visible',
              '[scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden'
            )}
            onScroll={syncBodyToHeads}
            ref={headsScrollRef}
          >
            <div className='iam-matrix-heads-inner' style={widthStyle}>
              <MatrixColumnHeads ops={ops} />
            </div>
          </div>
        </div>
        <div
          className='w-full min-w-0 overflow-x-auto overflow-y-visible [scrollbar-gutter:stable]'
          onScroll={syncHeadsToBody}
          ref={bodyScrollRef}
        >
          <div style={widthStyle}>
            <div
              aria-label={t('iam:rbac:matrixRolePermissionsAria')}
              className={cx(
                'flex w-full min-w-full flex-col gap-[calc(var(--base)*0.9)] pt-[calc(var(--base)*0.35)]'
              )}
              role='region'
            >
              {children}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
