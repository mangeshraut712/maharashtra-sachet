import assert from 'node:assert/strict'
import test from 'node:test'
import { METRO_STATIONS, metroAlerts, metroExplainHref, stationDistrict } from '../web/modules/metro-model.mjs'
import { DISTRICTS } from '../server/districts.mjs'

test('Vanaz–Ramwadi has 16 ordered stops, all mapped only to Pune district', () => {
  assert.deepEqual(METRO_STATIONS.map(s => s.en), ['Vanaz', 'Anand Nagar', 'Ideal Colony', 'Nal Stop', 'Garware College', 'Deccan Gymkhana', 'Chhatrapati Sambhaji Udyan', 'PMC', 'District Court', 'Mangalwar Peth', 'Pune Railway Station', 'Ruby Hall Clinic', 'Bund Garden', 'Yerawada', 'Kalyani Nagar', 'Ramwadi'])
  assert.equal(new Set(METRO_STATIONS.map(s => s.id)).size, 16)
  for (const station of METRO_STATIONS) {
    assert.equal(stationDistrict(station.id), 'pune')
    assert.equal(station.precision, 'district-alias')
    assert.equal(DISTRICTS.some(d => d.id === station.districtId), true)
    assert.equal('coordinates' in station, false)
  }
  assert.equal(stationDistrict('panaji'), null)
  assert.equal(stationDistrict('invented-station'), null)
  assert.equal(DISTRICTS.length, 36)
})

test('Metro filters current Pune district records without inferring station impact', () => {
  const future = '2030-01-01T00:00:00Z'
  const alerts = [
    { id: 'pune', districts: [{ id: 'pune' }], expires: future },
    { id: 'statewide', districts: [{ id: 'pune' }, { id: 'mumbai' }], expires: future },
    { id: 'sindhudurg', districts: [{ id: 'sindhudurg' }], expires: future },
    { id: 'cancelled', districts: [{ id: 'pune' }], msgType: 'Cancel', expires: future },
    { id: 'expired', districts: [{ id: 'pune' }], expires: '2020-01-01T00:00:00Z' },
    { id: 'headline-only', headlineEn: 'Pune', districts: [], expires: future },
  ]
  const now = Date.parse('2026-10-24T00:00:00Z')
  for (const station of METRO_STATIONS) assert.deepEqual(metroAlerts(alerts, station.id, now).map(a => a.id), ['pune', 'statewide'])
  assert.deepEqual(metroAlerts(alerts, 'unknown', now), [])
})

test('sample explainer handoff preserves provenance and district precision', () => {
  const alert = { headlineEn: 'Demo: Pune notice', description: '<script>not HTML</script>', instruction: 'Check local authority', districts: [{ id: 'pune', en: 'Pune' }] }
  const url = new URL(metroExplainHref(alert, { demo: true }), 'https://civic.example')
  assert.equal(url.pathname, '/explain')
  assert.equal(url.searchParams.get('demo'), '1')
  const params = new URLSearchParams(url.hash.slice(1))
  assert.equal(params.get('run'), '1')
  assert.match(params.get('alert'), /^\[DEMO \/ SAMPLE DATA — NOT A LIVE GOVERNMENT ALERT\]/)
  assert.match(params.get('alert'), /District: Pune/)
  assert.match(params.get('alert'), /does not establish an impact at any station/)
  assert.match(params.get('alert'), /<script>not HTML<\/script>/)
  assert.equal(new URL(metroExplainHref({ ...alert, demo: true }), 'https://civic.example').searchParams.get('demo'), '1')
  assert.equal(new URL(metroExplainHref(alert), 'https://civic.example').searchParams.has('demo'), false)
})
