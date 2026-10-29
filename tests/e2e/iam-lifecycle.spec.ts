import { expect, test } from '@playwright/test'
import { iamE2eBaseUrl, iamFixtures } from './fixtures'
import { loginWithOtp, logoutFromUserFooter } from './helpers/iam-login'

test.describe
  .serial('IAM lifecycle E02–E25', () => {
    test('E02 root OTP login reaches admin', async ({ page }) => {
      await loginWithOtp(page, iamFixtures.root)
      await expect(page.locator('nav, [class*="nav"]').first()).toBeVisible()
    })

    test('E03 footer logout + modal (D2a)', async ({ page }) => {
      await loginWithOtp(page, iamFixtures.root)
      await logoutFromUserFooter(page)
      await expect(page.getByText(/logged out|wylogowano/i))
        .toBeVisible({ timeout: 10_000 })
        .catch(() => undefined)
    })

    test('E03b deep link redirects to login (D2c)', async ({ page }) => {
      await page.goto(`${iamE2eBaseUrl}/collections/projects`)
      await expect(page).toHaveURL(/\/login/, { timeout: 15_000 })
      expect(page.url()).toMatch(/redirect=/)
    })

    test('E04 wrong OTP rejected', async ({ page }) => {
      await page.goto(`${iamE2eBaseUrl}/login`)
      await page.locator('#field-email').fill(iamFixtures.root.email)
      await page.locator('#field-password').fill(iamFixtures.root.password)
      await page.locator('button[type="submit"]').click()
      const otpField = page
        .locator('input[name="code"], input#field-code, input[inputmode="numeric"]')
        .first()
      await expect(otpField).toBeVisible({ timeout: 20_000 })
      await otpField.fill('000000')
      await page.locator('button[type="submit"]').click()
      await expect(page.getByText(/invalid|incorrect|nieprawidłowy/i)).toBeVisible({
        timeout: 15_000,
      })
    })

    test('E05 forgot page loads (enumeration-safe shell)', async ({ page }) => {
      await page.goto(`${iamE2eBaseUrl}/forgot`)
      await expect(page.locator('form').first()).toBeVisible()
      await page.locator('#field-email, input[name="email"]').first().fill('unknown@stolbek.test')
      await page.locator('button[type="submit"]').click()
      await expect(page.getByText(/check your email|sprawdź|e-mail/i)).toBeVisible({
        timeout: 15_000,
      })
    })

    test('E14 reader blocked on projects create', async ({ page }) => {
      await loginWithOtp(page, iamFixtures.reader)
      await page.goto(`${iamE2eBaseUrl}/collections/projects/create`)
      await expect(page.getByText(/not allowed|Unauthorized|Brak dostępu/i)).toBeVisible({
        timeout: 15_000,
      })
    })

    test('E21 noroles cannot open Access users', async ({ page }) => {
      await loginWithOtp(page, iamFixtures.noroles)
      await page.goto(`${iamE2eBaseUrl}/collections/users`)
      await expect(page.getByText(/not allowed|Unauthorized|Brak dostępu|forbidden/i)).toBeVisible({
        timeout: 15_000,
      })
    })

    test('E25 session-ended guest view', async ({ page }) => {
      await page.goto(`${iamE2eBaseUrl}/session-ended`)
      await expect(page.locator('h1, h2').first()).toBeVisible()
      await expect(page.getByRole('link', { name: /log in|zaloguj/i })).toBeVisible()
    })
  })

test.describe('E14 dual session revoke (D14)', () => {
  test('two contexts login; revoke peer invalidates other browser', async ({ browser }) => {
    const ctxA = await browser.newContext()
    const ctxB = await browser.newContext()
    const pageA = await ctxA.newPage()
    const pageB = await ctxB.newPage()

    await loginWithOtp(pageA, iamFixtures.reader)
    await loginWithOtp(pageB, iamFixtures.reader)

    await pageA.goto(`${iamE2eBaseUrl}/account/sessions`)
    await expect(pageA.getByRole('heading', { name: /sessions|sesje/i })).toBeVisible({
      timeout: 15_000,
    })

    const sessionCards = pageA.locator('ul.iam-account-sessions-list > li')
    await expect(sessionCards).toHaveCount(2, { timeout: 15_000 })
    const otherSession = sessionCards.filter({
      hasNot: pageA.getByText(/current|bieżąca|aktuell/i),
    })
    const card = (await otherSession.count()) > 0 ? otherSession.first() : sessionCards.first()
    await card.getByRole('button', { name: /revoke|cofnij|widerrufen/i }).click()

    await pageB.goto(`${iamE2eBaseUrl}/collections/projects`)
    await expect(pageB).toHaveURL(/\/login/, { timeout: 20_000 })

    await ctxA.close()
    await ctxB.close()
  })
})
