import { matchDistricts } from './districts.mjs'
import { fetchText } from './http.mjs'
import { classifyWea, situationKind } from './wea.mjs'

const RESOURCE = '3b01bcb8-0b14-4abf-b6f2-c1bfd384ba69'

function aqiBand(avg) {
  const n = Number(avg)
  if (!Number.isFinite(n)) return { label: 'Unknown', severity: 'Unknown' }
  if (n <= 50) return { label: 'Good', severity: 'Minor' }
  if (n <= 100) return { label: 'Satisfactory', severity: 'Minor' }
  if (n <= 200) return { label: 'Moderate', severity: 'Moderate' }
  if (n <= 300) return { label: 'Poor', severity: 'Moderate' }
  if (n <= 400) return { label: 'Very poor', severity: 'Severe' }
  return { label: 'Severe', severity: 'Extreme' }
}

export async function collectCpcb(apiKey, cities) {
  if (!apiKey) return []
  const alerts = []
  for (const city of cities) {
    const url =
      `https://api.data.gov.in/resource/${RESOURCE}` +
      `?api-key=${encodeURIComponent(apiKey)}&format=json&limit=50&filters[city]=${encodeURIComponent(city)}`
    const res = await fetchText(url, { accept: 'application/json' })
    if (!res.ok) continue
    const json = JSON.parse(res.text)
    const records = json.records || []
    if (records.length === 0) continue
    const pm = records.filter(r => /PM2\.5|PM10|pm2/i.test(r.pollutant_id || r.pollutant || ''))
    const sample = pm[0] || records[0]
    const avg = sample.pollutant_avg || sample.avg
    const band = aqiBand(avg)
    if (band.severity === 'Minor') continue
    const body = {
      id: `cpcb-${city}-${sample.last_update || sample.station}`,
      source: 'cpcb',
      official: true,
      sender: 'CPCB',
      sent: sample.last_update,
      status: 'Actual',
      msgType: 'Alert',
      category: 'Env',
      event: 'Air quality',
      urgency: band.severity === 'Extreme' ? 'Immediate' : 'Expected',
      severity: band.severity,
      certainty: 'Observed',
      headlineEn: `${city} air quality ${band.label} (${avg})`,
      headlineMr: `${city} हवामान गुणवत्ता ${band.label}`,
      description: `${sample.station || city}: ${sample.pollutant_id || ''} avg ${avg}`,
      instruction:
        'Limit outdoor exertion. Sensitive groups stay indoors. This is CPCB station data, not a GRAP order.',
      districts: matchDistricts(city).map((d) => ({ id: d.id, en: d.en, mr: d.mr, lgd: d.lgd })),
      capUrl: 'https://airquality.cpcb.gov.in/AQI_India/',
      author: 'CPCB via data.gov.in',
    }
    body.weaClass = classifyWea(body)
    body.kind = situationKind(body)
    alerts.push(body)
  }
  return alerts
}
