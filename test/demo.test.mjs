import assert from 'node:assert/strict'
import { once } from 'node:events'
import test from 'node:test'
import { createDemoServer } from '../demo/server.mjs'
import { createRelay, createRelayServer } from '../server/index.mjs'

async function start(server) {
  server.listen(0, '127.0.0.1')
  await once(server, 'listening')
  return `http://127.0.0.1:${server.address().port}`
}

test('local demo advances Alert to Update to Cancel and resets', async t => {
  const server = createDemoServer({ now: () => Date.parse('2026-09-06T10:00:00Z') })
  const base = await start(server)
  t.after(() => new Promise(resolve => server.close(resolve)))

  assert.equal((await (await fetch(`${base}/api/meta`)).json()).environment, 'demo')
  let feed = await (await fetch(`${base}/api/alerts`)).json()
  assert.equal(feed.count, 2)
  assert.equal(feed.alerts.some(alert => alert.id === 'demo-water-alert'), true)

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
