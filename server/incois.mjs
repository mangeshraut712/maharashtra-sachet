import { fetchTextRelaxedTls } from './http.mjs'
import { classifyWea, situationKind } from './wea.mjs'

const URL = 'https://tsunami.incois.gov.in/itews/DSSProducts/OPR/past90days.json'

const WEST_REGION =
  /\b(arabian sea|makran|gulf of oman|muscat|karachi|gujarat|saurashtra|kutch|mumbai|konkan|goa|lakshadweep|maldive|carlsberg ridge)\b/i

const COASTAL_DISTRICTS = [
  { id: 'ratnagiri', en: 'Ratnagiri', mr: 'रत्नागिरी' },
  { id: 'sindhudurg', en: 'Sindhudurg', mr: 'सिंधुदुर्ग' },
  { id: 'raigad', en: 'Raigad', mr: 'रायगड' },
  { id: 'mumbai-city', en: 'Mumbai City', mr: 'मुंबई शहर' },
  { id: 'mumbai-suburban', en: 'Mumbai Suburban', mr: 'मुंबई उपनगर' },
  { id: 'thane', en: 'Thane', mr: 'ठाणे' },
  { id: 'palghar', en: 'Palghar', mr: 'पालघर' },
]

/** Arabian Sea, Makran, and Carlsberg source regions that can affect the Maharashtra coast. */
export function isMaharashtraOceanThreat(row) {
  const lat = Number(row.LATITUDE ?? row.lat)
  const lon = Number(row.LONGITUDE ?? row.lon)
  const mag = Number(row.MAGNITUDE ?? row.mag ?? 0)
  const region = String(row.REGIONNAME || row.place || '')
  const threat = String(row.THREATSTATUS || row.threat || row.TYPE || '')
  if (/watch|warning/i.test(threat) && WEST_REGION.test(region)) return true
  if (WEST_REGION.test(region) && mag >= 6.5) return true
  if (!Number.isFinite(lat) || !Number.isFinite(lon) || mag < 6.5) return false
  const arabian = lat >= 5 && lat <= 30 && lon >= 50 && lon <= 78
  const carlsberg = lat >= -8 && lat <= 12 && lon >= 55 && lon <= 75
  return arabian || carlsberg
}

export async function collectIncois() {
  const res = await fetchTextRelaxedTls(URL)
  if (!res.ok) throw new Error(`INCOIS HTTP ${res.status}`)
  const json = JSON.parse(res.text)
  const rows = json.datasets || json.features || []
  const alerts = []
  for (const row of rows) {
    if (!isMaharashtraOceanThreat(row)) continue
    const mag = Number(row.MAGNITUDE || row.mag || 0)
    const region = String(row.REGIONNAME || row.place || '')
    const threat = String(row.THREATSTATUS || row.threat || row.TYPE || '')
    const when = row.ORIGINTIME || row.time
    const severe = /warning/i.test(threat) || mag >= 7.5
    const body = {
      id: `incois-${row.EVID || row.id || when}`,
      source: 'incois',
      official: true,
      sender: 'INCOIS ITEWC',
      sent: when,
      status: 'Actual',
      msgType: 'Alert',
      category: 'Geo',
      event: severe ? 'Earthquake / tsunami watch' : 'West Indian Ocean earthquake',
      urgency: severe ? 'Immediate' : 'Expected',
      severity: severe ? 'Severe' : 'Moderate',
      certainty: 'Possible',
      headlineEn: `M${Number.isFinite(mag) ? mag.toFixed(1) : mag} ${region}`.trim(),
      headlineMr: `INCOIS: ${region}`,
      description: `Origin ${when}. Depth ${row.DEPTH || '?'} km. Coordinates ${row.LATITUDE}, ${row.LONGITUDE}. ${threat}`.trim(),
      instruction:
        'Shown only because the epicentre is in a source region that can affect the Maharashtra coast. Act only if INCOIS / NDMA issues a west-coast watch or warning. Call 112.',
      districts: COASTAL_DISTRICTS,
      capUrl: 'https://tsunami.incois.gov.in/TEWS/searlywarnings.jsp',
      author: 'INCOIS',
      extra: { lat: row.LATITUDE, lon: row.LONGITUDE, mag },
    }
    body.weaClass = classifyWea(body)
    body.kind = situationKind(body)
    alerts.push(body)
  }
  return alerts.slice(0, 12)
}
