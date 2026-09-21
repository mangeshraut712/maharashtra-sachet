import test from 'node:test'
import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import {
  jevShadowEnabled,
  scoreAlertShadow,
  triageAlertShadow,
  triageViaGateway,
  parseSystemOneResponse,
  buildSystemOneRequest,
  resolveJevApiKey,
  systemOneUrl,
  composeOpsRecommendation,
  capShadowState,
} from '../server/jev-shadow.mjs'

const alert = {
  id: 'a1',
  source: 'sachet',
  kind: 'rain',
  weaClass: 'WEATHER_ADVISORY',
  headlineEn: 'Heavy rainfall expected in parts of Pune district tonight. Avoid waterlogged roads.',
  descriptionEn: 'IMD nowcast. Stay away from low-lying areas.',
  headlineMr: 'पुणे जिल्ह्याच्या काही भागांत मुसळधार पाऊस अपेक्षित.',
  descriptionMr: 'पाणी साचलेल्या रस्त्यांपासून दूर राहा.',
  districts: [{ id: 'pune', en: 'Pune' }],
}

test('jev shadow respects kill switch and default off', () => {
  assert.equal(jevShadowEnabled({}), false)
  assert.equal(jevShadowEnabled({ JEV_SHADOW_ENABLED: 'false' }), false)
  assert.equal(jevShadowEnabled({ JEV_SHADOW_ENABLED: 'true' }), true)
  assert.equal(jevShadowEnabled({ JEV_SHADOW_ENABLED: 'true', JEV_SHADOW_KILL: 'true' }), false)
})

test('API key prefers JEV_API_KEY then cursor secret binding', () => {
  assert.equal(resolveJevApiKey({}), '')
  assert.equal(resolveJevApiKey({ cursor: 'from-cursor' }), 'from-cursor')
  assert.equal(resolveJevApiKey({ JEV_API_KEY: 'from-jev', cursor: 'from-cursor' }), 'from-jev')
})

test('System One URL never appends /score', () => {
  assert.equal(systemOneUrl({}), 'https://api.typesafe.ai/v1/systemone')
  assert.equal(systemOneUrl({ JEV_GATEWAY_URL: 'https://api.typesafe.ai/v1' }), 'https://api.typesafe.ai/v1/systemone')
  assert.equal(systemOneUrl({ JEV_GATEWAY_URL: 'https://api.typesafe.ai/v1/score' }), 'https://api.typesafe.ai/v1/systemone')
})

test('shadow state is only existing CAP fields', () => {
  const state = capShadowState(alert)
  assert.deepEqual(Object.keys(state).sort(), [
    'descriptionEn',
    'descriptionMr',
    'districts',
    'headlineEn',
    'headlineMr',
    'id',
    'kind',
    'source',
    'weaClass',
  ])
})

test('mock path is used unless JEV_USE_LIVE is true', async () => {
  const result = await triageAlertShadow(alert, {})
  assert.equal(result.provider, 'mock-fixture')
  assert.equal(result.mode, 'shadow')
  assert.equal(result.alertKey, 'sachet:a1')
  assert.equal(result.hazardFamily, 'flood')
  assert.equal(['unclear', 'usable', 'clear action'].includes(result.clarity.en), true)
  assert.ok(['log_only', 'surface_ops_badge', 'human_review'].includes(result.recommendation))
  assert.equal(result.note.includes('does not change relayed CAP text'), true)
})

test('fixture scorer is deterministic', () => {
  const a = scoreAlertShadow(alert, { provider: 'mock' })
  const b = scoreAlertShadow(alert, { provider: 'mock' })
  assert.deepEqual(a, b)
})

test('parses a high-confidence log_only System One fixture', async () => {
  const body = JSON.parse(await readFile(new URL('./fixtures/jev-systemone-log-only.json', import.meta.url), 'utf8'))
  const parsed = parseSystemOneResponse(body, alert)
  assert.equal(parsed.hazardFamily, 'flood')
  assert.equal(parsed.hazardMismatch, false)
  assert.equal(parsed.clarity.en, 'clear action')
  assert.equal(parsed.clarity.mr, 'usable')
  assert.equal(parsed.modelRecommendation, 'log_only')
  assert.equal(parsed.recommendation, 'log_only')
})

test('escalation or low confidence composes to human_review', async () => {
  const body = JSON.parse(await readFile(new URL('./fixtures/jev-systemone-escalate.json', import.meta.url), 'utf8'))
  const parsed = parseSystemOneResponse(body, alert)
  assert.equal(parsed.modelRecommendation, 'escalate_human')
  assert.equal(parsed.recommendation, 'human_review')
  assert.equal(parsed.hazardMismatch, true)
  const low = composeOpsRecommendation({
    recommendation: { type: 'choice', choice: 'log_only', confidence: 0.4 },
    bilingual_gap: { type: 'noul', noul: 0.2 },
  })
  assert.equal(low.recommendation, 'human_review')
})

test('kind vs hazard_family mismatch is flagged even when the model says log_only', async () => {
  const body = JSON.parse(await readFile(new URL('./fixtures/jev-systemone-kind-mismatch.json', import.meta.url), 'utf8'))
  const parsed = parseSystemOneResponse(body, { ...alert, kind: 'rain' })
  assert.equal(parsed.hazardFamily, 'heat')
  assert.equal(parsed.relayedFamily, 'flood')
  assert.equal(parsed.hazardMismatch, true)
  assert.equal(parsed.recommendation, 'human_review')
})

test('live path POSTs System One with jev-latest and Bearer key from cursor', async () => {
  const fixture = JSON.parse(await readFile(new URL('./fixtures/jev-systemone-log-only.json', import.meta.url), 'utf8'))
  const calls = []
  const fetchImpl = async (url, options) => {
    calls.push({ url, options })
    return {
      ok: true,
      status: 200,
      json: async () => fixture,
    }
  }
  const live = await triageViaGateway(alert, { cursor: 'secret-cursor-key' }, fetchImpl)
  assert.equal(calls.length, 1)
  assert.equal(calls[0].url, 'https://api.typesafe.ai/v1/systemone')
  assert.equal(calls[0].options.headers.authorization, 'Bearer secret-cursor-key')
  const body = JSON.parse(calls[0].options.body)
  assert.equal(body.model, 'jev-latest')
  assert.deepEqual(Object.keys(body.questions).sort(), [
    'bilingual_gap',
    'citizen_urgency_clarity_en',
    'citizen_urgency_clarity_mr',
    'hazard_family',
    'needs_human_ops_review',
    'recommendation',
  ])
  assert.equal(body.questions.hazard_family.type, 'choice')
  assert.equal(body.questions.citizen_urgency_clarity_en.type, 'score')
  assert.equal(body.questions.bilingual_gap.type, 'noul')
  assert.equal(live.provider, 'jev-systemone')
  const request = buildSystemOneRequest(alert)
  assert.equal(request.state.id, 'a1')
})

test('JEV_USE_LIVE without a key stays on the mock fixture path', async () => {
  const result = await triageAlertShadow(alert, { JEV_USE_LIVE: 'true' }, async () => {
    throw new Error('must not call network')
  })
  assert.equal(result.provider, 'mock-fixture')
})

test('never recommends public notification channels', () => {
  const composed = composeOpsRecommendation({
    recommendation: { type: 'choice', choice: 'send_sms', confidence: 0.99 },
  })
  assert.equal(composed.recommendation, 'human_review')
})
