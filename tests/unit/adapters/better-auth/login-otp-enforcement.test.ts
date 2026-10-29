import { describe, expect, test } from 'bun:test'
import {
  emailSignInRequiresLoginOtp,
  signInEmailFromLoginBody,
} from '../../../../src/adapters/better-auth/login-otp-enforcement'

describe('signInEmailFromLoginBody', () => {
  test('reads normalized email from sign-in body', () => {
    expect(signInEmailFromLoginBody({ email: '  User@Example.com  ' })).toBe('user@example.com')
    expect(signInEmailFromLoginBody({})).toBe('')
    expect(signInEmailFromLoginBody(null)).toBe('')
  })
})

describe('emailSignInRequiresLoginOtp', () => {
  test('matches credential sign-in paths only', () => {
    expect(emailSignInRequiresLoginOtp('/sign-in/email')).toBe(true)
    expect(emailSignInRequiresLoginOtp('/sign-in/email/')).toBe(true)
    expect(emailSignInRequiresLoginOtp('/sign-in/username')).toBe(true)
    expect(emailSignInRequiresLoginOtp('/sign-in/phone-number')).toBe(true)
    expect(emailSignInRequiresLoginOtp('/callback/google')).toBe(false)
    expect(emailSignInRequiresLoginOtp('/sign-in/social')).toBe(false)
  })
})
