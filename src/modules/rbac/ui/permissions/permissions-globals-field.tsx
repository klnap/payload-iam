'use client'

import { useConfig } from '@payloadcms/ui'
import { type FieldOp, type GlobalOp, walkFieldPaths } from '#iam/core/permissions/shape'
import { entityHasAnyOp } from '#iam/core/permissions/subset'
import {
  GLOBAL_MATRIX_FIELD_OPS,
  globalEntityGrantsFieldOp,
  globalEntityMatrixOps,
  globalMatrixFrameOps,
  globalMatrixOpAllowed,
} from '#iam/core/rbac/global-matrix-model'
import { fieldMatrixOps } from '#iam/core/rbac/register-model'
import {
  isPayloadSystemEntity,
  type MatrixEntityLabelSource,
  matrixEntityLabel,
} from '#iam/modules/rbac/domain/matrix/matrix-entity-labels'
import { createModelMatrixHandlers } from '#iam/modules/rbac/domain/matrix/matrix-model-handlers'
import { useCallerCeiling } from '#iam/modules/rbac/ui/hooks/use-caller-ceiling'
import { matrixEmpty } from '#iam/modules/rbac/ui/matrix/matrix-tw'
import {
  FieldPermissionsBlock,
  MatrixEntityRow,
  MatrixPermissionsFrame,
  usePermissionsField,
} from '#iam/modules/rbac/ui/matrix/matrix-ui'
import { useIamTranslation } from '#iam/shared/i18n/use-iam-t'

const GLOBAL_FIELD_OPS: FieldOp[] = [...GLOBAL_MATRIX_FIELD_OPS]

export default function PermissionsGlobalsField() {
  const { t } = useIamTranslation()
  const { perms, patch } = usePermissionsField()
  const { config } = useConfig()
  const ceiling = useCallerCeiling()

  const globals = ((config?.globals ?? []) as MatrixEntityLabelSource[])
    .filter((g) => g.slug && !isPayloadSystemEntity(g))
    .filter((g) => {
      if (ceiling === 'root') return true
      return entityHasAnyOp(ceiling?.globals?.[g.slug])
    })

  if (globals.length === 0) {
    return <p className={matrixEmpty}>{t('iam:rbac:matrixNoGlobals')}</p>
  }

  const frameOps = globalMatrixFrameOps(globals)

  return (
    <MatrixPermissionsFrame ops={frameOps}>
      {globals.map((g) => {
        const entityOps = globalEntityMatrixOps(g)
        const row = perms.globals?.[g.slug] ?? {}
        const fields = walkFieldPaths(g.fields as never)
        const can = (op: GlobalOp) => globalMatrixOpAllowed(ceiling, g.slug, op)
        const allowedOps = entityOps.filter(can)
        const allOn = allowedOps.length > 0 && allowedOps.every((op) => row[op] === true)
        const { setOp, setAll, setField, setFieldAll } = createModelMatrixHandlers({
          perms,
          patch,
          bucket: 'globals',
          slug: g.slug,
          row,
          entityOps,
          fieldOps: GLOBAL_FIELD_OPS,
          fields,
          can,
        })

        return (
          <MatrixEntityRow
            allOn={allOn}
            columns={frameOps}
            key={g.slug}
            label={matrixEntityLabel(g)}
            opAllowed={(op) => can(op as GlobalOp)}
            opChecked={(op) => Boolean(row[op as GlobalOp])}
            ops={entityOps}
            onToggleAll={setAll}
            onToggleOp={(op, on) => setOp(op as GlobalOp, on)}
            slug={g.slug}
          >
            <FieldPermissionsBlock
              columns={frameOps}
              fieldOpAllowed={(fp, op) => {
                if (op === 'read' && !can('read')) return false
                if ((op === 'create' || op === 'update') && !can('update')) return false
                const meta = fields.find((f) => f.path === fp)
                if (!meta) return false
                return fieldMatrixOps(meta, GLOBAL_FIELD_OPS).includes(op as FieldOp)
              }}
              fields={fields}
              opChecked={(fp, op) => Boolean(row.fields?.[fp]?.[op as FieldOp])}
              ops={GLOBAL_FIELD_OPS}
              parentOpOn={(op) => globalEntityGrantsFieldOp(row, op as FieldOp)}
              prefix={g.slug}
              onToggleFieldAll={setFieldAll}
              onToggleFieldOp={(fp, op, on) => setField(fp, op as FieldOp, on)}
            />
          </MatrixEntityRow>
        )
      })}
    </MatrixPermissionsFrame>
  )
}
