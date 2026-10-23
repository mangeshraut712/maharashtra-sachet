// Sachet Explainer: plain-language explanation of a pasted public alert.
// Built with Google AI Studio + Gemini. The Gemini key comes only from the
// Worker secret GEMINI_API_KEY; caller-supplied keys are never accepted.
import { jsonResponse } from './service.mjs'

export const DEFAULT_GEMINI_MODEL = 'gemini-3.8-flash'
export const MAX_ALERT_CHARS = 6000
export const MAX_EXPLAIN_BODY_BYTES = 20_000
export const MAX_GEMINI_RESPONSE_BYTES = 100_000
export const EXPLAIN_PER_CLIENT = 15
export const EXPLAIN_GLOBAL_LIMIT = 60
export const EXPLAIN_WINDOW_MS = 60_000
export const OFFLINE_UNCONFIGURED_NOTE = 'Gemini is not configured, so this is a simple keyword-based summary. Read the original alert.'
export const OFFLINE_UNAVAILABLE_NOTE = 'Gemini is unavailable, so this is a simple keyword-based summary. Read the original alert.'

const GEMINI_ENDPOINT = 'https://generativelanguage.googleapis.com/v1beta/models'
const MODEL_PATTERN = /^[A-Za-z0-9][A-Za-z0-9._-]{0,63}$/
const LEVELS = ['Red', 'Orange', 'Yellow', 'Green']

const LANG_BLOCK = {
  type: 'OBJECT',
  properties: {
    summary: { type: 'STRING' },
    districtImpact: { type: 'STRING' },
    safetySteps: { type: 'ARRAY', items: { type: 'STRING' } },
  },
  required: ['summary', 'districtImpact', 'safetySteps'],
}
const SCHEMA = {
  type: 'OBJECT',
  properties: {
    severity: { type: 'STRING', enum: [...LEVELS, 'Not stated'] },
    hazardType: { type: 'STRING' },
    districts: { type: 'ARRAY', items: { type: 'STRING' } },
    validity: { type: 'STRING' },
    english: LANG_BLOCK,
    marathi: LANG_BLOCK,
    hindi: LANG_BLOCK,
  },
  required: ['severity', 'hazardType', 'districts', 'validity', 'english', 'marathi', 'hindi'],
}
const SYSTEM = `You are "Sachet Explainer", a public alert simplifier for Maharashtra, India.
Explain ONLY what is in the pasted alert. Never invent dates, amounts, districts or severity.
severity: the colour level only if the alert text explicitly states Red, Orange, Yellow or Green; otherwise "Not stated".
For english, marathi (Devanagari) and hindi (Devanagari) give: a 2-line plain summary (lines separated by \\n),
what it means for someone in the named district, and exactly 3 concrete safety steps.
Use "Not stated" for validity if absent. Return strict JSON only.`

const DISTRICTS = ['Mumbai', 'Thane', 'Palghar', 'Raigad', 'Ratnagiri', 'Sindhudurg', 'Pune', 'Satara', 'Kolhapur', 'Sangli', 'Solapur', 'Nashik', 'Ahmednagar', 'Ahilyanagar', 'Dhule', 'Jalgaon', 'Nandurbar', 'Aurangabad', 'Chhatrapati Sambhajinagar', 'Jalna', 'Parbhani', 'Hingoli', 'Nanded', 'Beed', 'Latur', 'Dharashiv', 'Osmanabad', 'Amravati', 'Akola', 'Washim', 'Buldhana', 'Yavatmal', 'Nagpur', 'Wardha', 'Bhandara', 'Gondia', 'Chandrapur', 'Gadchiroli']

export function statedSeverity(text) {
  const t = String(text)
  const m = t.match(/\b(red|orange|yellow|green)\b/i) || (/लाल|रेड/.test(t) ? ['', 'red'] : /नारंगी|ऑरेंज/.test(t) ? ['', 'orange'] : /पिवळा|यलो|येलो/.test(t) ? ['', 'yellow'] : null)
  return m ? m[1][0].toUpperCase() + m[1].slice(1).toLowerCase() : 'Not stated'
}

