'use client'

import { CheckboxInput, ChevronIcon, Collapsible, RowLabel } from '@payloadcms/ui'
import { type MouseEvent, type ReactNode, useId, useState } from 'react'
import { cx } from 'tailwind-variants'
import { matrixLeafFieldLabel } from '#iam/core/permissions/shape'
import { fieldAncestorOpsAllow } from '#iam/modules/rbac/domain/matrix/matrix-field-tree'
import { useIamTranslation } from '#iam/shared/i18n/use-iam-t'
import { MatrixGrid } from './matrix-grid'
import { matrixEmpty, matrixLabelCell, matrixLeadCell, matrixOpColClasses } from './matrix-tw'

export { MatrixColumnHeads } from './matrix-heads'
export { MatrixPermissionsFrame } from './matrix-shell'
export { useLocalPermissionsUntilSave } from './use-local-permissions-until-save'
export { usePermissionsField } from './use-permissions-field'

export function OpCheckbox({
  checked,
  disabled,
  name,
  ariaLabel,
  onChange,
}: {
  checked: boolean
  disabled?: boolean
  name: string
  ariaLabel?: string
  onChange: (on: boolean) => void
}) {
  const stopBubble = (e: MouseEvent) => {
    e.stopPropagation()
  }

  return (
    <span
      className={cx(
        'relative z-[2] flex size-[2rem] shrink-0 items-center justify-center leading-none',
        '[&_.checkbox-input]:!m-0 [&_input[type=checkbox]]:cursor-pointer',
        '[&_.checkbox-input--read-only_input[type=checkbox]]:cursor-not-allowed',
        disabled && 'opacity-45'
      )}
      data-iam-check
      onClick={stopBubble}
      onPointerDown={stopBubble}
    >
      <CheckboxInput
        aria-label={ariaLabel ?? name}
        checked={checked}
        id={name}
        Label={null}
        name={name}
        onToggle={(e) => {
          if (disabled) return
          onChange(e.target.checked)
        }}
        readOnly={Boolean(disabled)}
      />
    </span>
  )
}

function MatrixFieldLabel({ label }: { label: string }) {
  return (
    <span
      className={cx(
        'row-label block min-w-0 overflow-visible text-base font-normal leading-snug text-clip whitespace-normal',
        'text-[var(--theme-elevation-700)] [overflow-wrap:anywhere] break-words'
      )}
      title={label}
    >
      {matrixLeafFieldLabel(label)}
    </span>
  )
}

type MatrixEntityRowProps = {
  ops: string[]
  columns?: string[]
  label: string
  slug: string
  allOn: boolean
  opChecked: (op: string) => boolean
  opAllowed?: (op: string) => boolean
  onToggleAll: (on: boolean) => void
  onToggleOp: (op: string, on: boolean) => void
  children?: ReactNode
}

export function MatrixEntityRow({
  ops,
  columns,
  label,
  slug,
  allOn,
  opChecked,
  opAllowed,
  onToggleAll,
  onToggleOp,
  children,
}: MatrixEntityRowProps) {
  const { t } = useIamTranslation()
  const [collapsed, setCollapsed] = useState(true)
  const panelId = useId()
  const opAria = (op: string, context: string) => t('iam:rbac:matrixOpAria', { context, op })
  const canOp = (op: string) => opAllowed?.(op) !== false
  const colOps = columns ?? ops
  const rowOpSet = new Set(ops)

  const toggleCollapsed = () => setCollapsed((c) => !c)

  const onHeaderActivate = (e: MouseEvent) => {
    if (e.target instanceof Element && e.target.closest('[data-iam-check]')) return
    toggleCollapsed()
  }

  const header = (
    <MatrixGrid
      className={cx(
        'iam-matrix-row iam-matrix-entity-row items-center',
        'min-h-[calc(var(--base)*2.85)] py-[calc(var(--base)*0.45)]',
        'cursor-pointer select-none [&_[data-iam-check]]:cursor-default'
      )}
      onClick={onHeaderActivate}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault()
          toggleCollapsed()
        }
      }}
      opsCount={colOps.length}
      role='button'
      tabIndex={0}
    >
      <span className={matrixLeadCell}>
        <OpCheckbox
          ariaLabel={opAria('all', label)}
          checked={allOn}
          disabled={ops.every((op) => !canOp(op))}
          name={`${slug}-all`}
          onChange={onToggleAll}
        />
      </span>
      <span className='iam-matrix-entity-label flex min-w-0 items-center justify-start justify-self-stretch'>
        <RowLabel
          className={cx(
            'row-label min-w-0 overflow-visible text-lg font-medium leading-snug text-clip whitespace-normal',
            '[overflow-wrap:anywhere] break-words'
          )}
          label={label}
          path={slug}
        />
      </span>
      {colOps.map((op, opIndex) => {
        if (!rowOpSet.has(op)) {
          return <span aria-hidden className={matrixOpColClasses(opIndex)} key={op} />
        }
        return (
          <span className={matrixOpColClasses(opIndex)} key={op}>
            <OpCheckbox
              ariaLabel={opAria(op, label)}
              checked={opChecked(op)}
              disabled={!canOp(op)}
              name={`${slug}-${op}`}
              onChange={(on) => onToggleOp(op, on)}
            />
          </span>
        )
      })}
    </MatrixGrid>
  )

  return (
    <Collapsible
      actions={
        <button
          aria-controls={panelId}
          aria-expanded={!collapsed}
          aria-label={
            collapsed
              ? t('iam:rbac:matrixExpandSection', { label })
              : t('iam:rbac:matrixCollapseSection', { label })
          }
          className='iam-matrix-expand'
          onClick={(e) => {
            e.stopPropagation()
            toggleCollapsed()
          }}
          type='button'
        >
          <ChevronIcon direction={collapsed ? undefined : 'up'} />
        </button>
      }
      className='iam-matrix-card'
      disableHeaderToggle
      disableToggleIndicator
      header={header}
      initCollapsed
      isCollapsed={collapsed}
      onToggle={setCollapsed}
    >
      <div className='w-full min-w-0' id={panelId}>
        {children}
      </div>
    </Collapsible>
  )
}

