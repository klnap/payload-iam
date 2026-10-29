/** Auth UI — cross-module imports use this barrel only (dependency-cruiser). */

export { GeneratedPasswordField } from '#iam/modules/auth/methods/email-and-password/ui/components/generated-password-field'
export {
  PasswordInputSlot,
  PasswordRevealButton,
} from '#iam/modules/auth/methods/email-and-password/ui/components/password-field'
export { default as GoogleBrandIcon } from '#iam/modules/auth/methods/google/ui/google-brand-icon'
export { default as GoogleLoginButton } from '#iam/modules/auth/methods/google/ui/google-login-button'
export { default as LoginOAuthDivider } from '#iam/modules/auth/methods/google/ui/login-oauth-divider'
export { GuestPage } from '#iam/shared/ui/guest/guest-page'
export { getIamAuthClient } from './client/auth-client'
export { AccountReadyPanel } from './components/account-ready-panel'
export { IconActionButton } from './components/icon-action-button'
export { IconPasswordHidden, IconPasswordVisible } from './components/password-reveal-icons'
export type { LoginViewLabels } from './hooks/get-login-labels'
export { getLoginViewLabels } from './hooks/get-login-labels'
export { resolveLoginCustom } from './hooks/login-custom'
