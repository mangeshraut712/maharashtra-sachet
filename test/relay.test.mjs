import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import test from 'node:test'
import { parseCapAlert } from '../server/sachet.mjs'
import { classifyWea, situationKind, weaRank, SITUATION_KINDS } from '../server/wea.mjs'
import {
  DISTRICT_BY_LGD,
  DISTRICTS,
  EXPECTED_DIVISION_COUNTS,
  GOA_LGD,
  REGIONS,
  matchDistricts,
  matchImdDistrictTitle,
  mentionsGoa,
  coverageFromAlerts,
} from '../server/districts.mjs'
import { mergeAlerts, snapshotStats } from '../server/merge.mjs'
import { isMaharashtraOceanThreat, collectIncois } from '../server/incois.mjs'
import { xmlText, collectImdNowcast } from '../server/imd.mjs'
import { collectSachet } from '../server/sachet.mjs'
import { collectCwc } from '../server/cwc.mjs'
import { collectCpcb } from '../server/cpcb.mjs'

const dir = dirname(fileURLToPath(import.meta.url))
const fixture = readFileSync(join(dir, 'fixtures/cap-maharashtra-nowcast.xml'), 'utf8')
const statewideXml = readFileSync(join(dir, 'fixtures/cap-statewide.xml'), 'utf8')
const sawantwadiXml = readFileSync(join(dir, 'fixtures/cap-sawantwadi.xml'), 'utf8')
const goaOnlyXml = readFileSync(join(dir, 'fixtures/cap-goa-only.xml'), 'utf8')
const MH_IDS = DISTRICTS.map((d) => d.id).sort()

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

test('inventory is exactly 36 Maharashtra districts, six complete divisions, no Goa', () => {
  assert.equal(DISTRICTS.length, 36)
  assert.equal(new Set(DISTRICTS.map((d) => d.id)).size, 36)
  assert.equal(new Set(DISTRICTS.map((d) => d.lgd)).size, 36)
  const counts = {}
  for (const d of DISTRICTS) counts[d.division] = (counts[d.division] || 0) + 1
  assert.deepEqual(counts, EXPECTED_DIVISION_COUNTS)
  assert.equal(DISTRICTS.some((d) => /goa/i.test(d.en) || /goa/i.test(d.id)), false)
  for (const code of GOA_LGD) assert.equal(DISTRICT_BY_LGD.has(code) && DISTRICT_BY_LGD.get(code)?.id?.includes('goa'), false)
  assert.equal(DISTRICT_BY_LGD.get('551'), undefined)
  assert.equal(REGIONS.find((r) => r.id === 'konkan')?.districtIds.length, 7)
  assert.ok(REGIONS.find((r) => r.id === 'konkan').districtIds.includes('sindhudurg'))
  assert.ok(REGIONS.find((r) => r.id === 'vidarbha').districtIds.length === 11)
})

test('every district matches English, Marathi, and IMD ALL CAPS titles', () => {
  for (const d of DISTRICTS) {
    assert.ok(matchDistricts(d.en).some((x) => x.id === d.id), d.en)
    assert.ok(matchDistricts(d.mr).some((x) => x.id === d.id), d.mr)
    assert.ok(
      matchImdDistrictTitle(d.en.toUpperCase()).some((x) => x.id === d.id),
      `IMD ${d.en}`,
    )
  }
  assert.ok(matchImdDistrictTitle('AHMEDNAGAR').some((x) => x.id === 'ahilyanagar'))
  assert.ok(matchImdDistrictTitle('AURANGABAD').some((x) => x.id === 'chhatrapati-sambhajinagar'))
  assert.ok(matchImdDistrictTitle('OSMANABAD').some((x) => x.id === 'dharashiv'))
  assert.ok(matchImdDistrictTitle('YEOTMAL').some((x) => x.id === 'yavatmal'))
  assert.ok(matchImdDistrictTitle('GONDIYA').some((x) => x.id === 'gondia'))
  assert.ok(matchImdDistrictTitle('BID').some((x) => x.id === 'beed'))
  assert.ok(matchImdDistrictTitle('SINDHUDURG').some((x) => x.id === 'sindhudurg'))
  assert.ok(matchImdDistrictTitle('MUMBAI').some((x) => x.id === 'mumbai-city'))
  assert.ok(matchImdDistrictTitle('MUMBAI').some((x) => x.id === 'mumbai-suburban'))
  assert.equal(matchImdDistrictTitle('NORTH GOA').length, 0)
  assert.equal(matchImdDistrictTitle('JALPAIGURI').length, 0)
})

