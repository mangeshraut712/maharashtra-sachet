import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import test from 'node:test'
import { parseCapAlert } from '../server/sachet.mjs'
import { classifyWea, situationKind, weaRank } from '../server/wea.mjs'
import { DISTRICT_BY_LGD, matchDistricts } from '../server/districts.mjs'
import { mergeAlerts, snapshotStats } from '../server/merge.mjs'
import { isMaharashtraOceanThreat } from '../server/incois.mjs'

const fixture = readFileSync(join(dirname(fileURLToPath(import.meta.url)), 'fixtures/cap-maharashtra-nowcast.xml'), 'utf8')

test('LGD 497 is Thane, not a synthetic 517b code', () => {
  assert.equal(DISTRICT_BY_LGD.get('497')?.id, 'thane')
  assert.equal(DISTRICT_BY_LGD.get('517')?.id, 'thane')
  assert.equal(DISTRICT_BY_LGD.get('490')?.id, 'pune')
  assert.equal(DISTRICT_BY_LGD.get('521')?.id, 'pune')
  assert.equal(DISTRICT_BY_LGD.has('517b'), false)
})

test('matchDistricts finds renamed and alias names', () => {
  const hits = matchDistricts('Aurangabad and Ahmednagar thunderstorm')
  assert.deepEqual(
    hits.map((d) => d.id).sort(),
    ['ahilyanagar', 'chhatrapati-sambhajinagar'],
  )
})

test('parseCapAlert maps LGD geocodes and bilingual copy', () => {
  const alert = parseCapAlert(fixture, { link: 'https://sachet.ndma.gov.in/cap_public_website/FetchXMLFile?identifier=1788442682082029' })
  assert.equal(alert.id, '1788442682082029')
  assert.equal(alert.sender, 'Maharashtra-SDMA')
  assert.equal(alert.weaClass, 'WEATHER_ADVISORY')
  assert.equal(alert.kind, 'lightning')
  assert.deepEqual(
    alert.districts.map((d) => d.id).sort(),
    ['pune', 'thane'],
  )
  assert.match(alert.headlineMr, /पुणे/)
})

test('WEA classes: weather stays advisory; severe immediate is imminent; rescue is AMBER', () => {
  assert.equal(
    classifyWea({ status: 'Actual', category: 'Met', severity: 'Moderate', urgency: 'Expected', event: 'Light rain' }),
    'WEATHER_ADVISORY',
  )
  assert.equal(
    classifyWea({ status: 'Actual', category: 'Met', severity: 'Severe', urgency: 'Immediate', event: 'Cyclone' }),
    'IMMINENT_THREAT',
  )
  assert.equal(
    classifyWea({ status: 'Actual', category: 'Rescue', severity: 'Moderate', urgency: 'Immediate', event: 'Missing child' }),
    'AMBER',
  )
  assert.equal(
    classifyWea({ status: 'Actual', category: 'CBRNE', severity: 'Severe', urgency: 'Immediate', event: 'MIDC gas leak' }),
    'IMMINENT_THREAT',
  )
  assert.equal(
    classifyWea({ status: 'Test', category: 'Met', severity: 'Minor', urgency: 'Unknown', event: 'Test message' }),
    'TEST',
  )
  assert.ok(weaRank('PRESIDENTIAL') > weaRank('IMMINENT_THREAT'))
  assert.equal(situationKind({ event: 'Heat wave over Vidarbha', headlineEn: '' }), 'heat')
})

test('INCOIS ignores Indonesia / Pacific quakes; keeps Makran–Arabian Sea sources', () => {
  assert.equal(
    isMaharashtraOceanThreat({ MAGNITUDE: 7.6, REGIONNAME: 'Flores Region, Indonesia', LATITUDE: -8.32, LONGITUDE: 121.64 }),
    false,
  )
  assert.equal(
    isMaharashtraOceanThreat({ MAGNITUDE: 7.0, REGIONNAME: 'Northern Sumatra, Indonesia', LATITUDE: 3.05, LONGITUDE: 98.97 }),
    false,
  )
  assert.equal(
    isMaharashtraOceanThreat({ MAGNITUDE: 7.8, REGIONNAME: 'Makran Coast, Pakistan', LATITUDE: 24.8, LONGITUDE: 62.2 }),
    true,
  )
  assert.equal(
    isMaharashtraOceanThreat({ MAGNITUDE: 6.9, REGIONNAME: 'Arabian Sea', LATITUDE: 18.1, LONGITUDE: 68.4 }),
    true,
  )
})

test('mergeAlerts de-duplicates and ranks Imminent above advisory', () => {
  const merged = mergeAlerts([
    [
      { id: 'a', weaClass: 'WEATHER_ADVISORY', severity: 'Moderate', urgency: 'Expected', sent: '2026-09-04T10:00:00+05:30' },
      { id: 'a', weaClass: 'WEATHER_ADVISORY', severity: 'Moderate', urgency: 'Expected', sent: '2026-09-04T10:00:00+05:30' },
    ],
    [{ id: 'b', weaClass: 'IMMINENT_THREAT', severity: 'Severe', urgency: 'Immediate', sent: '2026-09-04T09:00:00+05:30' }],
  ])
  assert.equal(merged.length, 2)
  assert.equal(merged[0].id, 'b')
  const stats = snapshotStats([
    { weaClass: 'IMMINENT_THREAT', kind: 'flood', districts: [{ id: 'pune' }] },
    { weaClass: 'WEATHER_ADVISORY', kind: 'rain', districts: [{ id: 'pune' }, { id: 'thane' }] },
  ])
  assert.equal(stats.total, 2)
  assert.equal(stats.districtsCovered, 2)
})
