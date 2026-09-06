import { test, expect } from '@playwright/test'
import AxeBuilder from '@axe-core/playwright'

test('public-service design keeps independent identity and narrow layouts clear', async ({page}, testInfo) => {
  await page.goto('/')
  await expect(page.locator('#feed article')).toHaveCount(2)
  await expect(page.locator('#demoBanner')).toBeVisible()
  await expect(page.locator('#demoBanner')).toContainText('LABELLED DEMO')
  await expect(page.locator('.independent')).toContainText('Not a government website')
  await expect(page.locator('.brand-marathi')).toContainText('महाराष्ट्र')
  await expect(page.getByRole('navigation', {name:'Main navigation'}).getByRole('link')).toHaveCount(5)
  await page.screenshot({path:`output/playwright/portal-${testInfo.project.name}.png`,fullPage:testInfo.project.name==='desktop'})
  for (const width of [320, 768, 1440]) {
    await page.setViewportSize({width,height:900})
    for (const language of ['en','mr']) {
      if (await page.locator('html').getAttribute('lang') !== language) await page.locator('#langBtn').click()
      expect(await page.evaluate(()=>document.documentElement.scrollWidth <= innerWidth + 1)).toBe(true)
      await expect(page.locator('.independent')).toBeVisible()
      await expect(page.locator('.portal-nav')).toBeVisible()
    }
  }
})

test('demo lifecycle controls advance, cancel and reset labelled fixtures', async ({ page }) => {
  await page.goto('/')
  await expect(page.locator('#demoBanner')).toBeVisible()
  await expect(page.locator('#demoAdvance')).toBeVisible()
  await expect(page.locator('#demoReset')).toBeVisible()
  await expect(page.locator('#feed article')).toHaveCount(2)
  await expect(page.locator('#feed')).toContainText('Marunji water service notice')

  await page.locator('#demoAdvance').click()
  await expect(page.locator('#feed article')).toHaveCount(2)
  await expect(page.locator('#feed')).toContainText('Marunji water notice revised')
  await expect(page.locator('#feed')).not.toContainText('Marunji water service notice')

  await page.locator('#demoAdvance').click()
  await expect(page.locator('#feed article')).toHaveCount(1)
  await expect(page.locator('#feed')).toContainText('Sindhudurg road advisory')
  await expect(page.locator('#feed')).not.toContainText('Marunji water notice revised')

  await page.locator('#demoReset').click()
  await expect(page.locator('#feed article')).toHaveCount(2)
  await page.locator('#langBtn').click()
  await expect(page.locator('#feed')).toContainText('मारुंजी पाणीपुरवठा सूचना')
})

test('official fixture text is safe; filters, place search and Marathi work', async ({ page }) => {
  const errors = []
  page.on('pageerror', error => errors.push(error.message))
  await page.goto('/')
  await expect(page.locator('#feed article')).toHaveCount(2)
  await expect(page.locator('#feed')).toContainText('<img src=x onerror=')
  expect(await page.evaluate(() => window.__feedInjected)).toBeUndefined()
  await page.locator('#district').selectOption('pune')
  await expect(page.locator('#feed article')).toHaveCount(1)
  await page.locator('#langBtn').click()
  await expect(page.locator('html')).toHaveAttribute('lang', 'mr')
  await expect(page.locator('#feed')).toContainText('पाणीपुरवठा सूचना')
  await page.locator('#langBtn').click()
  await page.locator('#resetBtn').click()
  await page.locator('#place').fill('Sawantwadi')
  await page.locator('#locationForm button').click()
  await expect(page.locator('#placeResults')).toContainText(/sawantwadi/i)
  await page.locator('#placeResults button').first().click()
  await expect(page.locator('#district')).toHaveValue('sindhudurg')
  await expect(page.locator('#feed article')).toHaveCount(1)
  await expect(page.locator('#feed')).toContainText('Sindhudurg road advisory')
  await expect(page.locator('#serviceGrid')).toContainText('Electricity')
  await expect(page.locator('#coverageGrid button')).toHaveCount(36)
  expect(errors).toEqual([])
})

