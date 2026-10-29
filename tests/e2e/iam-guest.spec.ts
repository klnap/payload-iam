import { expect, test } from '@playwright/test'
import { iamE2eBaseUrl } from './fixtures'

async function guestTitleToContentGap(page: import('@playwright/test').Page) {
  const title = page.locator('h1').first()
  const content = page.locator('.login__form, form').first()
  await expect(title).toBeVisible()
  await expect(content).toBeVisible()
  const titleBox = await title.boundingBox()
  const contentBox = await content.boundingBox()
  expect(titleBox).not.toBeNull()
  expect(contentBox).not.toBeNull()
  const gap = contentBox!.y - (titleBox!.y + titleBox!.height)
  expect(gap).toBeGreaterThanOrEqual(12)
}

test.describe('E01 — guest shell', () => {
  test('login form renders', async ({ page }) => {
    await page.goto(`${iamE2eBaseUrl}/login`)
    await expect(page.locator('.login__form, form').first()).toBeVisible()
  })

  test('forgot password title and form are spaced', async ({ page }) => {
    await page.goto(`${iamE2eBaseUrl}/forgot`)
    await guestTitleToContentGap(page)
  })
})
