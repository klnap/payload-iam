'use client'

import { Menu } from '@base-ui/react/menu'
import {
  ConfirmationModal,
  toast,
  useAuth,
  useConfig,
  useModal,
  useRouteTransition,
  useTheme,
  useTranslation,
} from '@payloadcms/ui'
import { useRouter } from 'next/navigation'
import { formatAdminURL } from 'payload/shared'
import { useEffect, useState } from 'react'
import { tv } from 'tailwind-variants'
import { canUseAdminShell } from '#iam/modules/rbac/access/admin-panel-user'
import { runIamSignOut } from '#iam/shared/auth/run-iam-sign-out'
import { useIamTranslation } from '#iam/shared/i18n/use-iam-t'
import { ACCOUNT_BASE_PATH } from '#iam/shared/paths/account-paths'
import { UserAvatarMark } from './user-avatar-mark'
import ThemePickerMenu, { type ThemeChoice } from './user-menu/theme-picker-menu'

const LOGOUT_MODAL_SLUG = 'iam-user-footer-logout'

// NOTE: class names must be literal strings in tv() — no variable interpolation.
const userFooter = {
  shell: tv({
    base: [
      'box-border flex shrink-0 items-center gap-3 self-stretch',
      'border-t border-[var(--theme-elevation-100)] bg-[var(--theme-bg)]',
      'pt-3.5 pb-3 px-[0.45rem]',
      'w-[calc(100%+var(--nav-padding-inline-start)+var(--nav-padding-inline-end))]',
      'max-w-none -ms-[var(--nav-padding-inline-start)] -me-[var(--nav-padding-inline-end)]',
    ],
  }),

  menuRoot: tv({
    base: 'w-full min-w-0',
  }),

  triggerWrap: tv({
    base: 'block w-full min-w-0 outline-none',
  }),

  trigger: tv({
    base: [
      'flex w-full min-w-0 cursor-pointer items-center gap-[0.85rem]',
      'rounded-[var(--style-radius-m)] px-[0.55rem] py-[0.85rem]',
      'hover:bg-[var(--theme-elevation-50)]',
      '[html[data-theme=dark]_&]:hover:bg-[rgba(255,255,255,0.06)]',
    ],
    variants: {
      open: {
        true: [
          'bg-[var(--theme-elevation-50)]',
          '[html[data-theme=dark]_&]:bg-[rgba(255,255,255,0.06)]',
        ],
      },
    },
  }),

  triggerName: tv({
    base: 'truncate text-[1.15rem] font-medium leading-tight text-[var(--theme-text)]',
  }),

  triggerEmail: tv({
    base: 'truncate text-[0.95rem] leading-tight text-[var(--theme-elevation-500)]',
  }),

  positioner: tv({
    base: 'z-[var(--z-nav)] box-border w-[var(--anchor-width)] min-w-[var(--anchor-width)] outline-none',
  }),

  popup: tv({
    base: [
      'box-border flex w-full min-w-full max-w-full flex-col gap-0',
      'rounded-[var(--style-radius-m)] px-0 py-[0.65rem]',
      'bg-[var(--theme-input-bg)] text-[var(--theme-text)] shadow-[0_4px_16px_rgba(0,0,0,0.18)]',
      '[html[data-theme=dark]_&]:border [html[data-theme=dark]_&]:border-[var(--theme-elevation-100)]',
      '[html[data-theme=dark]_&]:bg-[var(--theme-elevation-50)]',
    ],
  }),

  menuItem: tv({
    base: [
      'flex w-full cursor-pointer items-center gap-[0.65rem]',
      'rounded-[var(--style-radius-m)] border-0 bg-transparent',
      'min-h-[2.75rem] px-3 py-3 text-left text-[1.15rem] font-normal leading-[1.3] text-inherit',
      'no-underline decoration-transparent outline-none',
      'hover:no-underline focus:no-underline',
      'hover:bg-[var(--theme-elevation-50)]',
      '[html[data-theme=dark]_&]:hover:bg-[rgba(255,255,255,0.06)]',
      'data-highlighted:bg-[var(--theme-elevation-50)]',
      '[html[data-theme=dark]_&]:data-highlighted:bg-[rgba(255,255,255,0.06)]',
      '[&_.icon]:size-[1.15rem] [&_.icon]:shrink-0 [&_.icon]:text-[var(--theme-elevation-500)]',
    ],
    variants: {
      tone: {
        default: {},
        logout: [
          'text-[#e53935]',
          'hover:bg-[color-mix(in_srgb,#e53935_16%,transparent)]',
          'focus-visible:bg-[color-mix(in_srgb,#e53935_16%,transparent)]',
          'data-highlighted:bg-[color-mix(in_srgb,#e53935_16%,transparent)]',
          '[html[data-theme=dark]_&]:text-[#ff6b6b]',
          '[html[data-theme=dark]_&]:hover:bg-[color-mix(in_srgb,#ff6b6b_18%,transparent)]',
          '[html[data-theme=dark]_&]:focus-visible:bg-[color-mix(in_srgb,#ff6b6b_18%,transparent)]',
          '[html[data-theme=dark]_&]:data-highlighted:bg-[color-mix(in_srgb,#ff6b6b_18%,transparent)]',
          '[&_.icon]:text-[#e53935]',
          '[html[data-theme=dark]_&]:[&_.icon]:text-[#ff6b6b]',
        ],
      },
      submenuOpen: {
        true: [
          'bg-[var(--theme-elevation-50)]',
          '[html[data-theme=dark]_&]:bg-[rgba(255,255,255,0.06)]',
        ],
      },
      flyoutItem: {
        true: 'data-disabled:cursor-not-allowed data-disabled:text-[var(--theme-elevation-350)]',
      },
    },
    defaultVariants: {
      tone: 'default',
    },
  }),

  menuItemLabel: tv({
    base: 'min-w-0 flex-1 truncate text-[1.15rem] font-normal leading-[1.3]',
    variants: {
      tone: {
        default: {},
        logout: 'text-[#e53935] [html[data-theme=dark]_&]:text-[#ff6b6b]',
      },
    },
    defaultVariants: {
      tone: 'default',
    },
  }),

  menuItemRow: tv({
    base: 'flex w-full min-w-0 items-center gap-[0.65rem]',
  }),

  popupBody: tv({
    base: 'box-border px-[0.45rem]',
  }),

  themeSection: tv({
    base: 'mt-2',
  }),

  logoutDivider: tv({
    base: 'mt-2 w-full border-t border-[var(--theme-elevation-100)]',
  }),

  logoutSection: tv({
    base: 'box-border px-[0.45rem] pt-2',
  }),

  themeChevron: tv({
    base: 'ms-auto size-[1.15rem] shrink-0 text-[var(--theme-elevation-500)] [&_.stroke]:stroke-current',
  }),
}

