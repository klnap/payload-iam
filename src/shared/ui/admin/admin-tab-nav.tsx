'use client'

import { Tabs } from '@base-ui/react/tabs'
import { cn, cx } from 'tailwind-variants'

export type AdminTabNavItem<T extends string> = {
  value: T
  label: string
}

type Props<T extends string> = {
  tabs: AdminTabNavItem<T>[]
  value: T
  onValueChange: (value: T) => void
  className?: string
}

/** In-admin tab strip styled like Payload `tabs-field` (route or section switching). */
export function AdminTabNav<T extends string>({ tabs, value, onValueChange, className }: Props<T>) {
  return (
    <div className={cn('field-type tabs-field', className)}>
      <Tabs.Root
        onValueChange={(next) => {
          if (typeof next === 'string') onValueChange(next as T)
        }}
        value={value}
      >
        <div className='tabs-field__tabs-wrap'>
          <Tabs.List className='tabs-field__tabs'>
            {tabs.map((tab) => (
              <Tabs.Tab
                className={cx(
                  'tabs-field__tab-button',
                  tab.value === value && 'tabs-field__tab-button--active'
                )}
                key={tab.value}
                value={tab.value}
              >
                {tab.label}
              </Tabs.Tab>
            ))}
          </Tabs.List>
        </div>
      </Tabs.Root>
    </div>
  )
}
