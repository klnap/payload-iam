export type { ServicePrincipal } from '#iam/types/service-principal'
export { BA_ADMIN_SESSION_CHANNEL, hasBaAdminSession } from './config/auth-channel'
export {
  DEFAULT_EMAIL_AND_PASSWORD,
  isEmailAndPasswordEnabled,
  resolveEmailAndPasswordMethod,
  resolveGoogleMethod,
} from './config/auth-methods'
export { resolveLoginOtpFromOptions } from './methods/email-and-password/config/login-otp.config'
