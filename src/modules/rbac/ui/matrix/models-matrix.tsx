'use client'

import { useConfig } from '@payloadcms/ui'
import { AUTH_MATRIX_SLUGS } from '#iam/core/permissions/matrix-constants'
import { type CollectionOp, type FieldOp, walkFieldPaths } from '#iam/core/permissions/shape'
import { entityHasAnyOp, opAllowed } from '#iam/core/permissions/subset'
import {
  COLLECTION_MATRIX_FIELD_OPS,
  collectionEntityMatrixOps,
  collectionMatrixFrameOps,
} from '#iam/core/rbac/collection-matrix-model'
import { fieldMatrixOps } from '#iam/core/rbac/register-model'
import {
  isPayloadSystemEntity,
  type MatrixEntityLabelSource,
  matrixEntityLabel,
} from '#iam/modules/rbac/domain/matrix/matrix-entity-labels'
import { createModelMatrixHandlers } from '#iam/modules/rbac/domain/matrix/matrix-model-handlers'
import { useCallerCeiling } from '#iam/modules/rbac/ui/hooks/use-caller-ceiling'
import { useIamTranslation } from '#iam/shared/i18n/use-iam-t'
import { matrixEmpty } from './matrix-tw'
import {
  FieldPermissionsBlock,
  MatrixEntityRow,
  MatrixPermissionsFrame,
  usePermissionsField,
} from './matrix-ui'

export type ModelsMatrixMode = 'content' | 'auth'

export function visibleModels(
  entities: MatrixEntityLabelSource[],
  mode: ModelsMatrixMode
): MatrixEntityLabelSource[] {
  return entities.filter((c) => {
    if (!c.slug || isPayloadSystemEntity(c)) return false
    const isAuth = AUTH_MATRIX_SLUGS.has(c.slug)
    return mode === 'auth' ? isAuth : !isAuth
  })
}

const FIELD_OPS: FieldOp[] = [...COLLECTION_MATRIX_FIELD_OPS]

/** Shared model permissions matrix — content CMS vs Auth package. */
export default function ModelsMatrix({ mode }: { mode: ModelsMatrixMode }) {
  const { t } = useIamTranslation()
  const { perms, patch } = usePermissionsField()
  const { config } = useConfig()
  const ceiling = useCallerCeiling()

  const collections = visibleModels(
    (config?.collections ?? []) as MatrixEntityLabelSource[],
    mode
  ).filter((c) => {
    if (ceiling === 'root') return true
    return entityHasAnyOp(ceiling?.collections?.[c.slug])
  })

  if (collections.length === 0) {
    return (
      <p className={matrixEmpty}>
        {mode === 'auth'
          ? t('iam:rbac:matrixNoAuthCollections')
          : t('iam:rbac:matrixNoContentCollections')}
      </p>
    )
  }

  const frameOps = collectionMatrixFrameOps(collections)

  return (
    <MatrixPermissionsFrame ops={frameOps}>
      {collections.map((col) => {
        const entityOps = collectionEntityMatrixOps(col)
        const row = perms.collections?.[col.slug] ?? {}
        const fields = walkFieldPaths(col.fields as never)
        const can = (op: CollectionOp) => opAllowed(ceiling, 'collections', col.slug, op)
        const allowedOps = entityOps.filter(can)
        const allOn = allowedOps.length > 0 && allowedOps.every((op) => row[op] === true)
        const { setOp, setAll, setField, setFieldAll } = createModelMatrixHandlers({
          perms,
          patch,
          bucket: 'collections',
          slug: col.slug,
          row,
          entityOps,
          fieldOps: FIELD_OPS,
          fields,
          can,
        })

        return (
          <MatrixEntityRow
            allOn={allOn}
            columns={frameOps}
            key={col.slug}
            label={matrixEntityLabel(col)}
            opAllowed={(op) => can(op as CollectionOp)}
            opChecked={(op) => Boolean(row[op as CollectionOp])}
            ops={entityOps}
            onToggleAll={setAll}
            onToggleOp={(op, on) => setOp(op as CollectionOp, on)}
            slug={col.slug}
          >
            <FieldPermissionsBlock
              columns={frameOps}
              fieldOpAllowed={(fp, op) => {
                if (!can(op as CollectionOp)) return false
                const meta = fields.find((f) => f.path === fp)
                if (!meta) return false
                return fieldMatrixOps(meta, FIELD_OPS).includes(op as FieldOp)
              }}
              fields={fields}
              opChecked={(fp, op) => Boolean(row.fields?.[fp]?.[op as FieldOp])}
              ops={FIELD_OPS}
              parentOpOn={(op) => row[op as CollectionOp] === true}
              prefix={col.slug}
              onToggleFieldAll={setFieldAll}
              onToggleFieldOp={(fp, op, on) => setField(fp, op as FieldOp, on)}
            />
          </MatrixEntityRow>
        )
      })}
    </MatrixPermissionsFrame>
  )
}
