import assert from 'node:assert/strict'
import { once } from 'node:events'
import test from 'node:test'
import { createDemoServer } from '../demo/server.mjs'
import { createRelay, createRelayServer } from '../server/index.mjs'
import { build } from 'esbuild'
import { Miniflare } from 'miniflare'

async function start(server) {
  server.listen(0, '127.0.0.1')
  await once(server, 'listening')
  return `http://127.0.0.1:${server.address().port}`
}

test('local demo advances Alert to Update to Cancel and resets', async t => {
  const server = createDemoServer({ now: () => Date.parse('2026-09-06T10:00:00Z') })
  const base = await start(server)
  t.after(() => new Promise(resolve => server.close(resolve)))

  const meta = await (await fetch(`${base}/api/meta`)).json()
  assert.equal(meta.environment, 'demo')
  assert.equal(meta.demoControls, true)
  let feed = await (await fetch(`${base}/api/alerts`)).json()
  assert.equal(feed.count, 2)
  assert.equal(feed.alerts.some(alert => alert.id === 'demo-water-alert'), true)
  assert.equal(feed.demo, true)
  assert.equal(feed.alerts.every(alert => alert.demo && !alert.official && alert.status === 'Test'), true)

  let control = await (await fetch(`${base}/__demo/advance`, { method: 'POST' })).json()
  assert.equal(control.step, 1)
  feed = await (await fetch(`${base}/api/alerts`)).json()
  assert.equal(feed.count, 2)
  assert.equal(feed.alerts.some(alert => alert.id === 'demo-water-update'), true)
  assert.equal(feed.alerts.some(alert => alert.id === 'demo-water-alert'), false)

  control = await (await fetch(`${base}/__demo/advance`, { method: 'POST' })).json()
  assert.equal(control.step, 2)
  feed = await (await fetch(`${base}/api/alerts`)).json()
  assert.equal(feed.count, 1)
  assert.equal(feed.alerts[0].id, 'demo-road-alert')

  control = await (await fetch(`${base}/__demo/reset`, { method: 'POST' })).json()
  assert.equal(control.step, 0)
  assert.equal((await (await fetch(`${base}/api/alerts`)).json()).count, 2)
})

test('normal Node server has no demo mutation controls', async t => {
  const server = createRelayServer({ relay: createRelay({ collectors: [] }) })
  const base = await start(server)
  t.after(() => new Promise(resolve => server.close(resolve)))
  assert.equal((await fetch(`${base}/__demo/advance`, { method: 'POST' })).status, 405)
  assert.equal((await fetch(`${base}/__demo/reset`)).status, 404)
})

test('query demo is labelled, read-only, and isolated from the live Node relay', async t => {
  let liveReads = 0
  const live = createRelay({ collectors: [] })
  const server = createRelayServer({ relay: { getState() { liveReads++; return live.getState() } } })
  const base = await start(server)
  t.after(() => new Promise(resolve => server.close(resolve)))

  const meta = await (await fetch(`${base}/api/meta?demo=1`)).json()
  assert.equal(meta.environment, 'demo')
  assert.equal(meta.demoControls, false)
  assert.match(meta.demoLabel, /DEMO \/ sample data/)
  assert.equal(meta.districts.length, 36)
  assert.equal(meta.features.situationalLayers.enabled, false)
  assert.equal(meta.features.jevShadow.enabled, false)
  const response = await fetch(`${base}/api/v1/alerts?demo=1&district=pune`)
  assert.equal(response.headers.get('x-sachet-data-mode'), 'demo')
  assert.equal(response.headers.get('cache-control'), 'no-store')
  const feed = await response.json()
  assert.equal(feed.count, 1)
  assert.equal(feed.alerts[0].id, 'demo-water-alert')
  assert.equal(feed.alerts[0].official, false)
  assert.equal(feed.alerts[0].status, 'Test')
  assert.equal(feed.alerts[0].capUrl, undefined)
  assert.equal(feed.sources.sachet.demo, true)
  assert.equal((await (await fetch(`${base}/api/locations?demo=1&q=Pune`)).json()).locations[0].districtId, 'pune')
  assert.equal(liveReads, 0)

  const liveFeed = await (await fetch(`${base}/api/alerts`)).json()
  assert.equal(liveFeed.count, 0)
  assert.equal(liveFeed.demo, undefined)
  assert.equal(liveReads, 1)
  assert.equal((await fetch(`${base}/api/alerts?demo=1`, { method: 'POST' })).status, 405)
  assert.equal((await fetch(`${base}/api/meta?demo=1&demo=1`)).status, 400)
  assert.equal((await fetch(`${base}/api/meta?demo=1&unexpected=1`)).status, 400)
  const head = await fetch(`${base}/api/alerts?demo=1`, { method: 'HEAD' })
  assert.equal(head.status, 200)
  assert.equal(await head.text(), '')
  const explanation = await fetch(`${base}/api/explain?demo=1`, {
    method: 'POST', headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ alertText: 'DEMO / sample data: Pune district water service notice. Check the local authority.' }),
  })
  assert.equal(explanation.status, 200)
  const explained = await explanation.json()
  assert.equal(explained.source, 'offline-fallback')
  assert.ok(explained.data.marathi.summary)
})

test('Worker demo still serves fixtures without D1 and never enables demo mutations', async t => {
  const result = await build({ entryPoints: ['src/index.ts'], bundle: true, write: false, format: 'esm', platform: 'browser', target: 'es2022', external: ['node:*'] })
  // No DB binding: any accidental live read, ingest, or recovery would fail.
  const mf = new Miniflare({ workers: [{ config: {
    name: 'demo-isolation-test', type: 'worker', compatibilityDate: '2026-09-05', compatibilityFlags: ['nodejs_compat'],
    manifest: { mainModule: 'index.js', modules: { 'index.js': { type: 'esm', contents: result.outputFiles[0].text } } },
    env: { ENVIRONMENT: { type: 'text', value: 'production' }, JEV_SHADOW_ENABLED: { type: 'text', value: 'true' }, SITUATIONAL_LAYERS_ENABLED: { type: 'text', value: 'true' } },
  } }] })
  t.after(() => mf.dispose())
  const request = (path, options) => mf.dispatchFetch(`https://example.test${path}`, options)
  assert.equal((await request('/api/alerts')).status, 503)
  const meta = await (await request('/api/meta?demo=1')).json()
  assert.equal(meta.demo, true)
  assert.equal(meta.demoControls, false)
  assert.equal(meta.features.situationalLayers.enabled, false)
  assert.equal(meta.features.jevShadow.enabled, false)
  const response = await request('/api/alerts?demo=1&district=pune')
  assert.equal(response.status, 200)
  assert.equal(response.headers.get('strict-transport-security'), 'max-age=31536000')
  const feed = await response.json()
  assert.equal(feed.count, 1)
  assert.equal(feed.alerts[0].demo, true)
  assert.equal(feed.alerts[0].official, false)
  assert.equal((await request('/api/health?demo=1')).status, 200)
  assert.equal((await request('/api/alerts?demo=1', { method: 'HEAD' })).status, 200)
  assert.equal(await (await request('/api/alerts?demo=1', { method: 'HEAD' })).text(), '')
  assert.equal((await request('/__demo/advance?demo=1', { method: 'POST' })).status, 405)
  assert.equal((await request('/api/jev/shadow?demo=1')).status, 404)
  assert.equal((await request('/api/situational?demo=1')).status, 404)
  assert.equal((await request('/api/alerts?demo=1', { method: 'POST' })).status, 405)
  assert.equal((await request('/api/alerts')).status, 503)
})
