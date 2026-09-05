import { collectSachet } from './sachet.mjs'
import { collectImdNowcast } from './imd.mjs'
import { collectIncois } from './incois.mjs'
import { collectCpcb } from './cpcb.mjs'
import { collectCwc } from './cwc.mjs'
import { mergeAlerts, snapshotStats } from './merge.mjs'
import { DISTRICTS, HELPLINES, OFFICIAL_LINKS, REGIONS, AQI_CITIES_DEFAULT, coverageFromAlerts, districtsInRegion } from './districts.mjs'
import { SITUATION_KINDS, WEA_CLASSES } from './wea.mjs'
import { SERVICE_CATEGORIES, LOCALITY_COVERAGE, searchLocalities } from './coverage-catalog.mjs'

export const SOURCE_IDS = ['sachet', 'imd', 'incois', 'cwc', 'cpcb']
export const STALE_MS = 5 * 60_000
export const MAX_SOURCE_BYTES = 900_000
export const SOURCE_ERROR_CODES = ['timeout', 'request_budget', 'invalid_cap', 'schema_invalid', 'http_error', 'tls_error', 'unavailable']
export const SECURITY_HEADERS = {
  'x-content-type-options': 'nosniff',
  'referrer-policy': 'strict-origin-when-cross-origin',
  'x-frame-options': 'DENY',
  'permissions-policy': 'camera=(), microphone=(), geolocation=()',
  'content-security-policy': "default-src 'self'; script-src 'self'; style-src 'self'; img-src 'self' data:; connect-src 'self'; font-src 'self'; object-src 'none'; base-uri 'none'; frame-ancestors 'none'; form-action 'self'",
}

export function emptyState() {
  return { generatedAt: null, sources: {} }
}

export function snapshotNeedsIngest(state, now = Date.now(), cooldownMs = 60_000) {
  if (!state?.generatedAt) return true
  const enabled = SOURCE_IDS
    .map((id) => state.sources?.[id])
    .filter((source) => !source || !['disabled', 'misconfigured'].includes(source.state))
  if (enabled.length === 0) return false
  const attempts = enabled
    .map((source) => Date.parse(source?.lastAttemptAt || ''))
    .filter(Number.isFinite)
  if (attempts.length > 0 && now - Math.max(...attempts) < cooldownMs) return false
  return enabled.some((source) => {
    if (!source) return true
    const at = Date.parse(source.lastSuccessAt || '')
    return !Number.isFinite(at) || now - at > STALE_MS
  })
}

export function classifySourceError(error) {
  // Inspect only bounded error metadata; never return or log upstream strings.
  const tlsCodes = ['UNABLE_TO_VERIFY_LEAF_SIGNATURE', 'CERT_HAS_EXPIRED', 'ERR_TLS_CERT_ALTNAME_INVALID', 'DEPTH_ZERO_SELF_SIGNED_CERT', 'SELF_SIGNED_CERT_IN_CHAIN', 'UNABLE_TO_GET_ISSUER_CERT_LOCALLY']
  let current = error
  for (let depth = 0; current && typeof current === 'object' && depth < 3; depth++) {
    const message = typeof current.message === 'string' ? current.message.slice(0, 512) : ''
    if (current.code === 'SOURCE_BUDGET_EXCEEDED') return 'request_budget'
    if (tlsCodes.includes(current.code)) return 'tls_error'
    if (['TimeoutError', 'AbortError'].includes(current.name) || current.code === 'ABORT_ERR' || message === 'Upstream timeout' || message === 'Upstream request aborted') return 'timeout'
    if (/^(?:Invalid (?:SACHET )?CAP |Inconsistent CAP info )/.test(message)) return 'invalid_cap'
    if (/^(?:(?:SACHET (?:session|RSS|CAP|polygon)|IMD RSS|INCOIS|CPCB) HTTP \d{3})$/.test(message)) return 'http_error'
    if (/^(?:Invalid (?:upstream XML|IMD XML|IMD RSS schema|SACHET RSS schema|SACHET polygon schema)|Unsupported (?:CPCB schema|INCOIS catalog schema)|Unexpected upstream content type|Upstream body too large|Snapshot exceeds storage budget|Invalid collector response)$/.test(message) || current.name === 'SyntaxError') return 'schema_invalid'
    current = current.cause
  }
  return 'unavailable'
}