export function fallbackExplanation(text) {
  const severity = statedSeverity(text)
  const up = text.toUpperCase()
  const districts = DISTRICTS.filter(d => new RegExp(`\\b${d}\\b`, 'i').test(text))
  let hazard = 'Public alert'
  if (/RAIN|FLOOD|पाऊस|पूर/.test(up)) hazard = 'Heavy rain / flood'
  else if (/HEAT|TEMPERATURE|LOO|उष्ण/.test(up)) hazard = 'Heatwave'
  else if (/AQI|AIR QUALITY|POLLUTION|SMOG/.test(up)) hazard = 'Air quality'
  else if (/LIGHTNING|THUNDER|HAIL|वीज/.test(up)) hazard = 'Thunderstorm / lightning'
  else if (/CYCLONE|GALE|CYCLONIC STORM/.test(up)) hazard = 'Cyclone / high winds'
  const area = districts.join(', ') || 'the area named in the alert'
  const areaMr = districts.join(', ') || 'सूचनेत नमूद भाग'
  const areaHi = districts.join(', ') || 'सूचना में बताए गए क्षेत्र'
  const lvl = severity === 'Not stated' ? 'level not stated' : `${severity} level`
  return {
    severity, hazardType: hazard, districts, validity: 'Not stated — check the original alert',
    english: {
      summary: `The pasted alert describes: ${hazard.toLowerCase()} (${lvl}) for ${area}.\nThis is an automatic keyword summary; read the original alert for exact details.`,
      districtImpact: `People in ${area} should expect possible disruption to travel, power or outdoor work and follow district administration instructions.`,
      safetySteps: [`Avoid unnecessary travel in exposed or low-lying parts of ${area}.`, 'Keep your phone charged and store drinking water and essential medicines.', 'Follow official updates (SACHET, IMD, district administration); call 112 in an emergency.'],
    },
    marathi: {
      summary: `या सूचनेत ${areaMr} साठी धोक्याचा इशारा आहे (${severity === 'Not stated' ? 'स्तर नमूद नाही' : severity + ' स्तर'}).\nहा स्वयंचलित सारांश आहे; अचूक माहितीसाठी मूळ सूचना वाचा.`,
      districtImpact: `${areaMr} मधील नागरिकांना प्रवास, वीज किंवा बाहेरील कामांत अडथळे येऊ शकतात; जिल्हा प्रशासनाच्या सूचना पाळा.`,
      safetySteps: ['धोकादायक किंवा सखल भागात विनाकारण प्रवास टाळा.', 'फोन चार्ज ठेवा आणि पिण्याचे पाणी व आवश्यक औषधे जवळ ठेवा.', 'अधिकृत सूचनांचे पालन करा; आपत्कालीन स्थितीत ११२ वर फोन करा.'],
    },
    hindi: {
      summary: `इस सूचना में ${areaHi} के लिए खतरे की चेतावनी है (${severity === 'Not stated' ? 'स्तर नहीं बताया गया' : severity + ' स्तर'}).\nयह स्वचालित सारांश है; सटीक जानकारी के लिए मूल सूचना पढ़ें।`,
      districtImpact: `${areaHi} के लोगों को यात्रा, बिजली या बाहरी काम में रुकावट हो सकती है; ज़िला प्रशासन के निर्देश मानें।`,
      safetySteps: ['जोखिम वाले या निचले इलाकों में गैर-ज़रूरी यात्रा से बचें।', 'फ़ोन चार्ज रखें और पीने का पानी व ज़रूरी दवाइयाँ पास रखें।', 'आधिकारिक अपडेट देखें; आपात स्थिति में 112 पर कॉल करें।'],
    },
  }
}

function clip(value, max) {
  return typeof value === 'string' ? value.trim().slice(0, max) : ''
}

function normalizeBlock(block) {
  if (!block || typeof block !== 'object') return null
  const summary = clip(block.summary, 600)
  const districtImpact = clip(block.districtImpact, 600)
  if (!summary || !districtImpact || !Array.isArray(block.safetySteps)) return null
  const safetySteps = block.safetySteps.map(step => clip(step, 300)).filter(Boolean).slice(0, 3)
  if (!safetySteps.length) return null
  return { summary, districtImpact, safetySteps }
}

function normalizeExplanation(data, text) {
  const english = normalizeBlock(data?.english)
  const marathi = normalizeBlock(data?.marathi)
  const hindi = normalizeBlock(data?.hindi)
  if (!english || !marathi || !hindi) return null
  const districts = Array.isArray(data.districts) ? data.districts.map(name => clip(name, 80)).filter(Boolean).slice(0, 36) : []
  return {
    severity: statedSeverity(text),
    hazardType: clip(data.hazardType, 80) || 'Public alert',
    districts,
    validity: clip(data.validity, 120) || 'Not stated',
    english, marathi, hindi,
  }
}

