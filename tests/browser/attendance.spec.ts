import { test, expect } from '@playwright/test'
async function navigate(page: import('@playwright/test').Page) {
  const menu = page.getByRole('button', { name: 'Open navigation' })
  if (await menu.isVisible()) await menu.click()
  await page.getByRole('navigation').getByRole('button', { name: 'Attendance', exact: true }).click()
}
test('sample trainee can type a code and sees a session receipt', async ({ page }) => {
  await page.goto('/'); await navigate(page)
  await page.getByRole('button', { name: 'Use current sample code' }).click()
  await page.getByRole('button', { name: 'Check in', exact: true }).click()
  await expect(page.getByRole('status').filter({ hasText: 'Sample check-in recorded' })).toBeVisible()
  await expect(page.locator('.attendance-receipt')).toHaveText('present')
  await expect(page.getByRole('button', { name: 'Send leave request' })).toBeDisabled()
})
test('sample trainer sees a rotating QR and reason-required roster correction', async ({ page }) => {
  await page.goto('/'); await page.getByLabel('Preview as').selectOption('Trainer'); await navigate(page)
  await expect(page.getByLabel('Current attendance code')).toHaveText(/^[0-9]{8}$/)
  await expect(page.getByRole('button', { name: 'Verify present' }).first()).toBeDisabled()
  await page.getByLabel('Correction reason for Alex Demo').fill('Verified in the room after camera failure')
  await page.getByRole('button', { name: 'Verify present' }).first().click()
  await expect(page.locator('.roster-person').filter({ hasText: 'Alex Demo' })).toContainText('present')
  await page.getByRole('button', { name: 'Finalize delivered session' }).click()
  await expect(page.locator('.roster-person').filter({ hasText: 'River Demo' })).toContainText('absent')
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true)
})
