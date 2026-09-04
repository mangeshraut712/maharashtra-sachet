import { XMLParser } from 'fast-xml-parser'
import { DISTRICT_BY_LGD, matchDistricts } from './districts.mjs'
import { sachetGet } from './http.mjs'
import { classifyWea, situationKind } from './wea.mjs'

const parser = new XMLParser({
  ignoreAttributes: false,
  attributeNamePrefix: '',
  removeNSPrefix: true,
  isArray: name =>
    ['item', 'info', 'area', 'geocode', 'parameter', 'polygon', 'category'].includes(name),
})

const RSS = 'https://sachet.ndma.gov.in/cap_public_website/rss/rss_maharashtra.xml'
const etags = new Map()

function asArray(value) {
  if (value == null) return []
  return Array.isArray(value) ? value : [value]
}

function pickInfo(infos, lang) {
  const list = asArray(infos)
  const wanted = list.find(i => String(i.language || '').toLowerCase().startsWith(lang))
  return wanted || list.find(i => String(i.language || '').toLowerCase().startsWith('en')) || list[0] || {}
}

function geocodes(info) {
  const codes = []
  for (const area of asArray(info.area)) {
    for (const g of asArray(area.geocode)) {
      if (g.value) codes.push(String(g.value))
    }
  }
  return [...new Set(codes)]
}

function parsePolygons(xml) {
  if (!xml) return []
  const doc = parser.parse(xml)
  const raw = doc.alert?.polygon ?? doc.polygon
  const list = asArray(raw)
  return list
    .map(text =>
      String(text)
        .trim()
        .split(/\s+/)
        .map(pair => {
          const [lat, lon] = pair.split(',').map(Number)
          return Number.isFinite(lat) && Number.isFinite(lon) ? [lat, lon] : null
        })
        .filter(Boolean),
    )
    .filter(ring => ring.length >= 3)
}

export function parseCapAlert(xml, meta = {}) {
  const doc = parser.parse(xml)
  const cap = doc.alert
  if (!cap) return null
  const en = pickInfo(cap.info, 'en')
  const mr = pickInfo(cap.info, 'hi') || pickInfo(cap.info, 'mr')
  const codes = [...new Set([...geocodes(en), ...geocodes(mr)])]
  const districtsFromCodes = codes.map(c => DISTRICT_BY_LGD.get(c)).filter(Boolean)
  const districts =
    districtsFromCodes.length > 0
      ? districtsFromCodes
      : matchDistricts(`${en.headline || ''} ${mr.headline || ''} ${en.areaDesc || ''}`)

  const areaDesc = asArray(en.area)[0]?.areaDesc || asArray(mr.area)[0]?.areaDesc || ''
  const polygonUrl = asArray(en.parameter)
    .concat(asArray(mr.parameter))
    .find(p => /polygon/i.test(p.valueName || ''))?.value

  const base = {
    id: String(cap.identifier || meta.guid || ''),
    source: 'sachet',
    official: true,
    sender: cap.sender || meta.author || 'Maharashtra-SDMA',
    sent: cap.sent,
    status: cap.status,
    msgType: cap.msgType,
    scope: cap.scope,
    category: en.category || mr.category || meta.category || 'Other',
    event: en.event || mr.event || '',
    urgency: en.urgency || mr.urgency,
    severity: en.severity || mr.severity,
    certainty: en.certainty || mr.certainty,
    effective: en.effective,
    onset: en.onset,
    expires: en.expires,
    headlineEn: en.headline || '',
    headlineMr: mr.headline || en.headline || '',
    instruction: en.instruction || mr.instruction || '',
    description: en.description || mr.description || '',
    areaDesc,
    districts: districts.map(d => ({ id: d.id, en: d.en, mr: d.mr, lgd: d.lgd })),
    lgdCodes: codes,
    polygonUrl,
    capUrl: meta.link,
    author: meta.author,
  }
  base.weaClass = classifyWea(base)
  base.kind = situationKind(base)
  return base
}

export async function collectSachet() {
  const rss = await sachetGet(RSS, { etag: etags.get('rss') })
  if (rss.status === 304) return { unchanged: true, alerts: [] }
  if (!rss.ok) throw new Error(`SACHET RSS HTTP ${rss.status}`)
  etags.set('rss', rss.etag)

  const feed = parser.parse(rss.text)
  const items = asArray(feed.rss?.channel?.item)
  const alerts = []

  for (const item of items) {
    const id = String(item.guid || '').replace(/^.*identifier=/, '') || String(item.link || '')
    const capRes = await sachetGet(item.link, { etag: etags.get(id) })
    if (capRes.status === 304) continue
    if (!capRes.ok) continue
    etags.set(id, capRes.etag)
    const alert = parseCapAlert(capRes.text, {
      guid: item.guid,
      link: item.link,
      author: item.author,
      category: item.category,
    })
    if (!alert) continue

    if (alert.polygonUrl) {
      try {
        const poly = await sachetGet(alert.polygonUrl, { etag: etags.get(`poly:${id}`) })
        if (poly.ok && poly.status !== 304) {
          etags.set(`poly:${id}`, poly.etag)
          alert.polygons = parsePolygons(poly.text)
        }
      } catch {
        alert.polygons = []
      }
    }
    alerts.push(alert)
  }

  return { unchanged: false, alerts }
}
