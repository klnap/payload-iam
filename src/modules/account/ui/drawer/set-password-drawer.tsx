'use client'

import { Button, Drawer, FieldLabel, toast, useDrawerSlug, useModal } from '@payloadcms/ui'
import { useRouter } from 'next/navigation'
import { type FormEvent, useCallback, useState } from 'react'
import { cx } from 'tailwind-variants'
import { setAccountPassword } from '#iam/modules/account/ui/api/set-account-password-api'
import {
  IconPasswordHidden,
  IconPasswordVisible,
  PasswordInputSlot,
  PasswordRevealButton,
} from '#iam/modules/auth/ui'
import { useIamTranslation } from '#iam/shared/i18n/use-iam-t'

const fieldStack = 'field-type password mb-[var(--spacing-field,1.5rem)] last:mb-0 w-full'

type Props = {
  /** When false, only render drawer (trigger elsewhere). */
  showTrigger?: boolean
  triggerButtonStyle?: 'primary' | 'secondary'
  /** Defaults to `accountSetPasswordButton`. */
  triggerLabelKey?: 'iam:rbac:accountMethodLink' | 'iam:rbac:accountSetPasswordButton'
}

/** Linked tab — add email/password sign-in for Google-only (or missing credential) accounts. */
export default function SetPasswordDrawer({
  showTrigger = true,
  triggerButtonStyle = 'primary',
  triggerLabelKey = 'iam:rbac:accountSetPasswordButton',
}: Props) {
  const { t } = useIamTranslation()
  const router = useRouter()
  const drawerSlug = useDrawerSlug('iam-account-set-password')
  const { openModal, closeModal } = useModal()
  const [pending, setPending] = useState(false)
  const [showNew, setShowNew] = useState(false)
  const [showConfirm, setShowConfirm] = useState(false)

  const onSubmit = useCallback(
    async (event: FormEvent<HTMLFormElement>) => {
      event.preventDefault()
      const form = event.currentTarget
      const newPassword = String(new FormData(form).get('new-password') ?? '')
      const confirm = String(new FormData(form).get('confirm-password') ?? '')
      if (newPassword !== confirm) {
        toast.error(t('iam:rbac:changePasswordMismatch'))
        return
      }
      if (newPassword.length < 12) {
        toast.error(t('iam:rbac:changePasswordTooShort'))
        return
      }
      setPending(true)
      try {
        await setAccountPassword({ password: newPassword })
        toast.success(t('iam:rbac:accountSetPasswordSuccess'))
        form.reset()
        closeModal(drawerSlug)
        router.refresh()
      } catch (err) {
        const message = err instanceof Error ? err.message : ''
        if (message.includes('already exists')) {
          toast.error(t('iam:rbac:accountSetPasswordAlready'))
        } else {
          toast.error(t('iam:rbac:accountSetPasswordFailed'))
        }
      } finally {
        setPending(false)
      }
    },
    [closeModal, drawerSlug, router, t]
  )

  return (
    <>
      {showTrigger ? (
        <Button
          buttonStyle={triggerButtonStyle}
          className='iam-account-login-methods__btn shrink-0'
          onClick={() => openModal(drawerSlug)}
          size='small'
          type='button'
        >
          {t(triggerLabelKey)}
        </Button>
      ) : null}
      <Drawer
        className='iam-account-password-drawer'
        slug={drawerSlug}
        title={t('iam:rbac:accountSetPasswordDrawerTitle')}
      >
        <p className='m-0 mb-5 text-sm leading-snug text-[var(--theme-elevation-500)]'>
          {t('iam:rbac:accountSetPasswordDrawerIntro')}
        </p>
        <form className='w-full' onSubmit={(e) => void onSubmit(e)}>
          <div className={fieldStack}>
            <FieldLabel
              htmlFor='field-set-new-password'
              label={t('iam:rbac:changePasswordNew')}
              required
            />
            <div className='field-type__wrap'>
              <PasswordInputSlot>
                <input
                  autoComplete='new-password'
                  id='field-set-new-password'
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
              htmlFor='field-set-confirm-password'
              label={t('iam:rbac:changePasswordConfirm')}
              required
            />
            <div className='field-type__wrap'>
              <PasswordInputSlot>
                <input
                  autoComplete='new-password'
                  id='field-set-confirm-password'
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
                ? t('iam:rbac:accountSetPasswordSubmitting')
                : t('iam:rbac:accountSetPasswordSubmit')}
            </Button>
          </div>
        </form>
      </Drawer>
    </>
  )
}