test('border gaons stay in Maharashtra; Goa state is excluded', () => {
  assert.deepEqual(matchDistricts('Sawantwadi landslide').map((d) => d.id), ['sindhudurg'])
  assert.ok(matchDistricts('Dodamarg and Tillari').some((d) => d.id === 'sindhudurg'))
  assert.ok(matchDistricts('Chandgad heavy rain').some((d) => d.id === 'kolhapur'))
  assert.ok(matchDistricts('Vengurla creek').some((d) => d.id === 'sindhudurg'))
  assert.equal(matchDistricts('Heavy rain over North Goa and Panaji').length, 0)
  assert.equal(matchDistricts('Margao and Vasco da Gama').length, 0)
  assert.ok(mentionsGoa('North Goa'))
  const konkanGoa = matchDistricts('Cyclone warning for Konkan and Goa')
  assert.equal(konkanGoa.length, 7)
  assert.ok(konkanGoa.some((d) => d.id === 'sindhudurg'))
  assert.ok(konkanGoa.some((d) => d.id === 'palghar'))
  assert.ok(!konkanGoa.some((d) => /goa/i.test(d.id)))
})

test('regions and statewide text cover every Maharashtra district', () => {
  assert.equal(matchDistricts('throughout Maharashtra').length, 36)
  assert.equal(matchDistricts('संपूर्ण महाराष्ट्र').length, 36)
  assert.equal(matchDistricts('Vidarbha heatwave').length, 11)
  assert.equal(matchDistricts('Marathwada flood').length, 8)
  assert.deepEqual(matchDistricts('Khandesh lightning').map((d) => d.id).sort(), ['dhule', 'jalgaon', 'nandurbar'])
  const coverage = coverageFromAlerts([
    { districts: DISTRICTS.map((d) => ({ id: d.id })) },
  ])
  assert.equal(coverage.totalDistricts, 36)
  assert.equal(coverage.liveCovered, 36)
  assert.deepEqual(coverage.quiet, [])
  assert.equal(coverage.excludedNeighbour.state, 'Goa')
})

test('CAP statewide, Sawantwadi border, and Goa-only geocodes', () => {
  const stateAlert = parseCapAlert(statewideXml)
  assert.equal(stateAlert.districts.length, 36)
  assert.deepEqual(stateAlert.districts.map((d) => d.id).sort(), MH_IDS)
  assert.equal(stateAlert.weaClass, 'IMMINENT_THREAT')
  assert.equal(stateAlert.kind, 'cyclone')

  const border = parseCapAlert(sawantwadiXml)
  assert.ok(border.districts.some((d) => d.id === 'sindhudurg'))
  assert.equal(border.kind, 'landslide')
  assert.equal(border.weaClass, 'IMMINENT_THREAT')

  const goa = parseCapAlert(goaOnlyXml)
  assert.equal(goa.districts.length, 0)
  assert.deepEqual(goa.lgdCodes, [])
})

test('taluka and city aliases resolve across the state', () => {
  const pairs = [
    ['Chiplun', 'ratnagiri'],
    ['Alibag', 'raigad'],
    ['Vasai Virar', 'palghar'],
    ['Kalyan Dombivli', 'thane'],
    ['Pimpri Chinchwad', 'pune'],
    ['Shirdi', 'ahilyanagar'],
    ['Ichalkaranji', 'kolhapur'],
    ['Pandharpur', 'solapur'],
    ['Malegaon', 'nashik'],
    ['Navi Mumbai', 'thane'],
    ['Kharghar', 'raigad'],
    ['Jayakwadi', 'chhatrapati-sambhajinagar'],
    ['Koyna', 'satara'],
    ['Melghat', 'amravati'],
    ['Kinwat', 'nanded'],
  ]
  for (const [place, id] of pairs) {
    assert.ok(matchDistricts(place).some((d) => d.id === id), place)
  }
})

