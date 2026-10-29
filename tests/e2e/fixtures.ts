export const iamE2eBaseUrl = (process.env.IAM_E2E_BASE_URL ?? 'http://localhost:8010')
  .replace(/\/$/, '')
  .replace('127.0.0.1', 'localhost')

export const iamE2eOtpLog =
  process.env.IAM_E2E_OTP_LOG ?? '/home/klnap/code/stolbek/.generated/iam-audit/cms.log'

export const iamFixtures = {
  root: {
    email: 'e2e-root@stolbek.test',
    password: 'E2e-Root-9x!Secure',
  },
  reader: {
    email: 'e2e-reader@stolbek.test',
    password: 'E2e-Fixture-9x!',
  },
  writer: {
    email: 'e2e-writer@stolbek.test',
    password: 'E2e-Fixture-9x!',
  },
  noroles: {
    email: 'e2e-noroles@stolbek.test',
    password: 'E2e-Fixture-9x!',
  },
} as const
