'use client'

import {
  Button,
  ConfirmationModal,
  Drawer,
  FieldLabel,
  toast,
  useDrawerSlug,
  useModal,
} from '@payloadcms/ui'
import { type FormEvent, useCallback, useState } from 'react'
import { cx } from 'tailwind-variants'
import { changeAccountPassword } from '#iam/modules/account/ui/api/change-account-password-api'
import { requestAccountPasswordReset } from '#iam/modules/account/ui/api/request-account-password-reset-api'
import {
  IconPasswordHidden,
  IconPasswordVisible,
  PasswordInputSlot,
  PasswordRevealButton,
} from '#iam/modules/auth/ui'
import { useIamTranslation } from '#iam/shared/i18n/use-iam-t'

const fieldStack = 'field-type password mb-[var(--spacing-field,1.5rem)] last:mb-0 w-full'
const forgotModalSlug = 'iam-account-forgot-current-password'

type Props = {
  email: string
  forgotPasswordEnabled: boolean
}

/** Security tab — change password inside Payload Drawer (invite pattern). */
export default function ChangePasswordDrawer({ email, forgotPasswordEnabled }: Props) {
  const { t } = useIamTranslation()
  const drawerSlug = useDrawerSlug('iam-account-change-password')
  const { openModal, closeModal } = useModal()
  const [pending, setPending] = useState(false)
  const [forgotBusy, setForgotBusy] = useState(false)
  const [showCurrent, setShowCurrent] = useState(false)
  const [showNew, setShowNew] = useState(false)
  const [showConfirm, setShowConfirm] = useState(false)

  const forgotAvailable = forgotPasswordEnabled
  const forgotConfirmBody = email.trim()
    ? t('iam:rbac:sendResetPasswordConfirmBodyWithEmail', { email: email.trim() })
    : t('iam:rbac:sendResetPasswordConfirmBody')

  const onConfirmForgot = async () => {
    if (forgotBusy) return
    setForgotBusy(true)
    try {
      const result = await requestAccountPasswordReset()
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
      setForgotBusy(false)
    }
  }

  const onSubmit = useCallback(
    async (event: FormEvent<HTMLFormElement>) => {
      event.preventDefault()
      const form = event.currentTarget
      const currentPassword = String(new FormData(form).get('current-password') ?? '')
      const newPassword = String(new FormData(form).get('new-password') ?? '')
      const confirm = String(new FormData(form).get('confirm-password') ?? '')
      if (newPassword !== confirm) {
        toast.error(t('iam:rbac:changePasswordMismatch'))
        return
      }
      if (newPassword.length < 8) {
        toast.error(t('iam:rbac:changePasswordTooShort'))
        return
      }
      setPending(true)
      try {
        await changeAccountPassword({ currentPassword, newPassword })
        toast.success(t('iam:rbac:changePasswordSuccess'))
        form.reset()
        closeModal(drawerSlug)
      } catch (err) {
        toast.error(err instanceof Error ? err.message : t('iam:rbac:changePasswordFailed'))
      } finally {
        setPending(false)
      }
    },
    [closeModal, drawerSlug, t]
  )

  return (
    <>
      <Button
        buttonStyle='primary'
        className='!m-0'
        onClick={() => openModal(drawerSlug)}
        type='button'
      >
        {t('iam:rbac:changePasswordSubmit')}
      </Button>
      <Drawer
        className='iam-account-password-drawer'
        slug={drawerSlug}
        title={t('iam:rbac:changePasswordDrawerTitle')}
      >
        <form className='iam-account-change-password w-full' onSubmit={(e) => void onSubmit(e)}>
          <div className={fieldStack}>
            <div className='mb-[var(--spacing-field-label-bottom,0.5rem)] flex items-baseline justify-between gap-3'>
              <FieldLabel
                htmlFor='field-current-password'
                label={t('iam:rbac:changePasswordCurrent')}
                required
              />
              {forgotAvailable ? (
                <Button
                  buttonStyle='none'
                  className='!m-0 shrink-0 !p-0 !font-normal underline'
                  disabled={forgotBusy}
                  onClick={() => openModal(forgotModalSlug)}
                  type='button'
                >
                  {t('iam:rbac:changePasswordForgotLink')}
                </Button>
              ) : null}
            </div>
            <div className='field-type__wrap'>
              <PasswordInputSlot>
                <input
                  autoComplete='current-password'
                  id='field-current-password'
                  name='current-password'
                  required
                  type={showCurrent ? 'text' : 'password'}
                />
                <PasswordRevealButton
                  aria-label={
                    showCurrent
                      ? t('iam:rbac:passwordRevealHide')
                      : t('iam:rbac:passwordRevealShow')
                  }
                  onClick={() => setShowCurrent((v) => !v)}
                >
                  {showCurrent ? <IconPasswordVisible /> : <IconPasswordHidden />}
                </PasswordRevealButton>
              </PasswordInputSlot>
            </div>
          </div>
          <div className={fieldStack}>
            <FieldLabel
              htmlFor='field-new-password'
              label={t('iam:rbac:changePasswordNew')}
              required
            />
            <div className='field-type__wrap'>
              <PasswordInputSlot>
                <input
                  autoComplete='new-password'
                  id='field-new-password'
                  name='new-password'
                  required
                  type={showNew ? 'text' : 'password'}
                />
                <PasswordRevealButton
                  aria-label={
                    showNew ? t('iam:rbac:passwordRevealHide') : t('iam:rbac:passwordRevealShow')
                  }
                  onClick={() => setShowNew((v) => !v)}
                >
                  {showNew ? <IconPasswordVisible /> : <IconPasswordHidden />}
                </PasswordRevealButton>
              </PasswordInputSlot>
            </div>
          </div>
          <div className={fieldStack}>
            <FieldLabel
              htmlFor='field-confirm-password'
              label={t('iam:rbac:changePasswordConfirm')}
              required
            />
            <div className='field-type__wrap'>
              <PasswordInputSlot>
                <input
                  autoComplete='new-password'
                  id='field-confirm-password'
                  name='confirm-password'
                  required
                  type={showConfirm ? 'text' : 'password'}
                />
                <PasswordRevealButton
                  aria-label={
                    showConfirm
                      ? t('iam:rbac:passwordRevealHide')
                      : t('iam:rbac:passwordRevealShow')
                  }
                  onClick={() => setShowConfirm((v) => !v)}
                >
                  {showConfirm ? <IconPasswordVisible /> : <IconPasswordHidden />}
                </PasswordRevealButton>
              </PasswordInputSlot>
            </div>
          </div>
          <div className={cx('mt-7 flex gap-2 [&_.btn]:m-0 [&_.btn]:w-full')}>
            <Button buttonStyle='primary' disabled={pending} type='submit'>
              {pending
                ? t('iam:rbac:changePasswordSubmitting')
                : t('iam:rbac:changePasswordSubmit')}
            </Button>
          </div>
        </form>
      </Drawer>
      {forgotAvailable ? (
        <ConfirmationModal
          body={forgotConfirmBody}
          cancelLabel={t('general:cancel')}
          confirmLabel={t('iam:rbac:sendResetPassword')}
          confirmingLabel={t('iam:rbac:sendResetPasswordSending')}
          heading={t('iam:rbac:sendResetPasswordConfirmHeading')}
          modalSlug={forgotModalSlug}
          onConfirm={onConfirmForgot}
        />
      ) : null}
    </>
  )
}
