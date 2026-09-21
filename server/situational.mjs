import { MH_BBOX, inMaharashtraBbox } from './mh-geo.mjs'
import { fetchText } from './http.mjs'

const CACHE_MS = 5 * 60_000
let cache = { at: 0, payload: null }

const USGS_URL = 'https://earthquake.usgs.gov/fdsnws/event/1/query'
const FIRMS_AREA = `${MH_BBOX.west},${MH_BBOX.south},${MH_BBOX.east},${MH_BBOX.north}`

export function situationalDisclaimer() {
  return 'Supplementary situational context only — not NDMA/IMD official alerts. Do not treat as government warnings.'
}

function startTime(days = 7) {
  const d = new Date(Date.now() - days * 86_400_000)
  return d.toISOString().slice(0, 10)
}

export async function fetchMaharashtraQuakes({ fetch: impl = globalThis.fetch, now = Date.now() } = {}) {
  const params = new URLSearchParams({
    format: 'geojson',
    starttime: startTime(7),
    endtime: new Date(now).toISOString().slice(0, 10),
    minlatitude: String(MH_BBOX.south),
    maxlatitude: String(MH_BBOX.north),
    minlongitude: String(MH_BBOX.west),
    maxlongitude: String(MH_BBOX.east),
    minmagnitude: '2.5',
    orderby: 'time',
  })
  const url = `${USGS_URL}?${params}`
  const response = await fetchText(url, {
    fetch: impl,
    accept: 'application/json',
    expectedContentTypes: ['application/json', 'application/geo+json'],
    maxBytes: 800_000,
    timeoutMs: 12_000,
  })
  if (!response.ok) throw new Error(`USGS HTTP ${response.status}`)
  const body = JSON.parse(response.text)
  const features = (body.features || []).filter((f) => {
    const [lon, lat] = f.geometry?.coordinates || []
    return inMaharashtraBbox(lon, lat)
  })
  return {
    type: 'FeatureCollection',
    features,
    meta: { source: 'usgs', license: 'USGS public domain', bbox: MH_BBOX },
  }
}

export async function fetchMaharashtraFires({ mapKey, fetch: impl = globalThis.fetch, dayRange = 1 } = {}) {
  if (!mapKey) return { status: 'disabled', reason: 'FIRMS_MAP_KEY not configured', features: [] }
  const url = `https://firms.modaps.eosdis.nasa.gov/api/area/csv/${encodeURIComponent(mapKey)}/VIIRS_SNPP_NRT/${FIRMS_AREA}/${dayRange}`
  const response = await fetchText(url, {
    fetch: impl,
    expectedContentTypes: ['text/csv', 'text/plain', 'application/csv', 'application/octet-stream'],
    maxBytes: 512_000,
    timeoutMs: 12_000,
  })
  if (!response.ok) throw new Error(`FIRMS HTTP ${response.status}`)
  const lines = response.text.trim().split(/\r?\n/)
  if (lines.length < 2) return { status: 'healthy', type: 'FeatureCollection', features: [], meta: { source: 'nasa-firms' } }
  const headers = lines[0].split(',')
  const latIdx = headers.indexOf('latitude')
  const lonIdx = headers.indexOf('longitude')
  const features = []
  for (const line of lines.slice(1)) {
    const cols = line.split(',')
    const lat = Number(cols[latIdx])
    const lon = Number(cols[lonIdx])
    if (!inMaharashtraBbox(lon, lat)) continue
    features.push({
      type: 'Feature',
      properties: { layer: 'firms-viirs', brightness: cols[headers.indexOf('bright_ti4')] || '' },
      geometry: { type: 'Point', coordinates: [lon, lat] },
    })
  }
  return { status: 'healthy', type: 'FeatureCollection', features, meta: { source: 'nasa-firms', bbox: MH_BBOX } }
}

export async function buildSituationalSnapshot({ enabled, firmsKey, fetch: impl = globalThis.fetch, now = Date.now() } = {}) {
  if (!enabled) return { enabled: false }
  if (cache.payload && now - cache.at < CACHE_MS) return cache.payload
  const sources = { usgs: { status: 'unknown' }, firms: { status: 'unknown' } }
  let quakes = { type: 'FeatureCollection', features: [] }
  let fires = { type: 'FeatureCollection', features: [] }
  try {
    quakes = await fetchMaharashtraQuakes({ fetch: impl, now })
    sources.usgs = { status: 'healthy', count: quakes.features.length, checkedAt: new Date(now).toISOString() }
  } catch (error) {
    sources.usgs = { status: 'degraded', error: error.message?.slice(0, 120) || 'unavailable' }
  }
  try {
    const firm = await fetchMaharashtraFires({ mapKey: firmsKey, fetch: impl })
    if (firm.status === 'disabled') sources.firms = { status: 'disabled', reason: firm.reason }
    else {
      fires = firm
      sources.firms = { status: 'healthy', count: firm.features.length, checkedAt: new Date(now).toISOString() }
    }
  } catch (error) {
    sources.firms = { status: 'degraded', error: error.message?.slice(0, 120) || 'unavailable' }
  }
  const payload = {
    enabled: true,
    unofficial: true,
    disclaimer: situationalDisclaimer(),
    generatedAt: new Date(now).toISOString(),
    bbox: MH_BBOX,
    quakes,
    fires,
    sources,
  }
  cache = { at: now, payload }
  return payload
}

export function resetSituationalCache() {
  cache = { at: 0, payload: null }
}
