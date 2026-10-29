'use client'

import { Button } from '@base-ui/react/button'
import { ConfirmationModal, toast, useModal } from '@payloadcms/ui'
import type { ReactNode } from 'react'
import { useState } from 'react'
import { cx } from 'tailwind-variants'
import { unlinkGoogleAccount } from '#iam/modules/account/ui/api/unlink-google-account-api'
import SetPasswordDrawer from '#iam/modules/account/ui/drawer/set-password-drawer'
import type { UserAuthAccountInsights } from '#iam/modules/users/domain/user-auth-account-insights'
import { useIamTranslation } from '#iam/shared/i18n/use-iam-t'
import AccountGoogleLinkButton from './account-google-link-button'

const unlinkModalSlug = 'iam-account-unlink-google'

/** Same elevation chrome as account Google link; text-only for unlink. */
const accountGoogleUnlinkBtnClass = cx(
  'btn btn--size-large flex min-h-[2.75rem] w-auto shrink-0 items-center justify-center px-5 py-2.5',
  '[--bg-color:var(--theme-elevation-100)] [--hover-bg:var(--theme-elevation-50)]',
  '[--btn-border:1px_solid_var(--theme-elevation-100)] [--hover-btn-border:1px_solid_var(--theme-elevation-50)]',
  '[--color:var(--theme-text)]',
  '[html[data-theme=dark]_&]:[--bg-color:var(--theme-elevation-100)]',
  '[html[data-theme=dark]_&]:[--hover-bg:var(--theme-elevation-50)]',
  '[html[data-theme=dark]_&]:[--btn-border:1px_solid_var(--theme-elevation-50)]',
  '[html[data-theme=dark]_&]:[--hover-btn-border:1px_solid_var(--theme-elevation-50)]'
)

type Props = {
  emailAndPassword: boolean
  insights: UserAuthAccountInsights
}

/** Matches `btn--size-large` action chrome + `p-6` vertical padding. */
const loginMethodActionMinHeightClass = 'min-h-[2.75rem]'

const loginMethodCardClass = cx(
  'iam-account-login-methods__card',
  'flex min-h-[calc(2.75rem+3rem)] items-center justify-between gap-[calc(var(--base)*1.25)]',
  'rounded-[var(--style-radius-s,3px)] border border-[var(--theme-elevation-100)] p-6',
  'bg-[var(--theme-elevation-50)] [html[data-theme=dark]_&]:bg-[rgba(255,255,255,0.06)]'
)

function LoginMethodCard({ label, action }: { label: string; action?: ReactNode }) {
  return (
    <li className={loginMethodCardClass}>
      <span className='iam-account-login-methods__label'>{label}</span>
      <div
        className={cx(
          'iam-account-login-methods__action flex items-center justify-end',
          loginMethodActionMinHeightClass
        )}
      >
        {action}
      </div>
    </li>
  )
}

export default function AccountLinkedPanel({ emailAndPassword, insights }: Props) {
  const { t } = useIamTranslation()
  const { openModal } = useModal()
  const [unlinkBusy, setUnlinkBusy] = useState(false)

  const canLinkGoogle = insights.googleLoginEnabled && insights.hasPassword && !insights.hasGoogle
  const canSetPassword = emailAndPassword && !insights.hasPassword

  const onGoogleUnlinkClick = () => {
    if (unlinkBusy) return
    if (!insights.hasPassword) {
      toast.error(t('iam:rbac:accountGoogleUnlinkNeedPassword'))
      return
    }
    openModal(unlinkModalSlug)
  }

  const onConfirmUnlink = async () => {
    if (unlinkBusy) return
    setUnlinkBusy(true)
    try {
      await unlinkGoogleAccount()
      toast.success(t('iam:rbac:accountGoogleUnlinkSuccess'))
      window.location.reload()
    } catch (err) {
      const message = err instanceof Error ? err.message : ''
      if (message.includes('last login')) {
        toast.error(t('iam:rbac:accountGoogleUnlinkLastMethod'))
      } else if (message.includes('password')) {
        toast.error(t('iam:rbac:accountGoogleUnlinkNeedPassword'))
      } else {
        toast.error(t('iam:rbac:accountGoogleUnlinkFailed'))
      }
    } finally {
      setUnlinkBusy(false)
    }
  }

  if (!insights.googleLoginEnabled && !emailAndPassword) {
    return null
  }

  return (
    <div className='iam-account-login-methods w-full max-w-none'>
      <ul className='iam-account-login-methods__list'>
        {emailAndPassword ? (
          <LoginMethodCard
            action={
              canSetPassword ? (
                <SetPasswordDrawer
                  showTrigger
                  triggerButtonStyle='secondary'
                  triggerLabelKey='iam:rbac:accountMethodLink'
                />
              ) : undefined
            }
            label={t('iam:rbac:userInsightPasswordLogin')}
          />
        ) : null}
        {insights.googleLoginEnabled ? (
          <LoginMethodCard
            action={
              insights.hasGoogle ? (
                <div className='form-submit m-0 w-auto shrink-0'>
                  <Button
                    className={accountGoogleUnlinkBtnClass}
                    disabled={unlinkBusy}
                    onClick={onGoogleUnlinkClick}
                    type='button'
                  >
                    <span className='text-[1.0625rem] font-medium leading-tight'>
                      {unlinkBusy
                        ? t('iam:rbac:accountGoogleUnlinking')
                        : t('iam:rbac:accountMethodUnlink')}
                    </span>
                  </Button>
                </div>
              ) : canLinkGoogle ? (
                <AccountGoogleLinkButton
                  errorMessage={t('iam:rbac:accountGoogleLinkFailed')}
                  label={t('iam:rbac:accountGoogleLink')}
                />
              ) : undefined
            }
            label={t('iam:rbac:userInsightGoogle')}
          />
        ) : null}
      </ul>
      <ConfirmationModal
        body={t('iam:rbac:accountGoogleUnlinkConfirmBody')}
        cancelLabel={t('general:cancel')}
        confirmLabel={t('iam:rbac:accountMethodUnlink')}
        confirmingLabel={t('iam:rbac:accountGoogleUnlinking')}
        heading={t('iam:rbac:accountGoogleUnlinkConfirmHeading')}
        modalSlug={unlinkModalSlug}
        onConfirm={onConfirmUnlink}
      />
    </div>
  )
}