export function createExplainLimiter({
  windowMs = EXPLAIN_WINDOW_MS,
  perClient = EXPLAIN_PER_CLIENT,
  globalLimit = EXPLAIN_GLOBAL_LIMIT,
  now = () => Date.now(),
} = {}) {
  const clients = new Map()
  let globalHits = []
  function allow(clientKey) {
    const time = now()
    const key = String(clientKey || 'anonymous').slice(0, 128)
    const fresh = stamps => stamps.filter(stamp => time - stamp < windowMs)
    globalHits = fresh(globalHits)
    const clientHits = fresh(clients.get(key) || [])
    if (clientHits.length >= perClient || globalHits.length >= globalLimit) {
      if (clientHits.length) clients.set(key, clientHits)
      else clients.delete(key)
      return { ok: false, retryAfterSeconds: Math.max(1, Math.ceil(windowMs / 1000)) }
    }
    clientHits.push(time)
    globalHits.push(time)
    clients.set(key, clientHits)
    if (clients.size > 2000) {
      for (const [id, stamps] of clients) {
        const kept = fresh(stamps)
        if (kept.length) clients.set(id, kept)
        else clients.delete(id)
      }
      while (clients.size > 2000) {
        const oldest = clients.keys().next().value
        if (oldest === undefined) break
        clients.delete(oldest)
      }
    }
    return { ok: true }
  }
  allow.clientCount = () => clients.size
  return allow
}

const defaultExplainLimiter = createExplainLimiter()

export function explainClientKey(headerValue) {
  const value = typeof headerValue === 'string' ? headerValue.trim() : ''
  return /^[A-Za-z0-9:.]{1,64}$/.test(value) ? value : 'anonymous'
}

function safeReason(error, secrets = []) {
  if (error?.name === 'TimeoutError' || error?.name === 'AbortError') return 'timeout'
  if (error?.name === 'SyntaxError' || error?.name === 'BoundedReadError') return 'invalid_response'
  let message = String(error?.message || 'upstream_error')
  for (const secret of secrets) {
    if (typeof secret === 'string' && secret) message = message.split(secret).join('[redacted]')
  }
  return message.slice(0, 120)
}

function transportHeaders(request) {
  try {
    if (new URL(request.url).protocol === 'https:') return { 'strict-transport-security': 'max-age=31536000' }
  } catch { /* request URL is only used for the scheme */ }
  return {}
}

function isJsonContentType(value) {
  if (!value || typeof value !== 'string') return false
  const parts = value.split(';').map(part => part.trim()).filter(Boolean)
  if (!parts.length || parts[0].toLowerCase() !== 'application/json') return false
  return parts.slice(1).every(part => /^charset\s*=\s*"?utf-?8"?$/i.test(part))
}

function sameOrigin(request) {
  const origin = request.headers.get('origin')
  if (!origin) return true
  try {
    return new URL(origin).origin === new URL(request.url).origin
  } catch {
    return false
  }
}

async function readBoundedStream(stream, maxBytes) {
  if (!stream) return ''
  const reader = stream.getReader()
  const chunks = []
  let total = 0
  try {
    while (true) {
      const { done, value } = await reader.read()
      if (done) break
      total += value.byteLength
      if (total > maxBytes) {
        await reader.cancel()
        const error = new Error('too large')
        error.name = 'BoundedReadError'
        throw error
      }
      chunks.push(value)
    }
  } catch (error) {
    if (error?.name !== 'BoundedReadError') {
      try { await reader.cancel() } catch { /* stream already closed */ }
    }
    throw error
  }
  const bytes = new Uint8Array(total)
  let offset = 0
  for (const chunk of chunks) {
    bytes.set(chunk, offset)
    offset += chunk.byteLength
  }
  return new TextDecoder().decode(bytes)
}

function resolveModel(env) {
  const raw = typeof env.GEMINI_MODEL === 'string' ? env.GEMINI_MODEL.trim() : ''
  if (!raw) return { model: DEFAULT_GEMINI_MODEL, invalid: false }
  if (!MODEL_PATTERN.test(raw)) return { model: null, invalid: true }
  return { model: raw, invalid: false }
}

function offlineResult(text, note) {
  return { status: 200, body: { source: 'offline-fallback', model: null, note, data: fallbackExplanation(text) } }
}

export async function geminiExplanation(text, { apiKey, model = DEFAULT_GEMINI_MODEL, fetchImpl = globalThis.fetch, timeoutMs = 20000 }) {
  if (!MODEL_PATTERN.test(model)) throw new Error('invalid model')
  const response = await fetchImpl(`${GEMINI_ENDPOINT}/${encodeURIComponent(model)}:generateContent`, {
    method: 'POST',
    redirect: 'manual',
    headers: { 'content-type': 'application/json', 'x-goog-api-key': apiKey },
    signal: AbortSignal.timeout(timeoutMs),
    body: JSON.stringify({
      systemInstruction: { parts: [{ text: SYSTEM }] },
      contents: [{ role: 'user', parts: [{ text: `--- ALERT TEXT START ---\n${text}\n--- ALERT TEXT END ---` }] }],
      generationConfig: { temperature: 0.1, responseMimeType: 'application/json', responseSchema: SCHEMA },
    }),
  })
  if (!response.ok) {
    try { await response.body?.cancel() } catch { /* ignore a body that is already consumed */ }
    throw new Error(`Gemini HTTP ${response.status}`)
  }
  let raw
  try {
    raw = await readBoundedStream(response.body, MAX_GEMINI_RESPONSE_BYTES)
  } catch (error) {
    if (error?.name === 'BoundedReadError') throw new Error('Gemini response too large')
    throw error
  }
  let body
  try { body = JSON.parse(raw) } catch { throw new Error('Gemini returned invalid JSON') }
  const parts = body?.candidates?.[0]?.content?.parts
  let parsed
  try {
    const text = Array.isArray(parts) ? parts.map(part => (part && typeof part.text === 'string' ? part.text : '')).join('') : ''
    parsed = JSON.parse(text || 'null')
  } catch {
    throw new Error('Gemini returned invalid JSON')
  }
  const data = normalizeExplanation(parsed, text)
  if (!data) throw new Error('Gemini returned an unexpected shape')
  return data
}

