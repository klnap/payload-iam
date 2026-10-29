/**
 * Payload admin light theme colors for HTML email.
 * Source: `@payloadcms/ui/dist/scss/colors.scss` (`:root` → `--color-base-*` / `--theme-elevation-*`).
 * Transactional mail uses the light palette (inboxes do not ship admin dark mode).
 */
export const payloadAdminEmailThemeLight = {
  /** `--theme-elevation-0` */
  elevation0: 'rgb(255, 255, 255)',
  /** `--theme-elevation-50` */
  elevation50: 'rgb(245, 245, 245)',
  /** `--theme-elevation-100` */
  elevation100: 'rgb(235, 235, 235)',
  /** `--theme-elevation-150` / `--theme-border-color` */
  elevation150: 'rgb(221, 221, 221)',
  /** `--theme-elevation-250` — outline controls hover border */
  elevation250: 'rgb(195, 195, 195)',
  /** `--theme-elevation-400` */
  elevation400: 'rgb(154, 154, 154)',
  /** `--theme-elevation-500` */
  elevation500: 'rgb(128, 128, 128)',
  /** `--theme-elevation-800` */
  elevation800: 'rgb(47, 47, 47)',
  /** `--theme-elevation-900` / `--theme-text` (body) */
  elevation900: 'rgb(20, 20, 20)',
  /** `--style-radius-s` from `@payloadcms/ui/dist/scss/vars.scss` */
  radiusS: '3px',
  containerMaxWidth: 600,
} as const

export type PayloadAdminEmailThemeTokens = typeof payloadAdminEmailThemeLight
