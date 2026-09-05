import { defineConfig, devices } from '@playwright/test'

export default defineConfig({
  testDir: './test/browser',
  testMatch: process.env.LIVE_URL ? '**/deployed.spec.mjs' : '**/civic-hub.spec.mjs',
  timeout: 30_000,
  fullyParallel: false,
  workers: 1,
  reporter: 'list',
  use: { baseURL: process.env.LIVE_URL || 'http://127.0.0.1:8800', channel: 'chromium', trace: 'retain-on-failure', screenshot: 'only-on-failure' },
  projects: [
    { name: 'desktop', use: { ...devices['Desktop Chrome'] } },
    { name: 'mobile', use: { ...devices['iPhone 13'], defaultBrowserType: 'chromium' } },
  ],
  webServer: process.env.LIVE_URL ? undefined : { command: 'PORT=8800 node test/browser-server.mjs', url: 'http://127.0.0.1:8800/api/meta', reuseExistingServer: false },
})
