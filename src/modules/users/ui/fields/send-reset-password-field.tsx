'use client'

import {
  Button,
  ConfirmationModal,
  LoadingOverlayToggle,
  toast,
  useConfig,
  useDocumentInfo,
  useFormFields,
  useModal,
} from '@payloadcms/ui'
import { Fragment, useState } from 'react'
import { sendUserPasswordReset } from '#iam/modules/users/ui/api/send-reset-password-api'
import { readPayloadIamCustom } from '#iam/shared/config/payload-iam-custom'
import { useIamTranslation } from '#iam/shared/i18n/use-iam-t'

const confirmModalSlug = 'iam-send-reset-password-confirm'

/** Users edit Security tab — send Better Auth password reset email. */
export default function SendResetPasswordField() {
  const { id, docPermissions } = useDocumentInfo()
  const { config } = useConfig()
  const { t } = useIamTranslation()
  const { openModal } = useModal()
  const [busy, setBusy] = useState(false)

  const email = useFormFields(([fields]) =>
    fields.email?.value != null ? String(fields.email.value) : ''
  )

  const loginCustom = readPayloadIamCustom(
    config.custom as Record<string, unknown> | undefined
  )?.login
  const forgotEnabled =
    loginCustom?.forgotPassword !== false && loginCustom?.emailAndPassword !== false

  const userId = id != null ? String(id) : ''
  const canUpdate = Boolean(docPermissions?.update)

  if (!forgotEnabled || !userId || !canUpdate) return null

  const onConfirmSend = async () => {
    if (busy) return
    setBusy(true)
    try {
      const result = await sendUserPasswordReset({ userId })
      toast.success(
        result.kind === 'set'
          ? t('iam:rbac:sendSetPasswordSent')
          : t('iam:rbac:sendResetPasswordSent')
      )
    } catch (err) {
      const message = err instanceof Error ? err.message : ''
      if (message.includes('inactive')) {
        toast.error(t('iam:rbac:sendResetPasswordInactive'))
      } else {
        toast.error(t('iam:rbac:sendResetPasswordFailed'))
      }
    } finally {
      setBusy(false)
    }
  }

  const confirmBody = email
    ? t('iam:rbac:sendResetPasswordConfirmBodyWithEmail', { email })
    : t('iam:rbac:sendResetPasswordConfirmBody')

  return (
    <Fragment>
      <div className='field-type mt-16 [&_.btn]:m-0 [&_.btn]:w-full'>
        <LoadingOverlayToggle
          loadingText={t('iam:rbac:sendResetPasswordSending')}
          name='iam-send-reset-password'
          show={busy}
        />
        <Button
          buttonStyle='primary'
          disabled={busy}
          onClick={() => openModal(confirmModalSlug)}
          size='large'
          type='button'
        >
          {t('iam:rbac:sendResetPassword')}
        </Button>
      </div>
      <ConfirmationModal
        body={confirmBody}
        cancelLabel={t('general:cancel')}
        confirmLabel={t('iam:rbac:sendResetPassword')}
        confirmingLabel={t('iam:rbac:sendResetPasswordSending')}
        heading={t('iam:rbac:sendResetPasswordConfirmHeading')}
        modalSlug={confirmModalSlug}
        onConfirm={onConfirmSend}
      />
    </Fragment>
  )
}
