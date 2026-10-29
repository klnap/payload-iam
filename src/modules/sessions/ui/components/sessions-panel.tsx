'use client'

import { Button, toast, useConfig } from '@payloadcms/ui'
import { useRouter } from 'next/navigation'
import { formatAdminURL } from 'payload/shared'
import { useState, useTransition } from 'react'
import { cx } from 'tailwind-variants'
import type { SessionView } from '#iam/modules/sessions/domain/session-view'
import { postIamAuthJson } from '#iam/shared/http/json-fetch'
import { useIamTranslation } from '#iam/shared/i18n/use-iam-t'
import { IAM_AUTH_ROUTES } from '#iam/shared/paths/auth-routes'
import { SessionDeviceIcon, SessionMobileIcon } from './session-device-icon'

type Props = {
  sessions: SessionView[]
  /** When set, lists sessions for another user (admin). */
  targetUserId?: string
  compact?: boolean
  /** Self-service account tab — no duplicate page title. */
  embedded?: boolean
  /** Admin read-only: list sessions without revoke. */
  canRevoke?: boolean
}

const revokeBtnClass = cx(
  '!m-0 !px-3 !py-2 !font-semibold',
  'rounded-[var(--style-radius-s,3px)]',
  'text-[#e53935] hover:!bg-[color-mix(in_srgb,#e53935_14%,transparent)]',
  'focus-visible:!bg-[color-mix(in_srgb,#e53935_14%,transparent)]',
  '[html[data-theme=dark]_&]:text-[#ff6b6b]',
  '[html[data-theme=dark]_&]:hover:!bg-[color-mix(in_srgb,#ff6b6b_18%,transparent)]',
  '[html[data-theme=dark]_&]:focus-visible:!bg-[color-mix(in_srgb,#ff6b6b_18%,transparent)]'
)

function formatWhen(iso: string): string {
  if (!iso) return '—'
  try {
    return new Intl.DateTimeFormat(undefined, {
      dateStyle: 'medium',
      timeStyle: 'short',
    }).format(new Date(iso))
  } catch {
    return iso
  }
}

const sessionIconClass =
  'flex h-7 w-7 shrink-0 items-center justify-center text-[var(--theme-elevation-500)] [&_svg]:block [&_svg]:h-7 [&_svg]:w-7'

const sessionCardClass = cx(
  'flex flex-col gap-[calc(var(--base)*0.65)] rounded-[var(--style-radius-s,3px)] border border-[var(--theme-elevation-100)] p-6',
  'bg-[var(--theme-elevation-50)] [html[data-theme=dark]_&]:bg-[rgba(255,255,255,0.06)]'
)

function MetaBlock({ label, value, mono }: { label: string; value: string; mono?: boolean }) {
  return (
    <div className='flex min-w-0 flex-col gap-2'>
      <dt className='m-0 text-[0.8125rem] font-medium uppercase tracking-wide text-[var(--theme-elevation-500)]'>
        {label}
      </dt>
      <dd
        className={cx(
          'm-0 text-base leading-relaxed text-[var(--theme-text)] [overflow-wrap:anywhere]',
          mono && 'font-mono text-[0.9375rem] tabular-nums'
        )}
      >
        {value}
      </dd>
    </div>
  )
}

