import { test, expect } from '@playwright/test'

test('demo snapshots cannot appear when the live bulletin is unavailable', async ({ page }) => {
  await page.goto('/?demo=1')
  await expect(page.locator('#feed article')).toHaveCount(2)
  await expect(page.locator('#demoBanner')).toContainText('DEMO / sample data')
  await expect(page.locator('#sourceList')).toContainText('No live sources were checked')
  await expect(page.locator('#notifyBtn')).toBeDisabled()
  await expect.poll(() => page.evaluate(() => Boolean(localStorage.getItem('mh-sachet-demo-snapshot')))).toBe(true)
  expect(await page.evaluate(() => localStorage.getItem('mh-sachet-snapshot'))).toBeNull()

  const meta = await (await page.request.get('/api/meta')).json()
  await page.route('**/api/meta', route => route.fulfill({ json: { ...meta, environment: 'production', demo: false, demoControls: false } }))
  await page.route('**/api/alerts?**', route => route.fulfill({ status: 503, json: { error: 'Relay unavailable' } }))
  await page.goto('/')
  await expect(page.locator('#connectionText')).toContainText('Relay unavailable')
  await expect(page.locator('#demoBanner')).toBeHidden()
  await expect(page.locator('#feed article')).toHaveCount(0)
  await expect(page.locator('#feed')).not.toContainText('Marunji')
  await expect(page.locator('#metroEntry')).toHaveAttribute('href', '/metro')
  await expect(page.getByRole('link', { name: /60-second DEMO/ })).toBeVisible()
})
