import test from 'node:test'
import assert from 'node:assert/strict'
import { once } from 'node:events'
import { createRelay, createRelayServer, boundedInteger } from '../server/index.mjs'
import { collectSnapshot, emptyState, handleApi, publicSnapshot, retainLifecycle, snapshotNeedsIngest, SOURCE_IDS, sourceCollectors, STALE_MS, MAX_SOURCE_BYTES, classifySourceError } from '../server/service.mjs'

const NOW = Date.parse('2026-09-05T10:00:00Z')
const alert = (id, extra = {}) => ({ id, source: 'sachet', sender: 'official', sent: new Date(NOW - 1000).toISOString(), effective: new Date(NOW - 1000).toISOString(), expires: new Date(NOW + 600_000).toISOString(), status: 'Actual', scope: 'Public', msgType: 'Alert', districts: [{ id: 'pune' }], weaClass: 'WEATHER_ADVISORY', kind: 'rain', ...extra })
const success = records => SOURCE_IDS.map(id => ({ id, collect: async () => id === 'sachet' ? records : [] }))

test('source diagnostic codes are allowlisted and safely classify nested causes', () => {
  for (const [error, expected] of [
    [new DOMException('deadline', 'TimeoutError'), 'timeout'],
    [new Error('Upstream timeout'), 'timeout'],
    [Object.assign(new Error('arbitrary'), { code: 'SOURCE_BUDGET_EXCEEDED' }), 'request_budget'],
    [new Error('Invalid CAP required fields'), 'invalid_cap'],
    [new Error('Inconsistent CAP info affected districts'), 'invalid_cap'],
    [new Error('Unsupported INCOIS catalog schema'), 'schema_invalid'],
    [new Error('SACHET CAP HTTP 403'), 'http_error'],
    [new Error('fetch failed', { cause: Object.assign(new Error('private'), { code: 'UNABLE_TO_VERIFY_LEAF_SIGNATURE' }) }), 'tls_error'],
    [new Error('https://private.invalid/?api-key=secret'), 'unavailable'],
    [null, 'unavailable'],
  ]) assert.equal(classifySourceError(error), expected)
})

test('source failure persists safe diagnostic codes and logs no raw errors', async t => {
  const messages = []
  t.mock.method(console, 'warn', message => messages.push(JSON.parse(message)))
  const state = await collectSnapshot(emptyState(), [{ id: 'sachet', collect: async () => { throw Object.assign(new Error('private-api-key=secret'), { code: 'SOURCE_BUDGET_EXCEEDED' }) } }], { now: NOW })
  assert.equal(state.sources.sachet.errorCode, 'request_budget')
  assert.equal(publicSnapshot(state, NOW).sources.sachet.errorCode, 'request_budget')
  assert.deepEqual(messages, [{ event: 'source_refresh_failed', source: 'sachet', code: 'request_budget' }])
  assert.doesNotMatch(JSON.stringify(state), /private-api-key|secret/)
  const recovered = await collectSnapshot(state, success([]), { now: NOW + 1000 })
  assert.equal(recovered.sources.sachet.errorCode, null)
})

test('startup is uninitialized, never false-green', async () => {
  const response = handleApi(new Request('http://localhost/api/health'), emptyState(), { now: NOW })
  assert.equal(response.status, 503)
  assert.equal((await response.json()).status, 'uninitialized')
  assert.equal(snapshotNeedsIngest(emptyState(), NOW), true)
  const fresh = await collectSnapshot(emptyState(), success([]), { now: NOW })
  assert.equal(snapshotNeedsIngest(fresh, NOW), false)
  assert.equal(snapshotNeedsIngest(fresh, NOW + STALE_MS + 1), true)

  const attempted = structuredClone(fresh)
  attempted.sources.sachet.lastSuccessAt = new Date(NOW).toISOString()
  attempted.sources.sachet.lastAttemptAt = new Date(NOW + STALE_MS).toISOString()
  attempted.sources.sachet.state = 'degraded'
  assert.equal(snapshotNeedsIngest(attempted, NOW + STALE_MS + 59_999), false)
  assert.equal(snapshotNeedsIngest(attempted, NOW + STALE_MS + 60_000), true)

  const disabled = {
    generatedAt: new Date(NOW - STALE_MS - 1).toISOString(),
    sources: Object.fromEntries(SOURCE_IDS.map(id => [id, {
      state: 'disabled',
      lastSuccessAt: null,
      lastAttemptAt: null,
    }])),
  }
  assert.equal(snapshotNeedsIngest(disabled, NOW), false)
})

test('per-source failures retain last good records and freshness ages without refresh', async () => {
  const previous = await collectSnapshot(emptyState(), success([alert('one')]), { now: NOW })
  const failed = await collectSnapshot(previous, SOURCE_IDS.map(id => ({ id, collect: async () => { throw Error('secret-api-key=do-not-leak') } })), { now: NOW + 1000 })
  const snapshot = publicSnapshot(failed, NOW + 1001)
  assert.equal(snapshot.alerts.length, 1)
  assert.equal(snapshot.sources.sachet.status, 'degraded')
  assert.equal(snapshot.sources.sachet.lastSuccessAt, new Date(NOW).toISOString())
  assert.doesNotMatch(JSON.stringify(snapshot), /secret-api-key/)
  assert.equal(publicSnapshot(failed, NOW + STALE_MS + 1).sources.sachet.status, 'stale')
  assert.equal(publicSnapshot(failed, NOW + 600_001).alerts.length, 0)
})

