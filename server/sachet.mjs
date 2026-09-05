import { XMLParser, XMLValidator } from 'fast-xml-parser'
import { DISTRICT_BY_LGD, matchDistricts, isGoaLgd } from './districts.mjs'
import { sachetGet, ensureSachetSession } from './http.mjs'
import { classifyWea, situationKind } from './wea.mjs'

const parser = new XMLParser({
  ignoreAttributes: false,
  attributeNamePrefix: '',
  removeNSPrefix: true,
  processEntities: false,
  parseTagValue: false,
  isArray: name =>
    ['item', 'info', 'area', 'geocode', 'parameter', 'polygon', 'category'].includes(name),
})

const RSS = 'https://sachet.ndma.gov.in/cap_public_website/rss/rss_maharashtra.xml'

function asArray(value) {
  if (value == null) return []
  return Array.isArray(value) ? value : [value]
}

function pickInfo(infos, lang) {
  const list = asArray(infos)
  const wanted = list.find(i => {
    const language = String(i.language || 'en').toLowerCase()
    return language === lang || language.startsWith(`${lang}-`)
  })
  return wanted || {}
}

function geocodes(info) {
  const codes = []
  for (const area of asArray(info.area)) {
    for (const g of asArray(area.geocode)) {
      if (/^(LGD|LGD District Code)$/i.test(String(g.valueName || '').trim()) && g.value) codes.push(String(g.value))
    }
  }
  return [...new Set(codes)]
}

function parsePolygons(raw, { strict = false } = {}) {
  const rings = asArray(raw)
    .map(text =>
      String(text)
        .trim()
        .split(/\s+/)
        .map(pair => {
          const [lat, lon] = pair.split(',').map(Number)
          return Number.isFinite(lat) && Number.isFinite(lon) && Math.abs(lat) <= 90 && Math.abs(lon) <= 180 ? [lat, lon] : null
        })
    )
  const valid = rings.filter(ring => ring.length >= 4 && ring.every(Boolean) && ring[0][0] === ring.at(-1)[0] && ring[0][1] === ring.at(-1)[1])
  if (strict && valid.length !== rings.length) throw new Error('Invalid SACHET polygon ring')
  return valid
}

function parseXml(xml) {
  if (typeof xml !== 'string' || new TextEncoder().encode(xml).byteLength > 2_000_000 || /<!DOCTYPE|<!ENTITY/i.test(xml) || XMLValidator.validate(xml) !== true) throw new Error('Invalid upstream XML')
  return parser.parse(xml)
}

function infoDistrictIds(info) {
  const codes = geocodes(info).map(code => DISTRICT_BY_LGD.get(code)).filter(Boolean)
  const named = matchDistricts(asArray(info.area).map(area=>area.areaDesc || '').join('; '))
  return [...new Set([...codes,...named].map(d=>d.id))].sort().join(',')
}

function validateInfoAgreement(infos) {
  // The legacy one-record representation cannot safely combine distinct hazards.
  for (const field of ['severity','urgency','certainty','effective','onset','expires','category']) {
    const values = infos.filter(info=>info[field] != null).map(info=>JSON.stringify(info[field]))
    if (new Set(values).size > 1) throw new Error('Inconsistent CAP info alert semantics')
  }
  const locations = infos.map(infoDistrictIds).filter(Boolean)
  if (new Set(locations).size > 1) throw new Error('Inconsistent CAP info affected districts')
}

