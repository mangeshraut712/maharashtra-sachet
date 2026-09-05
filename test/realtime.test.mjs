import assert from 'node:assert/strict'
import test from 'node:test'
import { observeGenerations } from '../scripts/verify-realtime.mjs'

const health = (generatedAt, status = 'healthy', http = 200) => Response.json({ generatedAt, status }, { status: http })

test('generation observer requires two advancing snapshots', async () => {
  let index = 0
  const rows = ['2026-09-06T10:00:00Z', '2026-09-06T10:00:00Z', '2026-09-06T10:01:00Z']
  let clock = 0
  const result = await observeGenerations({
    fetch: async () => health(rows[Math.min(index++, rows.length - 1)]),
    url: 'https://example.test', intervalMs: 5, timeoutMs: 20,
    now: () => clock, wait: async ms => { clock += ms }, log: () => {},
  })
  assert.deepEqual(result.map(row => row.generatedAt), [rows[0], rows[2]])
})

test('generation observer fails closed for stalled, invalid, regressing and HTTP-error state', async () => {
  async function rejects(fetch, pattern) {
    let clock = 0
    await assert.rejects(observeGenerations({
      fetch, url: 'https://example.test', intervalMs: 5, timeoutMs: 10,
      now: () => clock, wait: async ms => { clock += ms }, log: () => {},
    }), pattern)
  }
  await rejects(async () => health('2026-09-06T10:00:00Z'), /did not advance/i)
  await rejects(async () => health('not-a-date'), /invalid generatedAt/i)
  let regression = 0
  await rejects(async () => health(regression++ ? '2026-09-06T09:59:00Z' : '2026-09-06T10:00:00Z'), /regressed/i)
  await rejects(async () => health('2026-09-06T10:00:00Z', 'stale', 503), /HTTP 503/i)
})
