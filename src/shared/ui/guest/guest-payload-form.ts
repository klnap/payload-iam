import { cx } from 'tailwind-variants'

/** Payload stock login markup — literal hooks so Payload admin login CSS applies. */
export const payloadLoginForm = 'login__form'
export const payloadLoginFormInputWrap = 'login__form__inputWrap'
export const payloadLoginGenerateButton = 'login__generate-btn'

const guestFormFields = cx(
  'w-full',
  '[&_.btn]:w-full',
  '[&_.field-type]:w-full',
  '[&_.login__form__inputWrap]:w-full',
  '[&_.form-submit_.btn]:w-full',
  '[&_.field-label_.required]:hidden'
)

/** `login__form` + full-width field layout on guest routes. */
export const guestForm = cx(payloadLoginForm, guestFormFields)

export const guestFormInputWrap = cx(payloadLoginFormInputWrap, 'w-full')

export const guestInlineLink = cx(
  'inline-block text-base leading-snug text-[var(--theme-text)] underline underline-offset-4 hover:text-[var(--theme-elevation-800)]'
)

/** Secondary guest links (e.g. forgot password) — same scale as Payload `.field-label` / login inputs (13px). */
export const guestInlineLinkMuted = cx(
  'inline-block font-normal text-[13px] leading-[20px] text-[var(--theme-elevation-400)]',
  'underline decoration-1 decoration-[var(--theme-elevation-400)] underline-offset-[3px]',
  'hover:text-[var(--theme-elevation-500)] hover:decoration-[var(--theme-elevation-500)]'
)