export function parseCapAlert(xml, meta = {}) {
  const doc = parseXml(xml)
  const cap = doc.alert
  if (!cap) return null
  if (typeof cap.identifier !== 'string' || !cap.identifier.trim() || typeof cap.sender !== 'string' || !cap.sender.trim() || !Number.isFinite(Date.parse(cap.sent)) || !['Actual','Exercise','System','Test','Draft'].includes(cap.status) || !['Public','Restricted','Private'].includes(cap.scope) || !['Alert','Update','Cancel','Ack','Error'].includes(cap.msgType)) throw new Error('Invalid CAP required fields')
  const infos = asArray(cap.info)
  validateInfoAgreement(infos)
  const en = pickInfo(infos, 'en')
  const mr = pickInfo(infos, 'mr')
  const hi = pickInfo(infos, 'hi')
  const primary = Object.keys(en).length ? en : Object.keys(mr).length ? mr : Object.keys(hi).length ? hi : infos[0] || {}
  const shared = field => primary[field] ?? infos.find(info=>info[field] != null)?.[field]
  const codes = [...new Set(infos.flatMap(geocodes))].filter((c) => !isGoaLgd(c))
  const areas = infos.flatMap(i => asArray(i.area))
  const areaDesc = areas
    .map((a) => a?.areaDesc)
    .filter(Boolean)
    .join('; ')
  const districtsFromCodes = codes.map((c) => DISTRICT_BY_LGD.get(c)).filter(Boolean)
  const named = matchDistricts(
    areaDesc || infos.map(i => `${i.headline || ''} ${i.description || ''}`).join(' '),
  )
  const merged = new Map()
  for (const row of [...districtsFromCodes, ...named]) merged.set(row.id, row)
  const districts = [...merged.values()]
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
    category: shared('category') || meta.category || 'Other',
    event: primary.event || '',
    urgency: shared('urgency') || 'Unknown',
    severity: shared('severity') || 'Unknown',
    certainty: shared('certainty') || 'Unknown',
    effective: shared('effective'),
    onset: shared('onset'),
    expires: shared('expires'),
    headlineEn: en.headline || '',
    headlineMr: mr.headline || '',
    headlineHi: hi.headline || '',
    language: primary.language || 'en',
    languages: infos.map(i => ({ language: i.language || 'en', headline:i.headline || '', description:i.description || '', instruction:i.instruction || '' })),
    instruction: primary.instruction || '',
    description: primary.description || '',
    references: String(cap.references || '').trim().split(/\s+/).filter(Boolean).map(ref => { const [sender,identifier,sent] = ref.split(','); return {sender,identifier,sent} }).filter(ref => ref.sender && ref.identifier && Number.isFinite(Date.parse(ref.sent))),
    polygons: areas.flatMap(area => parsePolygons(area.polygon)),
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

export async function collectSachet(options = {}) {
  const now = options.now ?? Date.now()
  const deadline = AbortSignal.timeout(25_000)
  const signal = options.signal ? AbortSignal.any([options.signal,deadline]) : deadline
  const maxRequests = Math.min(32, Number.isInteger(options.maxRequests) && options.maxRequests > 0 ? options.maxRequests : 32)
  let requestCount = 0
  const fetch = async (...args) => {
    if (requestCount >= maxRequests) { const error = new Error('SACHET upstream request budget exceeded'); error.code = 'SOURCE_BUDGET_EXCEEDED'; throw error }
    requestCount++
    return (options.fetch || globalThis.fetch)(...args)
  }
  const session = { ...options, fetch, signal, cookie: await ensureSachetSession({...options,fetch,signal}) }
  const rss = await sachetGet(RSS, session)
  if (rss.status === 304) throw new Error('Unexpected SACHET 304 without retained snapshot')
  if (!rss.ok) throw new Error(`SACHET RSS HTTP ${rss.status}`)

  const feed = parseXml(rss.text)
  if (!feed.rss?.channel) throw new Error('Invalid SACHET RSS schema')
  const items = asArray(feed.rss?.channel?.item)
  if (items.length > maxRequests - requestCount) { const error = new Error('SACHET feed exceeds upstream request budget'); error.code = 'SOURCE_BUDGET_EXCEEDED'; throw error }
  const alerts = []
  const cache = {}
  async function cachedXml(url) {
    const previous = options.cache?.[url]
    const usable = previous && typeof previous.etag === 'string' && previous.etag.length <= 512 && typeof previous.xml === 'string'
    const result = await sachetGet(url, { ...session, etag: usable ? previous.etag : undefined })
    if (result.status === 304) {
      if (!usable) throw new Error('Unexpected SACHET 304 without cached XML')
      cache[url] = previous
      return previous.xml
    }
    if (!result.ok) throw new Error(`SACHET CAP HTTP ${result.status}`)
    if (result.etag && result.etag.length <= 512) cache[url] = { etag: result.etag, xml: result.text }
    return result.text
  }

  for (const item of items) {
    const alert = parseCapAlert(await cachedXml(item.link), {
      guid: item.guid,
      link: item.link,
      author: item.author,
      category: item.category,
    })
    if (!alert?.id) throw new Error('Invalid SACHET CAP schema')

    if (alert.polygonUrl && !alert.polygons.length) {
      const inactive = alert.status !== 'Actual' || alert.scope !== 'Public' || !['Alert','Update'].includes(alert.msgType) || (alert.expires && Date.parse(alert.expires) <= now)
      if (inactive) {
        // Keep every CAP lifecycle message; historical map geometry is optional.
        alert.geometryStatus = 'not_requested_inactive'
      } else {
        const poly = await sachetGet(alert.polygonUrl, session)
        if (!poly.ok) throw new Error(`SACHET polygon HTTP ${poly.status}`)
        const doc = parseXml(poly.text)
        alert.polygons = parsePolygons(doc.alert?.polygon ?? doc.polygon, { strict: true })
        if (!alert.polygons.length) throw new Error('Invalid SACHET polygon schema')
        alert.geometryStatus = 'available'
      }
    }
    alerts.push(alert)
  }

  return { unchanged: false, alerts, cache }
}