type FieldPermissionsBlockProps = {
  columns: string[]
  ops: string[]
  fields: Array<{ path: string; label: string; allowUpdate?: boolean; ops?: string[] }>
  prefix: string
  parentOpOn: (op: string) => boolean
  fieldOpAllowed?: (path: string, op: string) => boolean
  /** Map entity column id → field op (e.g. globals: publish column → field update). */
  fieldOpForColumn?: (column: string, fieldRowOps: readonly string[]) => string | null
  opChecked: (path: string, op: string) => boolean
  onToggleFieldOp: (path: string, op: string, on: boolean) => void
  onToggleFieldAll: (path: string, on: boolean) => void
}

export function FieldPermissionsBlock({
  columns,
  ops,
  fields,
  prefix,
  parentOpOn,
  fieldOpAllowed,
  fieldOpForColumn,
  opChecked,
  onToggleFieldOp,
  onToggleFieldAll,
}: FieldPermissionsBlockProps) {
  const { t } = useIamTranslation()
  const opAria = (op: string, context: string) => t('iam:rbac:matrixOpAria', { context, op })
  if (fields.length === 0) {
    return <p className={matrixEmpty}>{t('iam:rbac:matrixNoFieldPermissions')}</p>
  }

  const fieldOpOn = (path: string, op: string) => opChecked(path, op)

  const fieldOpEnabled = (fp: string, op: string) => {
    if (!parentOpOn(op)) return false
    if (fieldOpAllowed?.(fp, op) === false) return false
    return fieldAncestorOpsAllow(fp, op, fieldOpOn)
  }

  const anyParent = ops.some((op) => parentOpOn(op))

  return (
    <div
      className={cx(
        'relative flex w-[calc(100%+var(--base)*1.8)] max-w-none flex-col',
        'gap-[calc(var(--base)*0.15)]',
        '-mx-[calc(var(--base)*0.9)] px-[calc(var(--base)*0.9)] pt-[calc(var(--base)*0.35)]',
        'before:pointer-events-none before:absolute before:inset-x-0 before:top-0 before:border-t',
        'before:border-[var(--theme-elevation-150)] before:opacity-55'
      )}
    >
      {fields.map(({ path: fp, label, allowUpdate, ops: fieldRowOps }) => {
        const rowOps = fieldRowOps?.length ? fieldRowOps : ops
        const fieldOpSet = new Set(rowOps)
        const fieldAllows = (op: string) => {
          if (allowUpdate === false && op === 'update') return false
          return fieldOpAllowed?.(fp, op) !== false
        }
        const enabledOps = rowOps.filter((op) => fieldOpEnabled(fp, op) && fieldAllows(op))
        const allOn = enabledOps.length > 0 && enabledOps.every((op) => opChecked(fp, op))
        return (
          <MatrixGrid
            className={cx(
              'iam-matrix-row iam-matrix-field-row',
              'min-h-[calc(var(--base)*2.35)] py-[calc(var(--base)*0.3)]'
            )}
            key={fp}
            opsCount={columns.length}
          >
            <span className={matrixLeadCell}>
              <OpCheckbox
                ariaLabel={opAria('all', label)}
                checked={allOn}
                disabled={!anyParent || enabledOps.length === 0}
                name={`${prefix}.${fp}-all`}
                onChange={(on) => onToggleFieldAll(fp, on)}
              />
            </span>
            <span className={matrixLabelCell}>
              <MatrixFieldLabel label={label} />
            </span>
            {columns.map((col, opIndex) => {
              const fieldOp = fieldOpForColumn?.(col, rowOps) ?? (fieldOpSet.has(col) ? col : null)
              if (!fieldOp) {
                return <span aria-hidden className={matrixOpColClasses(opIndex)} key={col} />
              }
              const enabled = fieldOpEnabled(fp, fieldOp) && fieldAllows(fieldOp)
              return (
                <span className={matrixOpColClasses(opIndex)} key={col}>
                  <OpCheckbox
                    ariaLabel={opAria(fieldOp, label)}
                    checked={enabled && opChecked(fp, fieldOp)}
                    disabled={!enabled}
                    name={`${prefix}.${fp}-${fieldOp}`}
                    onChange={(on) => onToggleFieldOp(fp, fieldOp, on)}
                  />
                </span>
              )
            })}
          </MatrixGrid>
        )
      })}
    </div>
  )
}
