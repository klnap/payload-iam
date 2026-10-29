import { describe, expect, test } from 'bun:test'
import {
  extractDevMailActions,
  formatDevMailLogLine,
} from '../../../../src/adapters/payload/dev-mail-log'

describe('dev-mail-log', () => {
  test('extractDevMailActions pulls otp and first link from html', () => {
    const html = '<a href="https://example.com/invite?x=1">Go</a><strong>123456</strong>'
    const result = extractDevMailActions({ html, text: 'Sign-in code: 999999' })
    expect(result.links).toEqual(['https://example.com/invite?x=1'])
    expect(result.otp).toBe('123456')
  })

  test('formatDevMailLogLine includes otp and link', () => {
    const line = formatDevMailLogLine({
      to: 'a@b.com',
      subject: 'Invitation',
      otp: '111222',
      links: ['https://example.com/reset'],
    })
    expect(line).toContain('[dev-mail] to=a@b.com')
    expect(line).toContain('otp=111222')
    expect(line).toContain('link=https://example.com/reset')
  })
})