test('raw cancellation survives successful subsequent snapshots and replay', async () => {
  const original = alert('one')
  const cancelled = alert('cancel-one', { msgType: 'Cancel', sent: new Date(NOW).toISOString(), references: [{ sender: original.sender, identifier: original.id, sent: original.sent }] })
  let state = await collectSnapshot(emptyState(), success([original, cancelled]), { now: NOW })
  assert.equal(publicSnapshot(state, NOW).alerts.length, 0)
  state = await collectSnapshot(JSON.parse(JSON.stringify(state)), success([original]), { now: NOW + 1000 })
  assert.equal(state.sources.sachet.records.length, 2)
  assert.equal(publicSnapshot(state, NOW + 1000).alerts.length, 0)
})

test('bounded concurrency and Node overlap share one in-flight poll', async () => {
  let running = 0, peak = 0, calls = 0
  let unblock
  const gate = new Promise(resolve => { unblock = resolve })
  const collectors = SOURCE_IDS.map(id => ({ id, collect: async () => { calls++; running++; peak = Math.max(peak, running); await gate; running--; return [] } }))
  const relay = createRelay({ collectors })
  const first = relay.pollOnce()
  assert.equal(first, relay.pollOnce())
  unblock()
  await first
  assert.equal(calls, 5)
  assert.equal(peak, 3)
})

test('oversized successful response fails closed, retaining last good data', async () => {
  const previous = await collectSnapshot(emptyState(), success([alert('old')]), { now: NOW })
  const state = await collectSnapshot(previous, success([alert('huge', { description: 'x'.repeat(MAX_SOURCE_BYTES) })]), { now: NOW + 1000 })
  assert.equal(state.sources.sachet.state, 'degraded')
  assert.equal(publicSnapshot(state, NOW + 1000).alerts[0].id, 'old')
})

test('a replay cannot replace a newer retained lifecycle record', () => {
  const newer = alert('update', { msgType: 'Update', sent: new Date(NOW).toISOString() })
  const older = alert('update', { msgType: 'Update', sent: new Date(NOW - 1000).toISOString() })
  assert.deepEqual(retainLifecycle([newer], [older]), [newer])
})

test('disabled and misconfigured sources are not healthy empty feeds', async () => {
  const collectors = sourceCollectors({ cpcbEnabled: true })
  assert.equal(collectors.find(c => c.id === 'cpcb').state, 'misconfigured')
  const state = await collectSnapshot(emptyState(), [{ id: 'cwc', collect: async () => { throw Object.assign(Error('disabled'), { code: 'SOURCE_DISABLED' }) } }, { id: 'cpcb', state: 'disabled' }], { now: NOW })
  const snapshot = publicSnapshot(state, NOW)
  assert.equal(snapshot.sources.cwc.status, 'disabled')
  assert.equal(snapshot.sources.cpcb.ok, false)
})

test('pagination exposes all counted records and rejects invalid filters', async () => {
  const state = await collectSnapshot(emptyState(), success(Array.from({ length: 520 }, (_, i) => alert(String(i)))), { now: NOW })
  const first = await handleApi(new Request('http://localhost/api/v1/alerts?limit=500'), state, { now: NOW }).json()
  assert.equal(first.count, 520)
  assert.equal(first.alerts.length, 500)
  const last = await handleApi(new Request(`http://localhost/api/alerts?limit=500&offset=500&snapshot=${encodeURIComponent(first.pagination.snapshot)}`), state, { now: NOW }).json()
  assert.equal(last.alerts.length, 20)
  assert.equal(last.pagination.nextOffset, null)
  assert.equal(new Set([...first.alerts, ...last.alerts].map(a => a.id)).size, 520)
  for (const query of ['limit=NaN', 'limit=0', 'limit=501', 'limit=1.5', 'offset=-1', 'district=invalid', 'region=invalid', 'kind=invalid', 'source=invalid', 'class=invalid', 'limit=2&limit=3', 'unknown=1']) {
    assert.equal(handleApi(new Request(`http://localhost/api/alerts?${query}`), state).status, 400, query)
  }
  assert.equal(handleApi(new Request('http://localhost/api/alerts?snapshot=old'), state).status, 409)
  assert.equal(handleApi(new Request(`http://localhost/api/alerts?snapshot=${encodeURIComponent(first.pagination.snapshot)}`), state, { now: NOW + 600_001 }).status, 409)
})

test('public API is read-only, no refresh route, and errors carry security headers', async () => {
  const request = new Request('http://localhost/api/alerts', { method: 'POST' })
  const response = handleApi(request, emptyState())
  assert.equal(response.status, 405)
  assert.equal(response.headers.get('allow'), 'GET, HEAD')
  assert.equal(response.headers.get('x-content-type-options'), 'nosniff')
  assert.equal(response.headers.get('cache-control'), 'no-store')
  assert.equal(handleApi(new Request('http://localhost/api/refresh'), emptyState()).status, 404)
  assert.equal(handleApi(new Request('http://localhost/api/alerts/live'), emptyState()).status, 410)
  assert.equal(await handleApi(new Request('http://localhost/api/meta', { method: 'HEAD' }), emptyState()).text(), '')
})

test('Node runner binds ephemeral local listener and safely serves assets', async t => {
  const server = createRelayServer({ relay: createRelay({ collectors: [] }) })
  server.listen(0, '127.0.0.1')
  await once(server, 'listening')
  t.after(() => new Promise(resolve => server.close(resolve)))
  const base = `http://127.0.0.1:${server.address().port}`
  const response = await fetch(`${base}/`)
  assert.equal(response.status, 200)
  assert.equal(response.headers.get('x-frame-options'), 'DENY')
  assert.equal((await fetch(`${base}/api/health`)).status, 503)
  assert.equal((await fetch(`${base}/%2f..%2fpackage.json`)).status, 400)
  for (const invalid of ['NaN', '-1', '65536', '1.2']) assert.throws(() => boundedInteger(invalid, 8787, 1, 65535))
})