function AccountIcon() {
  return (
    <svg
      aria-hidden
      className='icon icon--account'
      height='1em'
      viewBox='0 0 24 24'
      width='1em'
      xmlns='http://www.w3.org/2000/svg'
    >
      <path d='M0 0h24v24H0z' fill='none' />
      <path
        d='M19.652 19.405c.552-.115.882-.693.607-1.187c-.606-1.087-1.56-2.043-2.78-2.771C15.907 14.509 13.98 14 12 14s-3.907.508-5.479 1.447c-1.22.728-2.174 1.684-2.78 2.771c-.275.494.055 1.072.607 1.187a37.5 37.5 0 0 0 15.303 0'
        fill='currentColor'
      />
      <circle cx='12' cy='8' fill='currentColor' r='5' />
    </svg>
  )
}

function LogoutIcon() {
  return (
    <svg
      aria-hidden
      className='icon icon--logout'
      fill='none'
      height='15'
      viewBox='0 0 15 15'
      width='15'
      xmlns='http://www.w3.org/2000/svg'
    >
      <path
        d='M8.167 1.944h3.11c.983 0 1.779.796 1.779 1.778v7.556c0 .982-.796 1.777-1.778 1.777H8.167M5.056 4.389l-3.112 3.11 3.112 3.112M1.944 7.5h6.667'
        stroke='currentColor'
        strokeLinecap='round'
        strokeLinejoin='round'
        strokeWidth='1.5'
      />
    </svg>
  )
}

