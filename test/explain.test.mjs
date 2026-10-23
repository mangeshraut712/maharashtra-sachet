import test from 'node:test'
import assert from 'node:assert/strict'
import { once } from 'node:events'
import { createRelay, createRelayServer } from '../server/index.mjs'
import { createDemoServer } from '../demo/server.mjs'
import {
  DEFAULT_GEMINI_MODEL,
  EXPLAIN_GLOBAL_LIMIT,
  MAX_EXPLAIN_BODY_BYTES,
  MAX_GEMINI_RESPONSE_BYTES,
  OFFLINE_UNAVAILABLE_NOTE,
  OFFLINE_UNCONFIGURED_NOTE,
  createExplainLimiter,
  explainAlert,
  fallbackExplanation,
  handleExplainRequest,
  statedSeverity,
} from '../server/explain.mjs'

const allowAll = () => ({ ok: true })

function geminiPayload(severity = 'Red') {
  const block = { summary: 'a\nb', districtImpact: 'c', safetySteps: ['1', '2', '3', '4'] }
  return { severity, hazardType: 'Rain', districts: ['Pune'], validity: 'Not stated', english: block, marathi: block, hindi: block }
}

function geminiResponse(data = geminiPayload()) {
  return new Response(JSON.stringify({ candidates: [{ content: { parts: [{ text: JSON.stringify(data) }] } }] }))
}

function explainRequest(body, { url = 'https://alerts.example/api/explain', headers = {}, method = 'POST' } = {}) {
  return new Request(url, {
    method,
    headers: { 'content-type': 'application/json', ...headers },
    body: method === 'GET' || method === 'HEAD' ? undefined : body,
  })
}

async function postExplain(body, env = {}, options = {}) {
  const request = explainRequest(typeof body === 'string' ? body : JSON.stringify(body), options)
  return handleExplainRequest(request, env, { limiter: allowAll, clientKey: 'unit', ...options.handle })
}

test('severity badge only reflects a stated level', () => {
  assert.equal(statedSeverity('ALERT LEVEL: RED WARNING'), 'Red')
  assert.equal(statedSeverity('Orange alert for Nagpur'), 'Orange')
  assert.equal(statedSeverity('Severe thunderstorm likely in Pune'), 'Not stated')
})

test('fallback explains with three steps in three languages', () => {
  const data = fallbackExplanation('Heavy rain likely in Ratnagiri and Raigad')
  assert.deepEqual(data.districts, ['Raigad', 'Ratnagiri'])
  for (const key of ['english', 'marathi', 'hindi']) assert.equal(data[key].safetySteps.length, 3)
})

test('missing key uses offline fallback; invalid input rejected', async () => {
  assert.equal((await explainAlert({ alertText: '' }, {})).status, 400)
  assert.equal((await explainAlert({ alertText: 12 }, {})).status, 400)
  assert.equal((await explainAlert(['Yellow alert'], {})).status, 400)
  assert.equal((await explainAlert(null, {})).status, 400)
  assert.equal((await explainAlert({ alertText: 'x'.repeat(7000) }, {})).status, 413)
  let calls = 0
  const blankKey = await explainAlert({ alertText: 'Yellow alert Pune' }, { GEMINI_API_KEY: '   ' }, async () => { calls += 1; return geminiResponse() })
  assert.equal(calls, 0)
  assert.equal(blankKey.status, 200)
  assert.equal(blankKey.body.source, 'offline-fallback')
  assert.equal(blankKey.body.note, OFFLINE_UNCONFIGURED_NOTE)
  assert.equal(blankKey.body.data.severity, 'Yellow')
  const missing = await explainAlert({ alertText: 'Yellow alert Pune' }, {})
  assert.equal(missing.body.note, OFFLINE_UNCONFIGURED_NOTE)
})

