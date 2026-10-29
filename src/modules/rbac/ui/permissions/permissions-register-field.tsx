'use client'

import type { FieldOp } from '#iam/core/permissions/shape'
import { entityHasAnyOp, opAllowed } from '#iam/core/permissions/subset'
import {
  fieldMatrixOps,
  type NormalizedRbacRegisterItem,
  unionRegisterTabOps,
} from '#iam/core/rbac/register-model'
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

type Props = {
  field?: {
    admin?: {
      custom?: {
        rbacRegisterTab?: string
        rbacRegisterItems?: NormalizedRbacRegisterItem[]
      }
    }
  }
}

export default function PermissionsRegisterField(props: Props) {
  const { t } = useIamTranslation()
  const ceiling = useCallerCeiling()
  const { perms, patch } = usePermissionsField()
  const rawItems = props.field?.admin?.custom?.rbacRegisterItems?.filter((v) => v.id) ?? []
  const items = rawItems.filter((item) => {
    if (ceiling === 'root') return true
    return entityHasAnyOp(ceiling?.register?.[item.id])
  })

  if (items.length === 0) {
    return <p className={matrixEmpty}>{t('iam:rbac:matrixNoRoutesRegistered')}</p>
  }

  const tabOps = unionRegisterTabOps(items)

  return (
    <MatrixPermissionsFrame ops={tabOps}>
      {items.map((item) => {
        const row = perms.register?.[item.id] ?? {}
        const can = (op: string) => opAllowed(ceiling, 'register', item.id, op)
        const allowedOps = item.ops.filter(can)
        const allOn = allowedOps.length > 0 && allowedOps.every((op) => row[op] === true)
        const { setOp, setAll, setField, setFieldAll } = createModelMatrixHandlers({
          perms,
          patch,
          bucket: 'register',
          slug: item.id,
          row,
          entityOps: item.ops,
          fieldOps: item.fieldOps,
          fields: item.fields,
          can,
        })

        return (
          <MatrixEntityRow
            allOn={allOn}
            columns={tabOps}
            key={item.id}
            label={item.label}
            opAllowed={can}
            opChecked={(op) => Boolean(row[op])}
            ops={[...item.ops]}
            onToggleAll={setAll}
            onToggleOp={setOp}
            slug={item.id}
          >
            {item.fields.length > 0 ? (
              <FieldPermissionsBlock
                columns={tabOps}
                fieldOpAllowed={(fp, op) => {
                  if (!can(op)) return false
                  const meta = item.fields.find((f) => f.path === fp)
                  if (!meta) return false
                  if (op === 'update' && meta.allowUpdate === false) return false
                  return fieldMatrixOps(meta, item.fieldOps).includes(op as FieldOp)
                }}
                fields={item.fields}
                opChecked={(fp, op) => Boolean(row.fields?.[fp]?.[op as FieldOp])}
                ops={[...item.fieldOps]}
                parentOpOn={(op) => row[op] === true}
                prefix={item.id}
                onToggleFieldAll={setFieldAll}
                onToggleFieldOp={(fp, op, on) => setField(fp, op as FieldOp, on)}
              />
            ) : null}
          </MatrixEntityRow>
        )
      })}
    </MatrixPermissionsFrame>
  )
}
