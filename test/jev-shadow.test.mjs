import test from 'node:test'
import assert from 'node:assert/strict'
import { jevShadowEnabled, scoreAlertShadow, triageAlertShadow } from '../server/jev-shadow.mjs'

const alert = {
  id: 'a1',
  source: 'sachet',
  kind: 'rain',
  weaClass: 'WEATHER_ADVISORY',
  headlineEn: 'Heavy rainfall expected in parts of Pune district tonight.',
  headlineMr: 'पुणे जिल्ह्याच्या काही भागांत मुसळधार पाऊस अपेक्षित.',
}

test('jev shadow respects kill switch and default off', () => {
  assert.equal(jevShadowEnabled({ JEV_SHADOW_ENABLED: 'false' }), false)
  assert.equal(jevShadowEnabled({ JEV_SHADOW_ENABLED: 'true' }), true)
  assert.equal(jevShadowEnabled({ JEV_SHADOW_ENABLED: 'true', JEV_SHADOW_KILL: 'true' }), false)
})

test('mock shadow scoring never invents CAP fields', async () => {
  const result = await triageAlertShadow(alert, {})
  assert.equal(result.mode, 'shadow')
  assert.equal(result.alertKey, 'sachet:a1')
  assert.ok(result.clarity.en > result.clarity.mr || result.clarity.mr > 0)
  assert.equal(result.recommendation, 'human_review')
})

test('fixture scorer is deterministic', () => {
  const a = scoreAlertShadow(alert, { provider: 'mock' })
  const b = scoreAlertShadow(alert, { provider: 'mock' })
  assert.deepEqual(a, b)
})
