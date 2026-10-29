import { expect, type Page } from '@playwright/test'
import { iamE2eBaseUrl } from '../fixtures'
import { latestLoginOtpFromLog } from './iam-dev-mail'

export async function loginWithOtp(
  page: Page,
  user: { email: string; password: string },
  opts?: { otp?: string }
) {
  await page.goto(`${iamE2eBaseUrl}/login`)
  await page.locator('#field-email').fill(user.email)
  await page.locator('#field-password').fill(user.password)
  await page.locator('button[type="submit"]').click()

  const otpField = page
    .locator('input[name="code"], input#field-code, input[inputmode="numeric"]')
    .first()
  await expect(otpField).toBeVisible({ timeout: 20_000 })
  const otp = opts?.otp ?? latestLoginOtpFromLog()
  await otpField.fill(otp)
  await page.locator('button[type="submit"]').click()
  await page.waitForURL(/\/(login)?$/, { timeout: 30_000 })
  await expect(page).not.toHaveURL(/\/login$/)
}

export async function logoutFromUserFooter(page: Page) {
  const menuTrigger = page.locator('[aria-haspopup="menu"]').first()
  await menuTrigger.click()
  await page
    .getByText(/log out|wyloguj/i)
    .first()
    .click()
  const modal = page.locator('.payload__modal-item--enterDone, .payload__modal-item--enter')
  await expect(modal).toBeVisible({ timeout: 10_000 })
  await modal.getByRole('button', { name: /log out|wyloguj/i }).click()
  await expect(page).toHaveURL(/\/login/, { timeout: 20_000 })
}