export function sourceCollectors(config = {}) {
  const key = config.apiKey
  const enabled = config.cpcbEnabled ?? Boolean(key)
  return [
    { id: 'sachet', collect: collectSachet },
    { id: 'imd', collect: collectImdNowcast },
    { id: 'incois', collect: collectIncois },
    { id: 'cwc', collect: collectCwc },
    { id: 'cpcb', state: !enabled ? 'disabled' : !key ? 'misconfigured' : null,
      collect: () => collectCpcb(key, config.aqiCities || AQI_CITIES_DEFAULT) },
  ]
}

// Lifecycle records must survive a later successful feed omitting the cancellation.
export function retainLifecycle(previous, incoming) {
  const records = new Map()
  for (const alert of previous) {
    if (['Cancel', 'Update'].includes(alert.msgType)) records.set(`${alert.source}:${alert.id}`, alert)
  }
  for (const alert of incoming) {
    const key = `${alert.source}:${alert.id}`
    const previous = records.get(key)
    if (!previous || Date.parse(alert.sent) >= Date.parse(previous.sent)) records.set(key, alert)
  }
  return [...records.values()]
}

export async function collectSnapshot(previous, collectors = sourceCollectors(), { now = Date.now(), concurrency = 3 } = {}) {
  const sources = { ...previous.sources }
  let cursor = 0
  async function run() {
    while (cursor < collectors.length) {
      const collector = collectors[cursor++]
      const old = previous.sources[collector.id]
      const base = { records: old?.records || [], lastSuccessAt: old?.lastSuccessAt || null, lastAttemptAt: new Date(now).toISOString() }
      if (old?.capCache) base.capCache = old.capCache
      if (collector.state) {
        sources[collector.id] = { ...base, state: collector.state, error: null, errorCode: null }
        continue
      }
      try {
        const result = await collector.collect({ cache: old?.capCache })
        if (result?.unchanged && !old?.lastSuccessAt) throw new Error('No previous snapshot')
        const incoming = Array.isArray(result) ? result : result?.unchanged ? base.records : result?.alerts
        if (!Array.isArray(incoming)) throw new Error('Invalid collector response')
        const records = retainLifecycle(base.records, incoming)
        const next = { ...base, records, state: 'healthy', error: null, errorCode: null, lastSuccessAt: new Date(now).toISOString() }
        if (result?.cache) next.capCache = result.cache
        if (new TextEncoder().encode(JSON.stringify(next)).length > MAX_SOURCE_BYTES) throw new Error('Snapshot exceeds storage budget')
        sources[collector.id] = next
      } catch (error) {
        // Collector exceptions may include upstream URLs containing credentials.
        const state = error?.code === 'SOURCE_DISABLED' ? 'disabled' : error?.code === 'SOURCE_MISCONFIGURED' ? 'misconfigured' : 'degraded'
        const errorCode = state === 'degraded' ? classifySourceError(error) : null
        if (errorCode) console.warn(JSON.stringify({ event: 'source_refresh_failed', source: SOURCE_IDS.includes(collector.id) ? collector.id : 'unknown', code: errorCode }))
        sources[collector.id] = { ...base, state, errorCode, error: state === 'disabled' ? 'Direct warning integration unavailable; consult the official source.' : 'Official source could not be refreshed; last successful data retained.' }
      }
    }
  }
  await Promise.all(Array.from({ length: Math.min(collectors.length, Math.max(1, concurrency)) }, run))
  return { generatedAt: new Date(now).toISOString(), sources }
}