export default function UserFooter() {
  const { permissions, setUser, user } = useAuth()
  const { config } = useConfig()
  const { startRouteTransition } = useRouteTransition()
  const router = useRouter()
  const { autoMode, setTheme, theme } = useTheme()
  const { t: tIam } = useIamTranslation()
  const { t } = useTranslation()
  const { openModal } = useModal()
  const [open, setOpen] = useState(false)
  const [themeOpen, setThemeOpen] = useState(false)
  const [logoutBusy, setLogoutBusy] = useState(false)

  useEffect(() => {
    if (!open) setThemeOpen(false)
  }, [open])

  useEffect(() => {
    if (!open) return
    const closeWhenModalOpen = () => {
      if (
        document.querySelector(
          '.payload__modal-item--enter, .payload__modal-item--enterDone, .payload__modal-container--enterDone'
        )
      ) {
        setOpen(false)
      }
    }
    closeWhenModalOpen()
    const observer = new MutationObserver(closeWhenModalOpen)
    observer.observe(document.body, {
      attributes: true,
      attributeFilter: ['class'],
      childList: true,
      subtree: true,
    })
    return () => observer.disconnect()
  }, [open])

  if (!canUseAdminShell(user, permissions)) return null

  const displayName = String((user as { fullName?: string }).fullName ?? '')
  const displayEmail = String((user as { email?: string }).email ?? '')

  const activeTheme: ThemeChoice = autoMode ? 'auto' : theme

  const loginHref = formatAdminURL({
    adminRoute: config.routes.admin,
    path: config.admin.routes.login ?? '/login',
  })

  const requestLogout = () => {
    setOpen(false)
    openModal(LOGOUT_MODAL_SLUG)
  }

  const confirmLogout = () => {
    if (logoutBusy) return
    setLogoutBusy(true)
    void (async () => {
      try {
        await runIamSignOut()
        setUser(null)
        toast.success(t('authentication:loggedOutSuccessfully'))
        startRouteTransition(() => router.push(loginHref))
      } finally {
        setLogoutBusy(false)
      }
    })()
  }

  const accountHref = formatAdminURL({
    adminRoute: config.routes.admin,
    path: ACCOUNT_BASE_PATH,
  })

  const selectTheme = (value: ThemeChoice) => {
    ;(setTheme as (next: ThemeChoice) => void)(value)
  }

  return (
    <div className={userFooter.shell()}>
      <div className={userFooter.menuRoot()}>
        <Menu.Root modal={false} onOpenChange={setOpen} open={open}>
          <Menu.Trigger
            className={userFooter.triggerWrap()}
            nativeButton={false}
            render={(props) => (
              <div
                {...props}
                aria-expanded={open}
                aria-haspopup='menu'
                className={userFooter.trigger({ open })}
              >
                <UserAvatarMark name={displayName || displayEmail} />
                <span className='flex min-w-0 flex-1 flex-col gap-1 overflow-hidden'>
                  <span className={userFooter.triggerName()}>{displayName || '—'}</span>
                  <span className={userFooter.triggerEmail()}>{displayEmail || '—'}</span>
                </span>
              </div>
            )}
          />
          <Menu.Portal>
            <Menu.Positioner
              align='start'
              className={userFooter.positioner()}
              side='top'
              sideOffset={2}
            >
              <Menu.Popup className={userFooter.popup()}>
                <div className={userFooter.popupBody()}>
                  <Menu.Item
                    className={userFooter.menuItem()}
                    closeOnClick
                    onClick={() => {
                      startRouteTransition(() => router.push(accountHref))
                    }}
                  >
                    <span className={userFooter.menuItemRow()}>
                      <AccountIcon />
                      <span className={userFooter.menuItemLabel()}>
                        {tIam('iam:rbac:accountNav')}
                      </span>
                    </span>
                  </Menu.Item>
                  <div className={userFooter.themeSection()}>
                    <ThemePickerMenu
                      activeTheme={activeTheme}
                      menuItem={userFooter.menuItem}
                      menuItemLabel={userFooter.menuItemLabel}
                      menuItemRow={userFooter.menuItemRow}
                      onOpenChange={setThemeOpen}
                      onSelect={selectTheme}
                      open={themeOpen && open}
                      themeChevron={userFooter.themeChevron}
                      themeOpen={themeOpen}
                      triggerWrap={userFooter.triggerWrap}
                    />
                  </div>
                </div>
                <div aria-hidden className={userFooter.logoutDivider()} />
                <div className={userFooter.logoutSection()}>
                  <Menu.Item
                    className={userFooter.menuItem({ tone: 'logout' })}
                    onClick={requestLogout}
                  >
                    <LogoutIcon />
                    <span className={userFooter.menuItemLabel({ tone: 'logout' })}>
                      {tIam('iam:rbac:footerLogoutNav')}
                    </span>
                  </Menu.Item>
                </div>
              </Menu.Popup>
            </Menu.Positioner>
          </Menu.Portal>
        </Menu.Root>
      </div>
      <ConfirmationModal
        body={tIam('iam:rbac:footerLogoutConfirmBody')}
        cancelLabel={t('general:cancel')}
        confirmLabel={tIam('iam:rbac:footerLogoutNav')}
        confirmingLabel={t('authentication:loggingOut')}
        heading={tIam('iam:rbac:footerLogoutConfirmHeading')}
        modalSlug={LOGOUT_MODAL_SLUG}
        onConfirm={confirmLogout}
      />
    </div>
  )
}
