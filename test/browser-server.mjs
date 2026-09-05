import { createRelay, createRelayServer } from '../server/index.mjs'
import { DISTRICTS } from '../server/districts.mjs'

// Test-only records. Never imported by the production Worker or served as assets.
const now = Date.now()
const sent = new Date(now - 60_000).toISOString()
const expires = new Date(now + 3_600_000).toISOString()
const alert = (id, district, kind, headline, languages = []) => ({
  id, source: 'sachet', official: true, sender: 'Fixture authority', sent, expires,
  status: 'Actual', scope: 'Public', msgType: 'Alert', category: 'Safety',
  severity: 'Moderate', urgency: 'Expected', certainty: 'Observed',
  headlineEn: headline, language: 'en', description: 'Fixture information only.',
  instruction: 'Read the official source.', areaDesc: district.en, districts: [district],
  weaClass: 'PUBLIC_SAFETY', kind, capUrl: 'https://sachet.ndma.gov.in/', languages,
})
const pune = DISTRICTS.find(d => d.id === 'pune')
const sindhudurg = DISTRICTS.find(d => d.id === 'sindhudurg')
const records = [
  alert('fixture-water', pune, 'water', 'Test fixture: water service notice', [
    { language: 'en', headline: 'Test fixture: water service notice', description: '<img src=x onerror="window.__feedInjected=true">', instruction: 'Read the official source.' },
    { language: 'mr', headline: 'चाचणी नमुना: पाणीपुरवठा सूचना', description: 'हा केवळ चाचणी नमुना आहे.', instruction: 'अधिकृत स्रोत वाचा.' },
  ]),
  alert('fixture-road', sindhudurg, 'transport', 'Test fixture: border road notice'),
]
const sources = Object.fromEntries(['sachet', 'imd', 'incois', 'cwc', 'cpcb'].map(id => [id, {
  records: id === 'sachet' ? records : [], state: ['cwc','cpcb'].includes(id) ? 'disabled' : 'healthy',
  lastSuccessAt: sent, lastAttemptAt: sent, error: null,
}]))
const relay = createRelay({ collectors: [], initialState: { generatedAt: new Date(now).toISOString(), sources } })
createRelayServer({ relay }).listen(8799, '127.0.0.1', () => console.log('Fixture server http://127.0.0.1:8799'))
