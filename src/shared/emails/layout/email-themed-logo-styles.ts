/** Swap wordmark for `prefers-color-scheme: dark` (Apple Mail, iOS, some clients). */
export const EMAIL_THEMED_LOGO_CLASS_LIGHT = 'iam-email-logo-light'
export const EMAIL_THEMED_LOGO_CLASS_DARK = 'iam-email-logo-dark'

export const emailThemedLogoHeadStyles = `
.${EMAIL_THEMED_LOGO_CLASS_LIGHT} { display: block !important; }
.${EMAIL_THEMED_LOGO_CLASS_DARK} { display: none !important; mso-hide: all; }
@media (prefers-color-scheme: dark) {
  .${EMAIL_THEMED_LOGO_CLASS_LIGHT} { display: none !important; mso-hide: all; }
  .${EMAIL_THEMED_LOGO_CLASS_DARK} { display: block !important; }
}
`.trim()
