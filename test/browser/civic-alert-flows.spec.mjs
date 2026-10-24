import { test, expect } from '@playwright/test'
import AxeBuilder from '@axe-core/playwright'

test.describe('main alert flows', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/')
    await expect(page.locator('#feed article').first()).toBeVisible()
    await page.locator('#demoReset').click()
    await expect(page.locator('#feed')).toContainText('Marunji water service notice')
    await expect(page.locator('#feed article')).toHaveCount(2)
  })

  test('situation, category and region filters keep silence from reading as an all-clear', async ({ page }) => {
    await page.locator('#kind').selectOption('water')
    await expect(page.locator('#feed article')).toHaveCount(1)
    await expect(page.locator('#feed')).toContainText('Marunji water service notice')
    await expect(page.locator('#mapSummary')).toContainText('Pune')
    await expect(page.locator('#mapSummary')).not.toContainText('Sindhudurg')

    await page.locator('#resetBtn').click()
    await page.locator('#region').selectOption('konkan')
    await expect(page.locator('#district')).toHaveValue('')
    await expect(page.locator('#feed article')).toHaveCount(1)
    await expect(page.locator('#feed')).toContainText('Sindhudurg road advisory')

    await page.locator('#weaClass').selectOption('WEATHER_ADVISORY')
    await expect(page.locator('#feed .empty')).toContainText(/not an all-clear|do not mean there is no danger/i)
    await expect(page.locator('#feed article')).toHaveCount(0)
    await expect(page.locator('#mapSummary')).toContainText(/not an all-clear/i)

    await page.locator('#resetBtn').click()
    await expect(page.locator('#kind')).toHaveValue('')
    await expect(page.locator('#weaClass')).toHaveValue('')
    await expect(page.locator('#feed article')).toHaveCount(2)

    const axe = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21aa']).analyze()
    expect(axe.violations.map((violation) => violation.id)).toEqual([])
  })

  test('district chip keyboard selection focuses the bulletin', async ({ page }) => {
    const pune = page.getByRole('button', { name: /Pune:.*relayed active alerts/i })
    await pune.focus()
    await pune.press('Enter')
    await expect(page.locator('#alerts')).toBeFocused()
    await expect(page.locator('#district')).toHaveValue('pune')
    await expect(page.locator('#feed article')).toHaveCount(1)
    await expect(page.locator('#feed')).toContainText('Sample instructions')
    const source = page.getByRole('link', { name: /Official portal \(not the source of this sample\)/i })
    await expect(source).toHaveAttribute('href', 'https://sachet.ndma.gov.in/')
    await expect(source).toHaveAttribute('target', '_blank')
    await expect(source).toHaveAccessibleName(/opens in a new tab/i)
  })

  test('refresh keeps the bulletin and the status control outside the live region', async ({ page }) => {
    await expect(page.locator('#connectionStatus')).toHaveAttribute('role', 'status')
    await expect(page.locator('#connectionStatus button')).toHaveCount(0)
    await page.locator('#refreshBtn').evaluate((button) => button.focus({ focusVisible: true }))
    await expect(page.locator('#refreshBtn')).toHaveCSS('outline-color', 'rgb(27, 27, 27)')
    await page.locator('#refreshBtn').click()
    await expect(page.locator('#refreshBtn')).toBeEnabled()
    await expect(page.locator('#feed article')).toHaveCount(2)
    await expect(page.locator('#connectionText')).not.toContainText(/Relay unavailable|Connecting/i)
    await expect(page.locator('#langBtn')).toHaveAccessibleName(/मराठी/)
    await page.locator('#langBtn').click()
    await expect(page.locator('html')).toHaveAttribute('lang', 'mr')
    await expect(page.locator('#langBtn')).toHaveAccessibleName(/English/)
    await expect(page.locator('#feed')).toContainText('मारुंजी')
    await expect(page.getByRole('link', { name: /अधिकृत पोर्टल/ }).first()).toHaveAccessibleName(/नवीन टॅब/)
  })

  test('place search announces a district match without treating it as a village boundary', async ({ page }) => {
    await page.locator('#place').fill('Sawantwadi')
    await page.locator('#locationForm').getByRole('button', { name: 'Find place' }).click()
    await expect(page.locator('#placeStatus')).toContainText(/district matches/i)
    await page.locator('#placeResults button').first().click()
    await expect(page.locator('#district')).toHaveValue('sindhudurg')
    await expect(page.locator('#placeStatus')).toContainText(/not verified/i)
    await expect(page.locator('#feed article')).toHaveCount(1)
    await expect(page.locator('#feed')).toContainText('Sindhudurg road advisory')
  })
})

test('map bundle stays deferred until the map is near the viewport', async ({ page }) => {
  const mapAssets = []
  page.on('request', (request) => {
    if (request.url().includes('maplibre')) mapAssets.push(new URL(request.url()).pathname)
  })
  await page.setViewportSize({ width: 390, height: 420 })
  await page.goto('/')
  await expect(page.locator('#connectionText')).not.toContainText('Connecting')
  expect(mapAssets).toEqual([])
  await page.locator('#alertMap').scrollIntoViewIfNeeded()
  await expect.poll(() => mapAssets.length).toBeGreaterThan(0)
})