export function publicSnapshot(state, now = Date.now()) {
  const sources = Object.fromEntries(SOURCE_IDS.map(id => {
    const source = state.sources[id]
    const lastSuccessAt = source?.lastSuccessAt || null
    const ageMs = lastSuccessAt ? Math.max(0, now - Date.parse(lastSuccessAt)) : null
    const status = !source ? 'uninitialized' : ['disabled', 'misconfigured'].includes(source.state) ? source.state
      : ageMs !== null && ageMs > STALE_MS ? 'stale' : source.state
    return [id, { status, ok: status === 'healthy', count: source?.records?.length || 0, lastSuccessAt, lastAttemptAt: source?.lastAttemptAt || null, ageMs, error: source?.error || null, errorCode: SOURCE_ERROR_CODES.includes(source?.errorCode) ? source.errorCode : null }]
  }))
  const alerts = mergeAlerts(Object.values(state.sources).filter(s => !['disabled', 'misconfigured'].includes(s.state)).map(s => s.records), { now })
  const activeSources = Object.values(sources).filter(s => s.status !== 'disabled')
  const status = !state.generatedAt ? 'uninitialized' : activeSources.some(s => s.status === 'stale') ? 'stale'
    : activeSources.every(s => s.status === 'healthy') ? 'healthy' : 'degraded'
  return {
    generatedAt: state.generatedAt, status, polling: Boolean(state.generatedAt), alerts,
    stats: snapshotStats(alerts), sources,
    errors: Object.entries(sources).filter(([, s]) => !['healthy', 'disabled'].includes(s.status)).map(([source, s]) => ({ source, error: s.error || s.status })),
  }
}