test('Gemini call uses server key, configurable model, and falls back on error', async () => {
  let seen
  const ok = async (url, init) => {
    seen = { url, key: init.headers['x-goog-api-key'] }
    return geminiResponse()
  }
  const result = await explainAlert({ alertText: 'Rain in Pune', apiKey: 'caller-key' }, { GEMINI_API_KEY: 'server-key' }, ok)
  assert.equal(result.body.source, 'gemini')
  assert.equal(seen.key, 'server-key')
  assert.match(seen.url, new RegExp(DEFAULT_GEMINI_MODEL))
  assert.doesNotMatch(seen.url, /server-key|caller-key/)
  assert.equal(result.body.data.severity, 'Not stated')
  assert.equal(result.body.data.english.safetySteps.length, 3)
  const configured = await explainAlert({ alertText: 'Rain' }, { GEMINI_API_KEY: 'k', GEMINI_MODEL: 'custom-model' }, ok)
  assert.equal(configured.body.model, 'custom-model')
  const denied = await explainAlert({ alertText: 'Rain' }, { GEMINI_API_KEY: 'k' }, async () => new Response('no', { status: 403 }))
  assert.equal(denied.body.source, 'offline-fallback')
  assert.equal(denied.body.note, OFFLINE_UNAVAILABLE_NOTE)
  assert.doesNotMatch(JSON.stringify(denied.body), /server-key|caller-key/)
})

test('Gemini network, shape, timeout, and oversized responses fall back without leaking secrets', async () => {
  const logs = []
  const original = console.error
  console.error = (...args) => { logs.push(args.map(String).join(' ')) }
  try {
    const cases = [
      async () => { throw new Error('super-secret-key leaked SECRET-ALERT-TEXT') },
      async () => new Response('not-json', { status: 200 }),
      async () => geminiResponse({ severity: 'Red' }),
      async () => { throw Object.assign(new Error('The operation was aborted'), { name: 'TimeoutError' }) },
      async () => new Response('x'.repeat(MAX_GEMINI_RESPONSE_BYTES + 1), { status: 200 }),
      async () => new Response('upstream', { status: 500 }),
    ]
    for (const fetchImpl of cases) {
      const result = await explainAlert({ alertText: 'SECRET-ALERT-TEXT' }, { GEMINI_API_KEY: 'super-secret-key' }, fetchImpl)
      assert.equal(result.status, 200)
      assert.equal(result.body.source, 'offline-fallback')
      assert.equal(result.body.note, OFFLINE_UNAVAILABLE_NOTE)
      assert.equal(result.body.data.hazardType, 'Public alert')
    }
    let invalidModelCalls = 0
    const invalidModel = await explainAlert({ alertText: 'SECRET-ALERT-TEXT' }, { GEMINI_API_KEY: 'super-secret-key', GEMINI_MODEL: '../other' }, async () => { invalidModelCalls += 1; throw new Error('should not fetch') })
    assert.equal(invalidModelCalls, 0)
    assert.equal(invalidModel.body.source, 'offline-fallback')
    assert.equal(invalidModel.body.note, OFFLINE_UNAVAILABLE_NOTE)
  } finally {
    console.error = original
  }
  assert.ok(logs.length >= 6)
  const logged = logs.join('\n')
  assert.match(logged, /timeout/)
  assert.match(logged, /model_invalid/)
  assert.match(logged, /Gemini HTTP 500/)
  assert.doesNotMatch(logged, /SECRET-ALERT-TEXT/)
  assert.doesNotMatch(logged, /super-secret-key/)
})

