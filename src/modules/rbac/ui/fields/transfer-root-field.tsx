'use client'

import {
  Button,
  ConfirmationModal,
  LoadingOverlayToggle,
  toast,
  useAuth,
  useDocumentInfo,
  useFormFields,
  useModal,
} from '@payloadcms/ui'
import { Fragment, useState } from 'react'
import { isRootRole } from '#iam/core/rbac/is-root-role'
import { effectiveIsRoot } from '#iam/modules/rbac/access/can'
import { transferRootToUser } from '#iam/modules/rbac/ui/api/transfer-root-api'
import { useIamTranslation } from '#iam/shared/i18n/use-iam-t'

const confirmModalSlug = 'iam-transfer-root-confirm'

function targetHasRoot(roles: unknown): boolean {
  if (!Array.isArray(roles)) return false
  return roles.some((r) => {
    if (r && typeof r === 'object' && 'name' in r) {
      return isRootRole(r as { name?: string })
    }
    return false
  })
}

/** Users edit Security tab — current Root transfers Root to this user. */
export default function TransferRootField() {
  const { id, docPermissions } = useDocumentInfo()
  const { user } = useAuth()
  const { t } = useIamTranslation()
  const { openModal } = useModal()
  const [busy, setBusy] = useState(false)

  const email = useFormFields(([fields]) =>
    fields.email?.value != null ? String(fields.email.value) : ''
  )
  const roles = useFormFields(([fields]) => fields.roles?.value)

  const userId = id != null ? String(id) : ''
  const canUpdate = Boolean(docPermissions?.update)
  const callerIsRoot = effectiveIsRoot(user as never)
  const isSelf = user?.id != null && userId && String(user.id) === userId

  if (!userId || !canUpdate || !callerIsRoot || isSelf || targetHasRoot(roles)) {
    return null
  }

  const onConfirmTransfer = async () => {
    if (busy) return
    setBusy(true)
    try {
      await transferRootToUser({ userId })
      toast.success(t('iam:rbac:transferRootSuccess'))
    } catch (err) {
      const message = err instanceof Error ? err.message : ''
      if (message.includes('another role')) {
        toast.error(t('iam:rbac:transferRootCallerNeedsRole'))
      } else if (message.includes('inactive')) {
        toast.error(t('iam:rbac:transferRootTargetInactive'))
      } else if (message.includes('already has Root')) {
        toast.error(t('iam:rbac:transferRootTargetIsRoot'))
      } else {
        toast.error(t('iam:rbac:transferRootFailed'))
      }
    } finally {
      setBusy(false)
    }
  }

  const confirmBody = email
    ? t('iam:rbac:transferRootConfirmBodyWithEmail', { email })
    : t('iam:rbac:transferRootConfirmBody')

  return (
    <Fragment>
      <div className='field-type mt-16 [&_.btn]:m-0 [&_.btn]:w-full'>
        <LoadingOverlayToggle
          loadingText={t('iam:rbac:transferRootTransferring')}
          name='iam-transfer-root'
          show={busy}
        />
        <Button
          buttonStyle='secondary'
          disabled={busy}
          onClick={() => openModal(confirmModalSlug)}
          size='large'
          type='button'
        >
          {t('iam:rbac:transferRoot')}
        </Button>
      </div>
      <ConfirmationModal
        body={confirmBody}
        cancelLabel={t('general:cancel')}
        confirmLabel={t('iam:rbac:transferRoot')}
        confirmingLabel={t('iam:rbac:transferRootTransferring')}
        heading={t('iam:rbac:transferRootConfirmHeading')}
        modalSlug={confirmModalSlug}
        onConfirm={onConfirmTransfer}
      />
    </Fragment>
  )
}