export default function SessionsPanel({
  sessions,
  targetUserId,
  compact = false,
  embedded = false,
  canRevoke = true,
}: Props) {
  const { t } = useIamTranslation()
  const { config } = useConfig()
  const router = useRouter()
  const [revoking, setRevoking] = useState<string | null>(null)
  const [pending, startTransition] = useTransition()

  const onRevoke = async (session: SessionView) => {
    if (revoking || pending) return
    if (embedded && session.isCurrent) return
    if (!targetUserId && !session.isCurrent) return
    const userId = targetUserId ?? ''
    if (!userId) return

    setRevoking(session.token)
    try {
      const { revokeAdminUserSession } = await import(
        '#iam/modules/sessions/services/revoke-session.server'
      )
      await revokeAdminUserSession({ token: session.token, userId })
      toast.success(t('iam:rbac:sessionRevoked'))
      if (session.isCurrent) {
        try {
          await postIamAuthJson(IAM_AUTH_ROUTES.session.signOut, {})
        } catch {
          // still redirect — session row is already deleted
        }
        const loginHref = formatAdminURL({
          adminRoute: config.routes.admin,
          path: config.admin.routes.login ?? '/login',
        })
        window.location.assign(loginHref)
        return
      }
      startTransition(() => {
        router.refresh()
      })
    } catch (err) {
      toast.error(err instanceof Error ? err.message : t('iam:rbac:sessionRevokeFailed'))
    } finally {
      setRevoking(null)
    }
  }

  const list = sessions

  return (
    <div className={cx(compact && 'mt-1')}>
      {!compact && !embedded ? (
        <div className='mb-6'>
          <h1 className='m-0 mb-2 text-2xl font-semibold text-[var(--theme-text)]'>
            {t('iam:rbac:sessionsTitle')}
          </h1>
          <p className='m-0 max-w-2xl text-base leading-snug text-[var(--theme-elevation-500)]'>
            {t('iam:rbac:sessionsDescription')}
          </p>
        </div>
      ) : null}

      {list.length === 0 ? (
        <p className='m-0 text-base text-[var(--theme-elevation-500)]' role='status'>
          {t('iam:rbac:sessionsEmpty')}
        </p>
      ) : (
        <ul
          className={cx(
            'm-0 flex list-none flex-col p-0',
            embedded ? 'iam-account-sessions-list gap-[calc(var(--base)*1.85)]' : 'gap-4'
          )}
        >
          {list.map((session) => {
            const Icon = session.deviceLabel === 'Mobile' ? SessionMobileIcon : SessionDeviceIcon
            const busy = revoking === session.token
            const ip = session.ipAddress ?? '—'

            return (
              <li className={sessionCardClass} key={session.id}>
                <div className='flex items-center gap-5'>
                  <div aria-hidden className={sessionIconClass}>
                    <Icon />
                  </div>
                  <div className='flex min-w-0 flex-1 flex-wrap items-center gap-x-3 gap-y-2'>
                    <span className='text-lg font-medium leading-none text-[var(--theme-text)]'>
                      {session.browserLabel} · {session.osLabel} · {session.deviceLabel}
                    </span>
                    {session.isCurrent ? (
                      <span
                        className={cx(
                          'inline-flex items-center rounded-full border border-[var(--theme-elevation-100)] bg-[var(--theme-elevation-0)] px-3 py-1',
                          'text-sm font-medium leading-none text-[var(--theme-elevation-700)]',
                          '[html[data-theme=dark]_&]:bg-[rgba(255,255,255,0.04)]'
                        )}
                      >
                        {t('iam:rbac:sessionCurrent')}
                      </span>
                    ) : null}
                  </div>
                  {canRevoke && targetUserId && (!embedded || !session.isCurrent) ? (
                    <div className='shrink-0 self-center'>
                      <Button
                        buttonStyle='none'
                        className={revokeBtnClass}
                        disabled={busy || pending}
                        onClick={() => void onRevoke(session)}
                        size='small'
                        type='button'
                      >
                        {busy ? t('iam:rbac:sessionRevoking') : t('iam:rbac:sessionRevoke')}
                      </Button>
                    </div>
                  ) : null}
                </div>
                <div className='flex gap-5'>
                  <div aria-hidden className={sessionIconClass} />
                  <dl className='m-0 flex min-w-0 flex-1 flex-col gap-5'>
                    <div className='grid grid-cols-1 gap-5 sm:grid-cols-2 sm:gap-x-10'>
                      <MetaBlock
                        label={t('iam:rbac:sessionLastActive')}
                        value={formatWhen(session.updatedAt)}
                      />
                      <MetaBlock
                        label={t('iam:rbac:sessionSignedIn')}
                        value={formatWhen(session.createdAt)}
                      />
                    </div>
                    <MetaBlock label={t('iam:rbac:sessionIp')} mono value={ip} />
                  </dl>
                </div>
              </li>
            )
          })}
        </ul>
      )}
    </div>
  )
}
