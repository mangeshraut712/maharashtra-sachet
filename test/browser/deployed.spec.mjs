import { test, expect } from '@playwright/test'
import AxeBuilder from '@axe-core/playwright'

test('deployed civic hub renders, filters and reports actual source coverage', async ({ page, request }, testInfo) => {
  const errors = []
  page.on('pageerror', error => errors.push(error.message))
  await page.addInitScript(() => {
    window.__metrics = { lcp: 0, cls: 0 }
    new PerformanceObserver(list => { for (const e of list.getEntries()) window.__metrics.lcp = e.startTime }).observe({ type: 'largest-contentful-paint', buffered: true })
    new PerformanceObserver(list => { for (const e of list.getEntries()) if (!e.hadRecentInput) window.__metrics.cls += e.value }).observe({ type: 'layout-shift', buffered: true })
  })
  const response = await page.goto('/')
  expect(response.status()).toBe(200)
  expect(response.headers()['content-security-policy']).toContain("script-src 'self'")
  await expect(page.locator('#coverageGrid button')).toHaveCount(36)
  await expect(page.locator('#serviceGrid article')).toHaveCount(12)
  await expect(page.locator('#sourceList')).toContainText(/SACHET/i)
  await expect(page.locator('#demoBanner')).toBeHidden()
  await expect(page.locator('#demoAdvance')).toBeHidden()
  await expect(page.locator('#demoReset')).toBeHidden()
  const metrics = await page.evaluate(() => {
    const nav = performance.getEntriesByType('navigation')[0]
    return { ...window.__metrics, ttfb: nav.responseStart, domContentLoaded: nav.domContentLoadedEventEnd, resources: performance.getEntriesByType('resource').map(r => ({ name: new URL(r.name).pathname, bytes: r.transferSize })) }
  })
  console.log(JSON.stringify({ viewport: testInfo.project.name, url: page.url(), measurements: metrics }))
  await page.screenshot({ path: `output/playwright/${testInfo.project.name}-live.png`, fullPage: true })
  for (const lang of ['en', 'mr']) {
    if (lang === 'mr') await page.locator('#langBtn').click()
    const axe = await new AxeBuilder({ page }).withTags(['wcag2a','wcag2aa','wcag21aa']).analyze()
    expect(axe.violations.map(v => ({ id: v.id, nodes: v.nodes.map(n => n.target) }))).toEqual([])
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1)).toBe(true)
  }
  await page.locator('#district').selectOption('pune')
  await expect(page.locator('#district')).toHaveValue('pune')
  const meta = await request.get('/api/meta')
  expect(meta.status()).toBe(200)
  expect((await meta.json()).districts).toHaveLength(36)
  const locations = await request.get('/api/locations?q=Navi%20Mumbai')
  expect((await locations.json()).locations.map(x => x.districtId).sort()).toEqual(['raigad','thane'])
  expect((await request.get('/api/alerts?limit=NaN')).status()).toBe(400)
  expect((await request.post('/api/alerts')).status()).toBe(405)
  expect((await request.post('/__demo/advance')).status()).toBe(405)
  const sourceResponse = await request.get('/api/sources')
  const sources = await sourceResponse.json()
  expect(sources.generatedAt).not.toBeNull()
  console.log(JSON.stringify({ sourceStatus: sources.status, generatedAt: sources.generatedAt, sources: sources.sources }))
  expect(errors).toEqual([])
})
