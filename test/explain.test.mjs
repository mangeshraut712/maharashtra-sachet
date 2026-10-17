import test from 'node:test'
import assert from 'node:assert/strict'
import { DEFAULT_GEMINI_MODEL, explainAlert, fallbackExplanation, statedSeverity } from '../server/explain.mjs'

test('severity badge only reflects a stated level', () => {
  assert.equal(statedSeverity('ALERT LEVEL: RED WARNING'), 'Red')
  assert.equal(statedSeverity('Orange alert for Nagpur'), 'Orange')
  assert.equal(statedSeverity('Severe thunderstorm likely in Pune'), 'Not stated')
})

test('fallback explains with three steps in three languages', () => {
  const d = fallbackExplanation('Heavy rain likely in Ratnagiri and Raigad')
  assert.deepEqual(d.districts, ['Raigad', 'Ratnagiri'])
  for (const k of ['english', 'marathi', 'hindi']) assert.equal(d[k].safetySteps.length, 3)
})

test('missing key uses offline fallback; invalid input rejected', async () => {
  assert.equal((await explainAlert({ alertText: '' }, {})).status, 400)
  assert.equal((await explainAlert({ alertText: 'x'.repeat(7000) }, {})).status, 413)
  const r = await explainAlert({ alertText: 'Yellow alert Pune' }, {})
  assert.equal(r.body.source, 'offline-fallback')
  assert.equal(r.body.data.severity, 'Yellow')
})

test('Gemini call uses server key, configurable model, and falls back on error', async () => {
  let seen
  const ok = async (url, init) => {
    seen = { url, key: init.headers['x-goog-api-key'] }
    const block = { summary: 'a\nb', districtImpact: 'c', safetySteps: ['1', '2', '3', '4'] }
    const data = { severity: 'Red', hazardType: 'Rain', districts: ['Pune'], validity: 'Not stated', english: block, marathi: block, hindi: block }
    return new Response(JSON.stringify({ candidates: [{ content: { parts: [{ text: JSON.stringify(data) }] } }] }))
  }
  const r = await explainAlert({ alertText: 'Rain in Pune', apiKey: 'caller-key' }, { GEMINI_API_KEY: 'server-key' }, ok)
  assert.equal(r.body.source, 'gemini')
  assert.equal(seen.key, 'server-key')
  assert.match(seen.url, new RegExp(DEFAULT_GEMINI_MODEL))
  assert.equal(r.body.data.severity, 'Not stated')
  assert.equal(r.body.data.english.safetySteps.length, 3)
  const m = await explainAlert({ alertText: 'Rain' }, { GEMINI_API_KEY: 'k', GEMINI_MODEL: 'custom-model' }, ok)
  assert.equal(m.body.model, 'custom-model')
  const bad = await explainAlert({ alertText: 'Rain' }, { GEMINI_API_KEY: 'k' }, async () => new Response('no', { status: 403 }))
  assert.equal(bad.body.source, 'offline-fallback')
})