export function jsonResponse(status, body, extraHeaders = {}) {
  return new Response(JSON.stringify(body), { status, headers: { ...SECURITY_HEADERS, 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store', ...extraHeaders } })
}

function integerParam(params, key, fallback, min, max) {
  if (!params.has(key)) return fallback
  const raw = params.get(key)
  if (!/^\d+$/.test(raw)) throw new Error(`Invalid ${key}`)
  const value = Number(raw)
  if (!Number.isSafeInteger(value) || value < min || value > max) throw new Error(`Invalid ${key}`)
  return value
}

function enumParam(params, name, allowed, transform = value => value) {
  if (!params.has(name)) return null
  const value = transform(params.get(name))
  if (!allowed.includes(value)) throw new Error(`Invalid ${name}`)
  return value
}

function snapshotVersion(snapshot) {
  // A revision token, not an authentication token. Expiry also invalidates pages.
  let hash = 2166136261
  for (const char of snapshot.alerts.map(a => `${a.source}:${a.id}`).join('\n')) hash = Math.imul(hash ^ char.charCodeAt(0), 16777619)
  return `${snapshot.generatedAt || 'uninitialized'}:${(hash >>> 0).toString(16)}`
}

export function handleApi(request, state, { now = Date.now(), environment = 'local' } = {}) {
  const url = new URL(request.url)
  const path = url.pathname.replace(/^\/api\/v1(?=\/|$)/, '/api')
  if (!path.startsWith('/api/') && path !== '/api') return null
  if (request.method !== 'GET' && request.method !== 'HEAD') return jsonResponse(405, { error: 'Method not allowed' }, { allow: 'GET, HEAD' })
  const snapshot = publicSnapshot(state, now)
  const { alerts: allAlerts, ...summary } = snapshot
  let response
  try {
    const params = url.searchParams
    const allowedParams = path === '/api/alerts' ? ['region', 'district', 'class', 'kind', 'source', 'limit', 'offset', 'snapshot'] : path === '/api/locations' ? ['q', 'limit'] : []
    for (const key of params.keys()) if (!allowedParams.includes(key) || params.getAll(key).length !== 1) throw new Error('Invalid query parameters')
    if (path === '/api/health') {
      response = jsonResponse(snapshot.status === 'healthy' ? 200 : 503, { ok: snapshot.status === 'healthy', unofficial: true, environment, ...summary })
    } else if (path === '/api/meta') {
      response = jsonResponse(200, {
        unofficial: true, apiVersion: 1, environment,
        disclaimer: 'Independent civic relay of public government feeds. Not a government agency. Cannot send Wireless Emergency Alerts or cell broadcasts.',
        delivery: { mode: 'polling', intervalMs: 60_000, staleIntervalMs: 15_000, webPush: 'unavailable', websocket: 'unavailable' },
        helplines: HELPLINES, links: OFFICIAL_LINKS,
        districts: DISTRICTS.map(({ id, en, mr, division, lgd }) => ({ id, en, mr, division, lgd })),
        regions: REGIONS.map(({ id, en, mr, districtIds }) => ({ id, en, mr, districtIds })),
        weaClasses: Object.values(WEA_CLASSES).map(({ id, en, mr, hint }) => ({ id, en, mr, hint })),
        situationKinds: SITUATION_KINDS.map(([id, en]) => ({ id, en })),
        serviceCategories: SERVICE_CATEGORIES, localityCoverage: LOCALITY_COVERAGE,
      })
    } else if (path === '/api/alerts') {
      const limit = integerParam(params, 'limit', 200, 1, 500)
      const offset = integerParam(params, 'offset', 0, 0, 1_000_000)
      const region = enumParam(params, 'region', ['all', ...REGIONS.map(r => r.id)], s => s.toLowerCase())
      const district = enumParam(params, 'district', DISTRICTS.map(d => d.id), s => s.toLowerCase())
      const weaClass = enumParam(params, 'class', Object.keys(WEA_CLASSES), s => s.toUpperCase())
      const kind = enumParam(params, 'kind', SITUATION_KINDS.map(([id]) => id))
      const source = enumParam(params, 'source', SOURCE_IDS)
      const revision = snapshotVersion(snapshot)
      if (params.has('snapshot') && params.get('snapshot') !== revision) return jsonResponse(409, { error: 'Snapshot changed; restart pagination.' })
      let alerts = allAlerts
      if (region && region !== 'all') {
        const allowed = new Set(districtsInRegion(region).map(d => d.id))
        alerts = alerts.filter(a => (a.districts || []).some(d => allowed.has(d.id)))
      }
      if (district) alerts = alerts.filter(a => (a.districts || []).some(d => d.id === district))
      if (weaClass) alerts = alerts.filter(a => a.weaClass === weaClass)
      if (kind) alerts = alerts.filter(a => a.kind === kind)
      if (source) alerts = alerts.filter(a => a.source === source)
      const page = alerts.slice(offset, offset + limit)
      response = jsonResponse(200, { ...summary, count: alerts.length, alerts: page,
        pagination: { limit, offset, total: alerts.length, nextOffset: offset + page.length < alerts.length ? offset + page.length : null, snapshot: revision } })
    } else if (path === '/api/coverage') {
      response = jsonResponse(200, { ...summary, ...coverageFromAlerts(allAlerts), serviceCategories: SERVICE_CATEGORIES, localityCoverage: LOCALITY_COVERAGE })
    } else if (path === '/api/sources') {
      response = jsonResponse(200, summary)
    } else if (path === '/api/locations') {
      const query = (params.get('q') || '').trim()
      if (query.length < 2 || query.length > 80) throw new Error('Query must contain 2 to 80 characters')
      const limit = integerParam(params, 'limit', 20, 1, 20)
      response = jsonResponse(200, { locations: searchLocalities(query, limit), coverage: LOCALITY_COVERAGE })
    } else if (path === '/api/alerts/live') {
      response = jsonResponse(410, { error: 'Live streaming is unavailable. Poll /api/alerts every 60 seconds.', intervalMs: 60_000 })
    } else response = jsonResponse(404, { error: 'Not found' })
  } catch (error) {
    response = jsonResponse(400, { error: error.message })
  }
  return request.method === 'HEAD' ? new Response(null, response) : response
}
