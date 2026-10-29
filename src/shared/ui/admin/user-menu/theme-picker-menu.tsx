'use client'

import { Menu } from '@base-ui/react/menu'
import { ChevronIcon } from '@payloadcms/ui'
import { tv } from 'tailwind-variants'
import { useIamTranslation } from '#iam/shared/i18n/use-iam-t'

export type ThemeChoice = 'auto' | 'light' | 'dark'

const THEME_OPTIONS: {
  value: ThemeChoice
  labelKey: 'iam:rbac:themeSystem' | 'general:light' | 'general:dark'
}[] = [
  { value: 'auto', labelKey: 'iam:rbac:themeSystem' },
  { value: 'light', labelKey: 'general:light' },
  { value: 'dark', labelKey: 'general:dark' },
]

// NOTE: class names must be literal strings in tv() — no variable interpolation.
const themePickerMenu = {
  flyoutPositioner: tv({
    base: 'z-[calc(var(--z-popup,60)+2)] outline-none',
  }),

  flyoutPopup: tv({
    base: [
      'flex min-w-[10.5rem] flex-col gap-0.5 rounded-[var(--style-radius-m)] p-[0.45rem]',
      'bg-[var(--theme-input-bg)] text-[var(--theme-text)] shadow-[0_4px_16px_rgba(0,0,0,0.18)]',
      '[html[data-theme=dark]_&]:border [html[data-theme=dark]_&]:border-[var(--theme-elevation-100)]',
      '[html[data-theme=dark]_&]:bg-[var(--theme-elevation-50)]',
    ],
  }),

  flyoutDot: tv({
    base: 'mx-[0.3rem] block size-[0.35rem] shrink-0 rounded-full',
    variants: {
      active: {
        true: 'bg-[var(--theme-text)]',
        false: 'bg-transparent',
      },
    },
  }),

  flyoutItemLabel: tv({
    base: 'min-w-0 flex-1 truncate text-[1.15rem] font-normal leading-[1.3]',
    variants: {
      active: {
        true: 'text-[var(--theme-elevation-450)]',
        false: 'text-[var(--theme-text)]',
      },
    },
  }),
}

type FooterMenuItemClass = (options?: {
  className?: string
  tone?: 'default' | 'logout'
  submenuOpen?: boolean
  flyoutItem?: boolean
}) => string

type Props = {
  activeTheme: ThemeChoice
  open: boolean
  onOpenChange: (open: boolean) => void
  onSelect: (value: ThemeChoice) => void
  themeOpen: boolean
  triggerWrap: () => string
  menuItem: FooterMenuItemClass
  menuItemRow: () => string
  menuItemLabel: () => string
  themeChevron: () => string
}

function ThemeIcon() {
  return (
    <svg
      aria-hidden
      className='icon icon--theme'
      fill='none'
      height='15'
      viewBox='0 0 15 15'
      width='15'
      xmlns='http://www.w3.org/2000/svg'
    >
      <g clipPath='url(#pcs-theme-clip)'>
        <circle cx='7.5' cy='7.5' r='6.443' stroke='currentColor' strokeWidth='1.333' />
        <path d='M7.5 11.944a4.444 4.444 0 0 0 0-8.888z' fill='currentColor' />
      </g>
      <defs>
        <clipPath id='pcs-theme-clip'>
          <path d='M0 0h15v15H0z' fill='#fff' />
        </clipPath>
      </defs>
    </svg>
  )
}

export default function ThemePickerMenu({
  activeTheme,
  open,
  onOpenChange,
  onSelect,
  themeOpen,
  triggerWrap,
  menuItem,
  menuItemRow,
  menuItemLabel,
  themeChevron,
}: Props) {
  const { t } = useIamTranslation()

  return (
    <Menu.Root modal={false} onOpenChange={onOpenChange} open={open}>
      <Menu.Trigger
        className={triggerWrap()}
        nativeButton={false}
        render={(props) => (
          <div
            {...props}
            aria-expanded={themeOpen}
            aria-haspopup='menu'
            className={menuItem({ submenuOpen: themeOpen })}
            onClick={(event) => {
              event.stopPropagation()
              props.onClick?.(event)
            }}
            onMouseDown={(event) => {
              event.stopPropagation()
              props.onMouseDown?.(event)
            }}
          >
            <span className={menuItemRow()}>
              <ThemeIcon />
              <span className={menuItemLabel()}>{t('iam:rbac:themeNav')}</span>
              <ChevronIcon className={themeChevron()} direction='right' />
            </span>
          </div>
        )}
      />
      <Menu.Portal>
        <Menu.Positioner
          align='start'
          className={themePickerMenu.flyoutPositioner()}
          side='right'
          sideOffset={2}
        >
          <Menu.Popup
            className={themePickerMenu.flyoutPopup()}
            onMouseDown={(event) => {
              event.stopPropagation()
            }}
          >
            <Menu.RadioGroup
              onValueChange={(value) => onSelect(value as ThemeChoice)}
              value={activeTheme}
            >
              {THEME_OPTIONS.map((option) => {
                const active = option.value === activeTheme
                const label = t(option.labelKey)
                return (
                  <Menu.RadioItem
                    className={menuItem({ flyoutItem: true })}
                    disabled={active}
                    key={option.value}
                    onClick={(event) => {
                      event.stopPropagation()
                    }}
                    onMouseDown={(event) => {
                      event.stopPropagation()
                    }}
                    value={option.value}
                  >
                    <span aria-hidden className={themePickerMenu.flyoutDot({ active })} />
                    <span className={themePickerMenu.flyoutItemLabel({ active })}>{label}</span>
                  </Menu.RadioItem>
                )
              })}
            </Menu.RadioGroup>
          </Menu.Popup>
        </Menu.Positioner>
      </Menu.Portal>
    </Menu.Root>
  )
}
