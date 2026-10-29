export type LoginViewLabels = {
  email: string
  password: string
  login: string
  forgotPassword: string
  unauthorized: string
  success: string
  loginWithGoogle: string
  orContinueWith: string
  accessDenied: string
  otpTitle: string
  otpDescription: string
  otpCode: string
  otpVerify: string
  otpInvalid: string
  otpSendFailed: string
  otpBack: string
  createRootTitle: string
  createRootDescription: string
  createRootFullName: string
  createRootSubmit: string
  createRootFullNameRequired: string
  createRootEmailRequired: string
  createRootError: string
  rootRequiredTitle: string
  rootRequiredDescription: string
}

export type LoginTranslate = (key: string, options?: Record<string, string | number>) => string

/** Admin login copy — override via host `i18n.translations.<locale>.iam.rbac`. */
export function getLoginViewLabels(t: LoginTranslate): LoginViewLabels {
  return {
    email: t('general:email'),
    password: t('general:password'),
    login: t('authentication:login'),
    forgotPassword: t('iam:rbac:loginForgotPassword'),
    unauthorized: t('error:emailOrPasswordIncorrect'),
    success: t('general:success'),
    loginWithGoogle: t('iam:rbac:loginWithGoogle'),
    orContinueWith: t('iam:rbac:loginOrContinueWith'),
    accessDenied: t('iam:rbac:loginAccessDenied'),
    otpTitle: t('iam:rbac:loginOtpTitle'),
    otpDescription: t('iam:rbac:loginOtpDescription'),
    otpCode: t('iam:rbac:loginOtpCode'),
    otpVerify: t('iam:rbac:loginOtpVerify'),
    otpInvalid: t('iam:rbac:loginOtpInvalid'),
    otpSendFailed: t('iam:rbac:loginOtpSendFailed'),
    otpBack: t('iam:rbac:loginOtpBack'),
    createRootTitle: t('iam:rbac:createRootTitle'),
    createRootDescription: t('iam:rbac:createRootDescription'),
    createRootFullName: t('iam:rbac:createRootFullName'),
    createRootSubmit: t('iam:rbac:createRootSubmit'),
    createRootFullNameRequired: t('iam:rbac:createRootFullNameRequired'),
    createRootEmailRequired: t('iam:rbac:createRootEmailRequired'),
    createRootError: t('iam:rbac:createRootError'),
    rootRequiredTitle: t('iam:rbac:rootRequiredTitle'),
    rootRequiredDescription: t('iam:rbac:rootRequiredDescription'),
  }
}
