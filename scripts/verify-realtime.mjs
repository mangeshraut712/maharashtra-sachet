import { resolve } from 'node:path'
import { pathToFileURL } from 'node:url'

const DEFAULT_URL = 'https://maharashtra-sachet.mangeshraut712.workers.dev'
const sleep = ms => new Promise(resolveWait => setTimeout(resolveWait, ms))

export async function observeGenerations({ fetch: fetchImpl = globalThis.fetch, url = DEFAULT_URL, intervalMs = 5_000, timeoutMs = 90_000, now = Date.now, wait = sleep, log = row => console.log(JSON.stringify(row)) } = {}) {
  const healthUrl = new URL('/api/health', `${url.replace(/\/$/, '')}/`).href
  const deadline = now() + timeoutMs
  const observations = []
  let lastTimestamp = null
  while (now() <= deadline) {
    const response = await fetchImpl(healthUrl, { headers: { accept: 'application/json' }, cache: 'no-store', signal: AbortSignal.timeout(15_000) })
    if (!response.ok) throw new Error(`Health check returned HTTP ${response.status}`)
    const body = await response.json()
    const timestamp = Date.parse(body.generatedAt)
    if (!Number.isFinite(timestamp)) throw new Error('Health check returned invalid generatedAt')
    if (lastTimestamp !== null && timestamp < lastTimestamp) throw new Error('Generation timestamp regressed')
    if (lastTimestamp !== timestamp) {
      const row = { generatedAt: body.generatedAt, status: body.status }
      observations.push(row)
      log(row)
      lastTimestamp = timestamp
      if (observations.length === 2) return observations
    }
    const remaining = deadline - now()
    if (remaining <= 0) break
    await wait(Math.min(intervalMs, remaining))
  }
  throw new Error(`Generation did not advance within ${timeoutMs}ms`)
}

function boundedInteger(value, fallback, min, max) {
  if (value == null || value === '') return fallback
  if (!/^\d+$/.test(value)) throw new Error('Invalid realtime verifier timing')
  const parsed = Number(value)
  if (!Number.isSafeInteger(parsed) || parsed < min || parsed > max) throw new Error('Realtime verifier timing out of range')
  return parsed
}

async function main() {
  const url = process.env.LIVE_URL || DEFAULT_URL
  const intervalMs = boundedInteger(process.env.REALTIME_INTERVAL_MS, 5_000, 1_000, 30_000)
  const timeoutMs = boundedInteger(process.env.REALTIME_TIMEOUT_MS, 90_000, intervalMs, 300_000)
  try {
    const observations = await observeGenerations({ url, intervalMs, timeoutMs })
    console.log(JSON.stringify({ ok: true, url, generations: observations.length }))
  } catch (error) {
    console.error(JSON.stringify({ ok: false, url, error: error instanceof Error ? error.message : 'Unknown error' }))
    process.exitCode = 1
  }
}

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) await main()
