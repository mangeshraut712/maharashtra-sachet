import { matchDistricts } from './districts.mjs'
import { fetchText } from './http.mjs'
import { classifyWea, situationKind } from './wea.mjs'

const CANDIDATES = [
  'https://ffs.india-water.gov.in/iam/api/new-alert-public?size=40',
  'https://sachet.ndma.gov.in/cap_public_website/rss/rss_india.xml',
]

function asArray(value) {
  if (value == null) return []
  return Array.isArray(value) ? value : [value]
}

function fromJsonRecords(json) {
  const rows = json.content || json.data || json.records || json.alerts || []
  const alerts = []
  for (const row of asArray(rows)) {
    const title = String(row.alertTitle || row.title || row.stationName || row.name || '')
    const desc = String(row.alertMessage || row.message || row.description || row.warning || '')
    const blob = `${title} ${desc} ${row.river || ''} ${row.district || ''} ${row.state || ''}`
    if (!/maharashtra|मुंबई|पुणे|नागपूर|कोकण|गोदावरी|कृष्णा|तापी|भीमा/i.test(blob) && matchDistricts(blob).length === 0) {
      continue
    }
    const districts = matchDistricts(blob)
    if (districts.length === 0) continue
    const body = {
      id: `cwc-${row.id || row.stationCode || title}-${row.issuedOn || row.date || ''}`,
      source: 'cwc',
      official: true,
      sender: 'Central Water Commission',
      sent: row.issuedOn || row.date || row.updatedOn,
      status: 'Actual',
      msgType: 'Alert',
      category: 'Met',
      event: 'Flood Watch',
      urgency: /red|extreme|above danger/i.test(blob) ? 'Immediate' : 'Expected',
      severity: /red|extreme|above danger/i.test(blob) ? 'Severe' : 'Moderate',
      certainty: 'Likely',
      headlineEn: title || 'CWC flood bulletin',
      headlineMr: title || 'सीडब्ल्यूसी पूर बुलेटिन',
      description: desc || blob,
      instruction: 'Move away from riverbanks if water is rising. Call 112. Follow District EOC 1070.',
      districts: districts.map((d) => ({ id: d.id, en: d.en, mr: d.mr, lgd: d.lgd })),
      capUrl: 'https://ffs.india-water.gov.in/',
      author: 'CWC FloodWatch',
    }
    body.weaClass = classifyWea(body)
    body.kind = situationKind({ ...body, event: `flood ${body.event}`, headlineEn: body.headlineEn })
    alerts.push(body)
  }
  return alerts
}

export async function collectCwc() {
  for (const url of CANDIDATES.slice(0, 1)) {
    try {
      const res = await fetchText(url, {
        accept: 'application/json,application/xml,text/plain,*/*',
        timeoutMs: 8000,
      })
      if (!res.ok) continue
      const trimmed = res.text.trim()
      if (!trimmed) continue
      if (trimmed.startsWith('{') || trimmed.startsWith('[')) {
        return fromJsonRecords(JSON.parse(trimmed))
      }
    } catch {
      continue
    }
  }
  return []
}
