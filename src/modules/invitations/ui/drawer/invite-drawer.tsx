'use client'

import {
  Button,
  Drawer,
  FieldLabel,
  ReactSelect,
  TextInput,
  toast,
  useConfig,
  useDrawerSlug,
  useModal,
} from '@payloadcms/ui'
import { useRouter } from 'next/navigation'
import { formatAdminURL } from 'payload/shared'
import { type ChangeEvent, startTransition, useState } from 'react'
import { cx } from 'tailwind-variants'
import { INVITE_API_ERROR } from '#iam/modules/invitations/http/invite-api-errors'
import { HttpJsonError, postIamJson } from '#iam/shared/http/json-fetch'
import { tIam } from '#iam/shared/i18n/t-iam'
import { useIamTranslation } from '#iam/shared/i18n/use-iam-t'
import { IAM_API_PATH } from '#iam/shared/paths/iam-api-paths'

export type InviteRoleOption = { label: string; value: string }

/** Matches Payload `ListCreateNewButton` pill styling on collection lists. */
export const LIST_HEADER_PILL_ACTION_CLASS = 'list-create-new-doc__create-new-button'

function inviteErrorMessage(t: ReturnType<typeof useIamTranslation>['t'], err: unknown): string {
  if (err instanceof HttpJsonError) {
    switch (err.code) {
      case INVITE_API_ERROR.LIVE_INVITATION_EXISTS:
        return tIam(t, 'iam:rbac:inviteLiveInvitationExists')
      case INVITE_API_ERROR.EXPIRED_INVITATION_EXISTS:
        return tIam(t, 'iam:rbac:inviteExpiredInvitationExists')
      case INVITE_API_ERROR.EMAIL_ALREADY_PROVISIONED:
        return tIam(t, 'iam:rbac:inviteEmailAlreadyProvisioned')
      default:
        break
    }
    if (err.message.includes('live invitation')) {
      return tIam(t, 'iam:rbac:inviteLiveInvitationExists')
    }
    if (err.message.includes('already provisioned')) {
      return tIam(t, 'iam:rbac:inviteEmailAlreadyProvisioned')
    }
  }
  return tIam(t, 'iam:rbac:inviteFailed')
}

/**
 * Native Payload Drawer — creates invitation via `/api/iam/invitations/invite`.
 * Role options from server (AccessListTabs) — no client roles fetch.
 */
export default function InviteDrawer({ roleOptions }: { roleOptions: InviteRoleOption[] }) {
  const router = useRouter()
  const { config } = useConfig()
  const { t } = useIamTranslation()
  const adminRoute = config.routes.admin || '/'
  const drawerSlug = useDrawerSlug('iam-invite')
  const { openModal, closeModal } = useModal()
  const [email, setEmail] = useState('')
  const [fullName, setFullName] = useState('')
  const [roleIds, setRoleIds] = useState<string[]>([])
  const [pending, setPending] = useState(false)

  const submit = async () => {
    if (!email.trim() || !fullName.trim() || roleIds.length === 0) {
      toast.error(tIam(t, 'iam:rbac:inviteValidationRequired'))
      return
    }
    setPending(true)
    try {
      let body: { invitationId?: string; inviteUrl?: string }
      body = await postIamJson(IAM_API_PATH.invitations.invite, {
        email: email.trim(),
        fullName: fullName.trim(),
        roleIds,
      })
      toast.success(tIam(t, 'iam:rbac:inviteSentSuccess'))
      // Copy full invite URL (with token) to clipboard for dev / no-email setups.
      if (body.inviteUrl) {
        if (typeof navigator !== 'undefined' && navigator.clipboard?.writeText) {
          void navigator.clipboard.writeText(body.inviteUrl).catch(() => {})
        }
        // biome-ignore lint/suspicious/noConsole: dev-only invite URL when email is not configured
        console.info('[dev-mail] invite link:', body.inviteUrl)
      }
      closeModal(drawerSlug)
      setEmail('')
      setFullName('')
      setRoleIds([])
      startTransition(() => {
        if (body.invitationId) {
          router.push(
            formatAdminURL({
              adminRoute: adminRoute as `/${string}`,
              path: `/collections/invitations/${body.invitationId}`,
            })
          )
        } else {
          router.push(
            formatAdminURL({
              adminRoute: adminRoute as `/${string}`,
              path: '/collections/invitations',
            })
          )
        }
        router.refresh()
      })
    } catch (err) {
      toast.error(inviteErrorMessage(t, err))
    } finally {
      setPending(false)
    }
  }

  return (
    <>
      <Button
        aria-label={tIam(t, 'iam:rbac:inviteDrawerTitle')}
        buttonStyle='pill'
        className={LIST_HEADER_PILL_ACTION_CLASS}
        onClick={() => openModal(drawerSlug)}
        size='small'
      >
        {tIam(t, 'iam:rbac:invitePillLabel')}
      </Button>
      <Drawer
        className='iam-invite-drawer'
        slug={drawerSlug}
        title={tIam(t, 'iam:rbac:inviteDrawerTitle')}
      >
        <div className='flex w-full flex-col gap-4'>
          <div>
            <FieldLabel label={tIam(t, 'iam:rbac:fieldFullName')} path='invite-fullName' required />
            <TextInput
              onChange={(e: ChangeEvent<HTMLInputElement>) => setFullName(e.target.value)}
              path='invite-fullName'
              required
              value={fullName}
            />
          </div>
          <div>
            <FieldLabel label={tIam(t, 'iam:rbac:fieldEmail')} path='invite-email' required />
            <TextInput
              onChange={(e: ChangeEvent<HTMLInputElement>) => setEmail(e.target.value)}
              path='invite-email'
              value={email}
            />
          </div>
          <div>
            <FieldLabel label={tIam(t, 'iam:rbac:fieldRole')} path='invite-roles' required />
            <ReactSelect
              inputId='invite-roles'
              isClearable
              isMulti
              onChange={(opt) => {
                const selected = Array.isArray(opt) ? opt : opt ? [opt] : []
                setRoleIds(selected.map((o) => String(o.value)))
              }}
              options={roleOptions}
              value={roleOptions.filter((o) => roleIds.includes(o.value))}
            />
          </div>
          <div className={cx('mt-7 flex gap-2 [&_.btn]:m-0 [&_.btn]:w-full')}>
            <Button
              buttonStyle='primary'
              disabled={pending || !email.trim() || !fullName.trim() || roleIds.length === 0}
              onClick={() => void submit()}
            >
              {pending ? tIam(t, 'iam:rbac:inviteSending') : tIam(t, 'iam:rbac:inviteSend')}
            </Button>
          </div>
        </div>
      </Drawer>
    </>
  )
}
