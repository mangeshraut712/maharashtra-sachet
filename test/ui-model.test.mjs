import test from 'node:test'
import assert from 'node:assert/strict'
import {
  safeOfficialUrl,
  sourceStatus,
  isCurrent,
  matchingAlerts,
  alertContent,
  snapshotFresh,
  alertKey,
  validSnapshot,
  validMeta,
} from '../web/ui-model.js'

test('official links reject executable URLs, deceptive hosts, credentials and non-HTTPS', () => {
  for (const url of [
    'javascript:alert(1)',
    'data:text/html,hello',
    'http://sachet.ndma.gov.in/',
    'https://sachet.ndma.gov.in.evil.example/',
    'https://sachet.ndma.gov.in@evil.example/',
    'https://user:pass@sachet.ndma.gov.in/',
    'https://sachet.ndma.gov.in:8443/',
    '/relative',
  ])
    assert.equal(safeOfficialUrl(url), null, url)
  assert.equal(
    safeOfficialUrl('https://sachet.ndma.gov.in/'),
    'https://sachet.ndma.gov.in/',
  )
  assert.equal(
    safeOfficialUrl('https://www.mahadiscom.in/en/'),
    'https://www.mahadiscom.in/en/',
  )
})
test('source failures and skipped sources cannot appear healthy', () => {
  assert.equal(sourceStatus({ ok: true, skipped: true }), 'disabled')
  assert.equal(sourceStatus({ ok: true, status: 'stale' }), 'degraded')
  assert.equal(sourceStatus({ ok: false }), 'degraded')
  assert.equal(sourceStatus({}), 'unknown')
})
test('Marathi preference preserves declared language and labels Hindi fallback', () => {
  const alert = {
    languages: [
      { language: 'en-IN', headline: 'Flood', instruction: 'Stay away.' },
      { language: 'hi-IN', headline: 'बाढ़', instruction: 'दूर रहें।' },
    ],
  }
  assert.deepEqual(alertContent(alert, 'mr'), {
    headline: 'बाढ़',
    instruction: 'दूर रहें।',
    description: '',
    language: 'hi-IN',
    fallback: true,
  })
  alert.languages.push({
    language: 'mr-IN',
    headline: 'पूर',
    instruction: 'दूर राहा.',
  })
  assert.equal(alertContent(alert, 'mr').language, 'mr-IN')
  assert.equal(alertContent(alert, 'mr').fallback, false)
  assert.equal(
    alertContent(
      {
        headlineEn: 'Flood',
        headlineMr: 'बाढ़',
        description: 'English official description',
      },
      'mr',
    ).language,
    'en',
  )
})
test('offline snapshots hide expired alerts at the current clock time and compose district filters', () => {
  const now = Date.parse('2026-09-05T12:00:00Z')
  const alerts = [
    {
      id: 'active',
      source: 'sachet',
      districts: [{ id: 'pune' }],
      kind: 'rain',
      expires: '2026-09-05T13:00:00Z',
    },
    {
      id: 'expired',
      districts: [{ id: 'pune' }],
      expires: '2026-09-05T11:00:00Z',
    },
    {
      id: 'other-district',
      districts: [{ id: 'nagpur' }],
      kind: 'rain',
      expires: '2026-09-05T13:00:00Z',
    },
  ]
  assert.deepEqual(
    matchingAlerts(alerts, { district: 'pune', kind: 'rain' }, [], now).map(
      (a) => a.id,
    ),
    ['active'],
  )
  assert.deepEqual(
    matchingAlerts(
      alerts,
      { district: 'pune', region: 'vidarbha' },
      [{ id: 'vidarbha', districtIds: ['nagpur'] }],
      now,
    ),
    [],
  )
  assert.equal(isCurrent({ expires: '2026-09-05T12:00:00Z' }, now), false)
  assert.equal(isCurrent({ msgType: 'Cancel' }, now), false)
  assert.equal(isCurrent({ recordType: 'observation' }, now), false)
  assert.notEqual(
    alertKey({ source: 'sachet', id: '1' }),
    alertKey({ source: 'imd', id: '1' }),
  )
})
test('freshness is based on the saved timestamp and rejects unknown or future dates', () => {
  const now = Date.parse('2026-09-05T12:00:00Z')
  assert.equal(snapshotFresh('2026-09-05T11:56:00Z', now), true)
  assert.equal(snapshotFresh('2026-09-05T11:55:00Z', now), false)
  assert.equal(snapshotFresh('2026-09-06T12:00:00Z', now), false)
  assert.equal(snapshotFresh(null, now), false)
})

test('malformed stored snapshots and metadata are rejected before state assignment', () => {
  for (const body of [
    null,
    {},
    { alerts: [null] },
    { alerts: [{ id: 'x', source: 'sachet', districts: 'bad' }] },
    { alerts: [], sources: { sachet: null } },
    { alerts: [], generatedAt: 123 },
  ])
    assert.equal(validSnapshot(body), false)
  assert.equal(
    validSnapshot({ alerts: [], sources: { sachet: { status: 'healthy' } } }),
    true,
  )
  assert.equal(validMeta({ districts: [null] }), false)
  assert.equal(
    validMeta({
      districts: [{ id: 'pune' }],
      regions: [{ id: 'konkan', districtIds: 'bad' }],
    }),
    false,
  )
  assert.equal(validMeta({ districts: [{ id: 'pune' }] }), true)
  assert.equal(
    alertContent(
      {
        languages: [null, { language: 'mr', description: 'मराठी निर्देश' }],
        headlineEn: 'Different English title',
      },
      'mr',
    ).headline,
    '',
  )
})