test('keyboard, narrow layout and automated accessibility', async ({ page }) => {
  await page.goto('/')
  await expect(page.locator('#feed article')).toHaveCount(2)
  await page.keyboard.press('Tab')
  await expect(page.locator('.skip')).toBeFocused()
  for (const language of ['en', 'mr']) {
    if (language === 'mr') await page.locator('#langBtn').click()
    const results = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21aa']).analyze()
    expect(results.violations.map(v => ({ id: v.id, impact: v.impact, nodes: v.nodes.map(n => n.target) }))).toEqual([])
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 1)).toBe(true)
  }
})

test('network failure retains a labelled cached snapshot', async ({ page, context }) => {
  await page.goto('/')
  await expect(page.locator('#feed article')).toHaveCount(2)
  await page.evaluate(() => navigator.serviceWorker.ready)
  await page.reload()
  await expect(page.locator('#feed article')).toHaveCount(2)
  await context.setOffline(true)
  await page.reload()
  await expect(page.locator('#connection')).toContainText(/offline|cached|last known/i)
  await expect(page.locator('#feed article')).toHaveCount(2)
  await context.setOffline(false)
})

test('denied storage and notifications do not block the bulletin', async ({ page }) => {
  await page.addInitScript(() => {
    Storage.prototype.getItem = () => { throw new DOMException('Denied', 'SecurityError') }
    Storage.prototype.setItem = () => { throw new DOMException('Denied', 'SecurityError') }
    Object.defineProperty(window, 'Notification', { configurable: true, value: class {
      static permission = 'denied'
      static requestPermission() { return Promise.resolve('denied') }
    } })
  })
  await page.goto('/')
  await expect(page.locator('#feed article')).toHaveCount(2)
  await page.locator('#notifyBtn').click()
  await expect(page.locator('#notificationStatus')).toContainText('Permission was not granted')
  await page.locator('#langBtn').click()
  await expect(page.locator('#feed')).toContainText('पाणीपुरवठा सूचना')
})

test('pagination beyond 500 alerts remains complete', async ({ page }) => {
  await page.route('**/api/alerts?*', async route => {
    const url = new URL(route.request().url())
    const response = await route.fetch({ url: new URL('/api/alerts?limit=500', url).href })
    const body = await response.json()
    const source = body.alerts[0]
    const offset = Number(url.searchParams.get('offset') || 0)
    const alerts = Array.from({ length: offset === 0 ? 500 : 1 }, (_, n) => ({ ...source, id: `page-fixture-${offset + n}` }))
    await route.fulfill({ json: { ...body, generatedAt: '2026-09-06T10:00:00Z', alerts, count: 501, pagination: { total: 501, offset, nextOffset: offset === 0 ? 500 : null, snapshot: 'test-only' } } })
  })
  await page.goto('/')
  await expect(page.locator('#feed article')).toHaveCount(501)
})

test('event pitch deck is labelled, linked and keyboard reachable', async ({ page }) => {
  await page.goto('/pitch.html')
  await expect(page.getByRole('heading', { level: 1 })).toContainText('Maharashtra Civic Alerts')
  await expect(page.getByRole('link', { name: 'GitHub' })).toHaveAttribute(
    'href',
    'https://github.com/mangeshraut712/maharashtra-sachet',
  )
  await expect(page.getByRole('link', { name: 'Download PPTX' })).toHaveAttribute('href', '/pitch.pptx')
  await page.keyboard.press('ArrowRight')
  await expect(page.locator('#progress')).toContainText('2 / 9')
  await page.goto('/pitch.html#s9')
  await expect(page.getByRole('link', { name: 'Live demo — Cloudflare Workers' })).toHaveAttribute(
    'href',
    'https://maharashtra-sachet.mangeshraut712.workers.dev',
  )
  const axe = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21aa']).analyze()
  expect(axe.violations.map((v) => v.id)).toEqual([])
})

test('phone readiness guide is accessible and never offers to trigger a broadcast', async ({page}) => {
  await page.goto('/phone-alerts.html')
  await expect(page.getByRole('heading', {level:1})).toContainText('Keep official alerts')
  await expect(page.locator('a[href="https://support.apple.com/en-us/102516"]')).toBeVisible()
  const axe = await new AxeBuilder({page}).withTags(['wcag2a','wcag2aa','wcag21aa']).analyze()
  expect(axe.violations.map(v=>v.id)).toEqual([])
  expect(await page.evaluate(()=>document.documentElement.scrollWidth <= innerWidth + 1)).toBe(true)
})
