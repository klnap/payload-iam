'use client'

import { toast } from '@payloadcms/ui'
import { useCallback, useState } from 'react'
import { cn } from 'tailwind-variants'
import { IconActionButton } from '#iam/modules/auth/ui/components/icon-action-button'
import {
  IconPasswordHidden,
  IconPasswordVisible,
} from '#iam/modules/auth/ui/components/password-reveal-icons'
import { useIamTranslation } from '#iam/shared/i18n/use-iam-t'

function IconCopy({ className }: { className?: string }) {
  return (
    <svg
      aria-hidden
      className={className}
      height='1em'
      viewBox='0 0 24 24'
      width='1em'
      xmlns='http://www.w3.org/2000/svg'
    >
      <path d='M0 0h24v24H0z' fill='none' />
      <path
        d='M16 1H4c-1.1 0-2 .9-2 2v14h2V3h12V1zm3 4H8c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h11c1.1 0 2-.9 2-2V7c0-1.1-.9-2-2-2zm0 16H8V7h11v14z'
        fill='currentColor'
      />
    </svg>
  )
}

type Props = {
  label: string
  password: string
  className?: string
}

export function GeneratedPasswordField({ label, password, className }: Props) {
  const { t } = useIamTranslation()
  const [revealed, setRevealed] = useState(false)
  const toggle = useCallback(() => setRevealed((v) => !v), [])

  const onCopy = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(password)
      toast.success(t('iam:rbac:clipboardCopied'))
    } catch {
      toast.error(t('iam:rbac:clipboardCopyFailed'))
    }
  }, [password, t])

  const display = revealed ? password : '•'.repeat(Math.min(password.length, 24))

  return (
    <div className={cn('flex flex-col gap-1.5', className)}>
      <span className='field-label'>{label}</span>
      <div className='flex items-center gap-3'>
        <span
          className='min-w-0 flex-1 overflow-hidden text-ellipsis font-mono text-[0.9375rem] leading-normal text-[var(--theme-text)] [overflow-wrap:anywhere] break-all'
          data-revealed={revealed ? 'true' : 'false'}
        >
          {display}
        </span>
        <div className='inline-flex shrink-0 items-center gap-0.5'>
          <IconActionButton
            aria-label={
              revealed ? t('iam:rbac:passwordRevealHide') : t('iam:rbac:passwordRevealShow')
            }
            onClick={toggle}
          >
            {revealed ? <IconPasswordVisible /> : <IconPasswordHidden />}
          </IconActionButton>
          <IconActionButton
            aria-label={t('iam:rbac:passwordCopyAria')}
            onClick={() => void onCopy()}
          >
            <IconCopy />
          </IconActionButton>
        </div>
      </div>
    </div>
  )
}
