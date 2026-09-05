import { fetchText } from './http.mjs'
import { classifyWea, situationKind } from './wea.mjs'

const URL = 'https://tsunami.incois.gov.in/itews/DSSProducts/OPR/past90days.json'

const WEST_REGION =
  /\b(arabian sea|makran|gulf of oman|muscat|karachi|gujarat|saurashtra|kutch|mumbai|konkan|goa|lakshadweep|maldive|carlsberg ridge)\b/i

/** Legacy name: selects regional catalog observations, not established tsunami threats. */
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

export async function collectIncois(options = {}) {
  const res = await fetchText(URL, { ...options, expectedContentTypes:['application/json'] })
  if (!res.ok) throw new Error(`INCOIS HTTP ${res.status}`)
  const json = JSON.parse(res.text)
  const rows = json.datasets
  if (!Array.isArray(rows)) throw new Error('Unsupported INCOIS catalog schema')
  const alerts = []
  for (const row of rows) {
    if (!isMaharashtraOceanThreat(row)) continue
    const mag = Number(row.MAGNITUDE || row.mag || 0)
    const region = String(row.REGIONNAME || row.place || '')
    const threat = String(row.THREATSTATUS || row.threat || row.TYPE || '')
    const when = row.ORIGINTIME || row.time
    const body = {
      id: `incois-${row.EVID || row.id || when}`,
      source: 'incois',
      official: true,
      recordType: 'observation',
      warningDisabledReason: 'Earthquake catalog observations do not establish an official Maharashtra tsunami warning.',
      sender: 'INCOIS ITEWC',
      sent: when,
      status: 'Actual',
      scope: 'Public',
      msgType: 'Alert',
      category: 'Geo',
      event: 'West Indian Ocean earthquake observation',
      urgency: 'Unknown',
      severity: 'Unknown',
      certainty: 'Observed',
      headlineEn: `M${Number.isFinite(mag) ? mag.toFixed(1) : mag} ${region}`.trim(),
      headlineMr: '',
      language: 'en',
      description: `Origin ${when}. Depth ${row.DEPTH || '?'} km. Coordinates ${row.LATITUDE}, ${row.LONGITUDE}. ${threat}`.trim(),
      instruction: '',
      districts: [],
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