// Returns a plain object { status, body }; callers wrap it with jsonResponse.
export async function explainAlert(input, env = {}, fetchImpl = globalThis.fetch) {
  if (!input || typeof input !== 'object' || Array.isArray(input)) {
    return { status: 400, body: { error: 'Expected a JSON object with alertText.' } }
  }
  if (typeof input.alertText !== 'string') return { status: 400, body: { error: 'alertText must be a string.' } }
  const text = input.alertText.trim()
  if (!text) return { status: 400, body: { error: 'Paste an alert text to explain.' } }
  if (text.length > MAX_ALERT_CHARS) return { status: 413, body: { error: `Alert text is limited to ${MAX_ALERT_CHARS} characters.` } }
  const apiKey = typeof env.GEMINI_API_KEY === 'string' ? env.GEMINI_API_KEY.trim() : ''
  const { model, invalid } = resolveModel(env)
  if (!apiKey) return offlineResult(text, OFFLINE_UNCONFIGURED_NOTE)
  if (invalid) {
    console.error(JSON.stringify({ event: 'explain_gemini_failed', reason: 'model_invalid' }))
    return offlineResult(text, OFFLINE_UNAVAILABLE_NOTE)
  }
  try {
    return { status: 200, body: { source: 'gemini', model, data: await geminiExplanation(text, { apiKey, model, fetchImpl }) } }
  } catch (error) {
    console.error(JSON.stringify({ event: 'explain_gemini_failed', model, reason: safeReason(error, [apiKey, text]) }))
    return offlineResult(text, OFFLINE_UNAVAILABLE_NOTE)
  }
}

async function dispatchExplain(request, env, options) {
  if (request.method !== 'POST') return { status: 405, body: { error: 'Method not allowed' }, headers: { allow: 'POST' } }
  if (!isJsonContentType(request.headers.get('content-type'))) return { status: 415, body: { error: 'Expected application/json' } }
  if (!sameOrigin(request)) return { status: 403, body: { error: 'Cross-origin explanation requests are not allowed.' } }
  const declared = request.headers.get('content-length')
  if (declared !== null) {
    if (!/^\d+$/.test(declared)) return { status: 400, body: { error: 'Invalid Content-Length.' } }
    if (Number(declared) > MAX_EXPLAIN_BODY_BYTES) {
      try { await request.body?.cancel() } catch { /* client may already be gone */ }
      return { status: 413, body: { error: 'Request too large' } }
    }
  }
  const allow = options.limiter || defaultExplainLimiter
  const decision = allow(options.clientKey || 'anonymous')
  if (!decision.ok) {
    return {
      status: 429,
      body: { error: 'Too many explanation requests. Wait a minute and read the original alert. In immediate danger, call 112.' },
      headers: { 'retry-after': String(decision.retryAfterSeconds) },
    }
  }
  let raw
  try {
    raw = await readBoundedStream(request.body, MAX_EXPLAIN_BODY_BYTES)
  } catch (error) {
    if (error?.name === 'BoundedReadError') return { status: 413, body: { error: 'Request too large' } }
    throw error
  }
  let input
  try { input = JSON.parse(raw) } catch { return { status: 400, body: { error: 'Invalid JSON' } } }
  const fetchImpl = options.fetchImpl || globalThis.fetch
  if (!input || typeof input !== 'object' || Array.isArray(input)) return explainAlert(input, env, fetchImpl)
  return explainAlert({ alertText: input.alertText }, env, fetchImpl)
}

export async function handleExplainRequest(request, env = {}, options = {}) {
  try {
    const result = await dispatchExplain(request, env, options)
    return jsonResponse(result.status, result.body, { ...transportHeaders(request), ...result.headers })
  } catch (error) {
    console.error(JSON.stringify({ event: 'explain_request_failed', reason: safeReason(error, [env?.GEMINI_API_KEY]) }))
    return jsonResponse(503, { error: 'Explanation is temporarily unavailable. Read the original alert. In immediate danger, call 112.' }, transportHeaders(request))
  }
}
