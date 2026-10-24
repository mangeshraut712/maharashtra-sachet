import test from 'node:test'
import assert from 'node:assert/strict'
import { isDemoQuery, demoApiUrl, snapshotKey, snapshotMatchesMode } from '../web/modules/demo-mode.mjs'

test('only explicit demo=1 opts into sample API data, retaining filters', () => {
  for (const search of ['', '?demo=0', '?demo=true', '?error=unavailable']) assert.equal(isDemoQuery(search), false)
  assert.equal(isDemoQuery('?demo=1'), true)
  assert.equal(demoApiUrl('/api/alerts?district=pune', true), '/api/alerts?district=pune&demo=1')
  assert.equal(demoApiUrl('/api/alerts?district=pune', false), '/api/alerts?district=pune')
  assert.equal(demoApiUrl('/__demo/advance', true), '/__demo/advance')
})

test('live snapshot storage cannot restore demo records, including legacy fixtures', () => {
  assert.notEqual(snapshotKey(true), snapshotKey(false))
  const live = { meta: { environment: 'production' }, body: { alerts: [{ id: 'live' }] } }
  const demo = { meta: { environment: 'demo' }, body: { alerts: [] } }
  assert.equal(snapshotMatchesMode(live, false), true)
  assert.equal(snapshotMatchesMode(live, true), false)
  assert.equal(snapshotMatchesMode(demo, false), false)
  assert.equal(snapshotMatchesMode(demo, true), true)
  assert.equal(snapshotMatchesMode({ meta: {}, body: { alerts: [{ id: 'demo-water-alert' }] } }, false), false)
  assert.equal(snapshotMatchesMode({ meta: {}, body: { demo: true, alerts: [] } }, false), false)
})