test('POST /api/explain rejects bad input before calling Gemini', async () => {
  let calls = 0
  const fetchImpl = async () => { calls += 1; return geminiResponse() }
  const handle = { fetchImpl, limiter: allowAll, clientKey: 'validate' }
  assert.equal((await handleExplainRequest(explainRequest(undefined, { method: 'GET' }), {}, handle)).status, 405)
  assert.equal((await handleExplainRequest(explainRequest('{}', { method: 'PUT' }), {}, handle)).status, 405)
  const wrongType = await handleExplainRequest(explainRequest('{}', { headers: { 'content-type': 'text/plain' } }), {}, handle)
  assert.equal(wrongType.status, 415)
  const crossOrigin = await postExplain({ alertText: 'Rain' }, {}, { headers: { origin: 'https://evil.example' }, handle })
  assert.equal(crossOrigin.status, 403)
  assert.equal((await postExplain('{"alertText":', {}, { handle })).status, 400)
  assert.equal((await postExplain(['Rain'], {}, { handle })).status, 400)
  assert.equal((await postExplain({ alertText: 4 }, {}, { handle })).status, 400)
  assert.equal((await postExplain({ alertText: '   ' }, {}, { handle })).status, 400)
  assert.equal((await postExplain({ alertText: 'x'.repeat(6001) }, {}, { handle })).status, 413)
  const tooLarge = await postExplain({ alertText: 'x'.repeat(MAX_EXPLAIN_BODY_BYTES) }, {}, { handle })
  assert.equal(tooLarge.status, 413)
  assert.equal((await tooLarge.json()).error, 'Request too large')
  assert.equal(calls, 0)
  const charset = await postExplain({ alertText: 'Yellow alert Pune' }, {}, { headers: { 'content-type': 'application/json; charset=utf-8' }, handle })
  assert.equal(charset.status, 200)
  assert.equal((await charset.json()).data.severity, 'Yellow')
})

test('declared Content-Length above the cap does not read the body', async () => {
  let pulled = 0
  const stream = new ReadableStream({
    pull(controller) {
      pulled += 1
      controller.enqueue(new Uint8Array(1000))
    },
  })
  const request = new Request('https://alerts.example/api/explain', {
    method: 'POST',
    headers: { 'content-type': 'application/json', 'content-length': String(MAX_EXPLAIN_BODY_BYTES + 1) },
    body: stream,
    duplex: 'half',
  })
  const response = await handleExplainRequest(request, { GEMINI_API_KEY: 'server-key' }, { limiter: allowAll, clientKey: 'cap' })
  assert.equal(response.status, 413)
  assert.equal(pulled, 0)
})

test('a body stream larger than the cap is rejected', async () => {
  let pulled = 0
  const stream = new ReadableStream({
    pull(controller) {
      pulled += 1
      if (pulled > 5) controller.error(new Error('read past cap'))
      else controller.enqueue(new Uint8Array(10_000))
    },
  })
  const request = new Request('https://alerts.example/api/explain', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: stream,
    duplex: 'half',
  })
  const response = await handleExplainRequest(request, {}, { limiter: allowAll, clientKey: 'stream' })
  assert.equal(response.status, 413)
  assert.ok(pulled < 5)
})

test('explain rate limit is per client and expires', () => {
  let now = 1_000_000
  const limiter = createExplainLimiter({ perClient: 1, globalLimit: EXPLAIN_GLOBAL_LIMIT, now: () => now })
  assert.equal(limiter('a').ok, true)
  assert.equal(limiter('a').ok, false)
  assert.equal(limiter('b').ok, true)
  now += 60_000
  assert.equal(limiter('a').ok, true)
  const globalLimiter = createExplainLimiter({ perClient: 10, globalLimit: 2, now: () => 5 })
  assert.equal(globalLimiter('a').ok, true)
  assert.equal(globalLimiter('b').ok, true)
  const blocked = globalLimiter('c')
  assert.equal(blocked.ok, false)
  assert.equal(blocked.retryAfterSeconds, 60)
})

test('HTTP handler rate-limits before Gemini and falls back when Gemini fails', async () => {
  let calls = 0
  const limiter = createExplainLimiter({ perClient: 1, globalLimit: 10, now: () => 50 })
  const handle = {
    limiter,
    clientKey: 'http',
    fetchImpl: async () => { calls += 1; return new Response('no', { status: 503 }) },
  }
  const first = await postExplain({ alertText: 'Rain in Pune', apiKey: 'caller-key' }, { GEMINI_API_KEY: 'server-key' }, { handle })
  assert.equal(first.status, 200)
  const firstBody = await first.json()
  assert.equal(firstBody.source, 'offline-fallback')
  assert.equal(firstBody.note, OFFLINE_UNAVAILABLE_NOTE)
  const second = await postExplain({ alertText: 'Rain in Pune' }, { GEMINI_API_KEY: 'server-key' }, { handle })
  assert.equal(second.status, 429)
  assert.equal(second.headers.get('retry-after'), '60')
  assert.equal(second.headers.get('x-content-type-options'), 'nosniff')
  assert.equal(calls, 1)
  const otherClient = await postExplain({ alertText: 'Orange alert Nagpur' }, { GEMINI_API_KEY: 'server-key' }, { handle: { ...handle, clientKey: 'other' } })
  assert.equal(otherClient.status, 200)
})