test('xmlText unwraps RSS CDATA objects', () => {
  assert.equal(xmlText({ '#text': 'Moderate rain: 5-15 mm/hr' }), 'Moderate rain: 5-15 mm/hr')
  assert.equal(xmlText('PUNE'), 'PUNE')
})

test('every WEA situation kind still classifies', () => {
  const samples = {
    tsunami: { category: 'Geo', event: 'Tsunami warning', severity: 'Severe', urgency: 'Immediate' },
    cyclone: { category: 'Met', event: 'Cyclone', severity: 'Severe', urgency: 'Immediate' },
    flood: { category: 'Met', event: 'River flood', severity: 'Severe', urgency: 'Immediate' },
    landslide: { category: 'Geo', event: 'Landslide', severity: 'Severe', urgency: 'Immediate' },
    earthquake: { category: 'Geo', event: 'Earthquake', severity: 'Severe', urgency: 'Immediate' },
    lightning: { category: 'Met', event: 'Lightning', severity: 'Moderate', urgency: 'Expected' },
    heat: { category: 'Met', event: 'Heat wave', severity: 'Moderate', urgency: 'Expected' },
    cold: { category: 'Met', event: 'Cold wave', severity: 'Moderate', urgency: 'Expected' },
    chemical: { category: 'CBRNE', event: 'MIDC gas leak', severity: 'Severe', urgency: 'Immediate' },
    fire: { category: 'Fire', event: 'Industrial fire', severity: 'Severe', urgency: 'Immediate' },
    health: { category: 'Health', event: 'Cholera outbreak', severity: 'Severe', urgency: 'Immediate' },
    child: { category: 'Rescue', event: 'Missing child', severity: 'Moderate', urgency: 'Immediate' },
    air: { category: 'Env', event: 'Air quality very poor', severity: 'Severe', urgency: 'Expected' },
    rain: { category: 'Met', event: 'Light rain', severity: 'Moderate', urgency: 'Expected' },
    civil: { category: 'Security', event: 'Curfew law and order', severity: 'Moderate', urgency: 'Expected' },
  }
  const seen = new Set()
  for (const [kind, alert] of Object.entries(samples)) {
    seen.add(situationKind({ ...alert, headlineEn: alert.event }))
    assert.ok(classifyWea({ status: 'Actual', ...alert }))
  }
  for (const [id] of SITUATION_KINDS) {
    if (id === 'other') continue
    assert.ok(seen.has(id), id)
  }
})

function assertMaharashtraOnly(alerts, source) {
  for (const alert of alerts) {
    for (const d of alert.districts || []) {
      assert.ok(MH_IDS.includes(d.id), `${source} leaked ${d.id}`)
      assert.equal(/goa/i.test(d.id), false)
    }
  }
}

test('live IMD nowcast only attaches Maharashtra districts', { timeout: 60_000 }, async () => {
  const alerts = await collectImdNowcast()
  assert.ok(Array.isArray(alerts))
  assertMaharashtraOnly(alerts, 'imd')
})

test('live INCOIS does not attach Pacific quakes as Konkan imminent', { timeout: 30_000 }, async () => {
  const alerts = await collectIncois()
  assert.ok(Array.isArray(alerts))
  assertMaharashtraOnly(alerts, 'incois')
  for (const a of alerts) {
    assert.equal(/flores|indonesia|japan|mexico|peru|colombia/i.test(a.headlineEn || ''), false)
  }
})

test('live SACHET Maharashtra CAP stays inside the 36 districts', { timeout: 120_000 }, async () => {
  const result = await collectSachet()
  assert.equal(result.unchanged, false)
  assert.ok(result.alerts.length > 0)
  assertMaharashtraOnly(result.alerts, 'sachet')
})

test('live CWC collector does not throw and stays in-state when it returns rows', { timeout: 20_000 }, async () => {
  const alerts = await collectCwc()
  assert.ok(Array.isArray(alerts))
  assertMaharashtraOnly(alerts, 'cwc')
})

test('CPCB without a data.gov.in key returns no rows', async () => {
  assert.deepEqual(await collectCpcb('', ['Mumbai']), [])
})

