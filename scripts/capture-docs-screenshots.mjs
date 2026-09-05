import { mkdir } from 'node:fs/promises'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { chromium, devices } from '@playwright/test'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')
const outDir = join(root, 'docs', 'screenshots')
const baseURL = process.env.LIVE_URL || 'https://maharashtra-sachet.mangeshraut712.workers.dev'

await mkdir(outDir, { recursive: true })

async function waitForBulletin(page) {
  await page.waitForFunction(() => {
    const text = document.body?.innerText || ''
    return text.includes('Public alert bulletin') && !text.includes('A verified snapshot is not available yet')
  }, null, { timeout: 20_000 })
}

async function shot(page, name) {
  await page.screenshot({ path: join(outDir, name), fullPage: false })
}

const browser = await chromium.launch({ channel: 'chromium' })

const desktop = await browser.newPage({ viewport: { width: 1440, height: 900 }, deviceScaleFactor: 1 })
await desktop.goto(baseURL, { waitUntil: 'networkidle' })
await waitForBulletin(desktop)
await shot(desktop, 'desktop-home.png')

await desktop.getByLabel('Find a town, village or district').fill('Navi Mumbai')
await desktop.getByRole('button', { name: 'Find place' }).click()
await desktop.getByText('Raigad').first().waitFor()
await shot(desktop, 'desktop-search-navi-mumbai.png')

await desktop.getByRole('button', { name: 'Reset filters' }).click()
await desktop.getByRole('heading', { name: 'Source health' }).scrollIntoViewIfNeeded()
await shot(desktop, 'desktop-source-health.png')

await desktop.getByRole('button', { name: 'मराठी' }).click()
await desktop.getByRole('button', { name: 'English' }).waitFor()
await desktop.evaluate(() => window.scrollTo(0, 0))
await shot(desktop, 'desktop-marathi.png')
await desktop.close()

const phone = devices['iPhone 13']
const mobile = await browser.newPage({ ...phone })
await mobile.goto(baseURL, { waitUntil: 'networkidle' })
await waitForBulletin(mobile)
await shot(mobile, 'mobile-home.png')
await mobile.goto(`${baseURL}/phone-alerts.html`, { waitUntil: 'networkidle' })
await shot(mobile, 'mobile-phone-guide.png')
await mobile.close()

await browser.close()
console.log(`Wrote screenshots to ${outDir} from ${baseURL}`)