async function listen(server) {
  server.listen(0, '127.0.0.1')
  await once(server, 'listening')
  return `http://127.0.0.1:${server.address().port}`
}

test('local and demo servers explain offline and surface Gemini failures', async t => {
  const limiter = createExplainLimiter({ perClient: 2, globalLimit: 10, now: () => 10 })
  const local = createRelayServer({ relay: createRelay({ collectors: [] }), explainLimiter: limiter })
  const localBase = await listen(local)
  t.after(() => new Promise(resolve => local.close(resolve)))
  const ok = await fetch(`${localBase}/api/explain`, {
    method: 'POST',
    headers: { 'content-type': 'application/json', origin: localBase },
    body: JSON.stringify({ alertText: 'Yellow alert Pune' }),
  })
  assert.equal(ok.status, 200)
  const okBody = await ok.json()
  assert.equal(okBody.source, 'offline-fallback')
  assert.equal(okBody.note, OFFLINE_UNCONFIGURED_NOTE)
  assert.equal(okBody.data.severity, 'Yellow')
  assert.equal(ok.headers.get('strict-transport-security'), null)
  const denied = await fetch(`${localBase}/api/explain`, { method: 'GET' })
  assert.equal(denied.status, 405)
  assert.equal(denied.headers.get('allow'), 'POST')
  const again = await fetch(`${localBase}/api/explain`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ alertText: 'Rain' }),
  })
  assert.equal(again.status, 200)
  const limited = await fetch(`${localBase}/api/explain`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ alertText: 'Rain' }),
  })
  assert.equal(limited.status, 429)

  let seenKey
  const failing = createRelayServer({
    relay: createRelay({ collectors: [] }),
    geminiEnv: { GEMINI_API_KEY: 'server-key', GEMINI_MODEL: 'gemini-3.8-flash' },
    explainFetch: async (url, init) => {
      seenKey = init.headers['x-goog-api-key']
      assert.doesNotMatch(String(url), /server-key|caller-key/)
      return new Response('no', { status: 502 })
    },
    explainLimiter: createExplainLimiter({ perClient: 5, globalLimit: 10 }),
  })
  const failBase = await listen(failing)
  t.after(() => new Promise(resolve => failing.close(resolve)))
  const failed = await fetch(`${failBase}/api/explain`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ alertText: 'Heavy rain in Pune', apiKey: 'caller-key' }),
  })
  assert.equal(failed.status, 200)
  const failedBody = await failed.json()
  assert.equal(seenKey, 'server-key')
  assert.equal(failedBody.source, 'offline-fallback')
  assert.equal(failedBody.note, OFFLINE_UNAVAILABLE_NOTE)
  assert.equal(failedBody.data.hazardType, 'Heavy rain / flood')
  assert.doesNotMatch(JSON.stringify(failedBody), /server-key|caller-key/)

  const demo = createDemoServer()
  const demoBase = await listen(demo)
  t.after(() => new Promise(resolve => demo.close(resolve)))
  const demoResponse = await fetch(`${demoBase}/api/explain`, {
    method: 'POST',
    headers: { 'content-type': 'application/json', origin: demoBase },
    body: JSON.stringify({ alertText: 'Orange alert Nagpur heat' }),
  })
  assert.equal(demoResponse.status, 200)
  const demoBody = await demoResponse.json()
  assert.equal(demoBody.source, 'offline-fallback')
  assert.equal(demoBody.data.severity, 'Orange')
  assert.equal(demoBody.data.hazardType, 'Heatwave')
})
