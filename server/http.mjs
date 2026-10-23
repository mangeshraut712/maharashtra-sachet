const DEFAULT_UA = 'Mozilla/5.0 (compatible; MaharashtraSachet/0.1; unofficial civic CAP relay; +https://github.com/mangeshraut712/maharashtra-sachet)'
const ALLOWED_PATHS = {
  'sachet.ndma.gov.in': /^\/(?:$|cap_public_website\/)/,
  'mausam.imd.gov.in': /^\/imd_latest\/contents\/dist_nowcast_rss\.php$/,
  'tsunami.incois.gov.in': /^\/itews\/DSSProducts\/OPR\/past90days\.json$/,
  'ffs.india-water.gov.in': /^\/iam\/api\/new-alert-public$/,
  'api.data.gov.in': /^\/resource\/3b01bcb8-0b14-4abf-b6f2-c1bfd384ba69$/,
  'earthquake.usgs.gov': /^\/fdsnws\/event\/1\/query$/,
  'firms.modaps.eosdis.nasa.gov': /^\/api\/area\/csv\//,
}
export function assertAllowedUrl(value) {
  let url
  try { url = new URL(value) } catch { throw new Error('Upstream URL not allowed') }
  if (url.protocol !== 'https:' || url.username || url.password || url.port || !ALLOWED_PATHS[url.hostname]?.test(url.pathname)) throw new Error('Upstream URL not allowed')
  return url
}
function beforeAbort(promise, signal) {
  return new Promise((resolve,reject) => {
    const abort = () => reject(signal.reason || new Error('Upstream request aborted'))
    if (signal.aborted) { abort(); return }
    signal.addEventListener('abort',abort,{once:true})
    promise.then(resolve,reject).finally(()=>signal.removeEventListener('abort',abort))
  })
}
export async function fetchText(value, options = {}) {
  let url = assertAllowedUrl(value)
  const initialOrigin = url.origin
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(new Error('Upstream timeout')), Math.min(options.timeoutMs ?? 10_000, 30_000))
  const signal = options.signal ? AbortSignal.any([options.signal, controller.signal]) : controller.signal
  const maxBytes = Math.min(options.maxBytes ?? 2_000_000, 5_000_000)
  const headers = { 'user-agent': DEFAULT_UA, accept: options.accept || '*/*', ...options.headers }
  if (options.referer) headers.referer = options.referer
  if (options.etag) headers['if-none-match'] = options.etag
  const cookie = safeCookieHeader(options.cookie)
  if (cookie) headers.cookie = cookie
  try {
    for (let redirects = 0; ; redirects++) {
      signal.throwIfAborted()
      const response = await beforeAbort((options.fetch || globalThis.fetch)(url.href, { headers, redirect: 'manual', signal }),signal)
      if ([301,302,303,307,308].includes(response.status)) {
        await response.body?.cancel()
        if (redirects >= 3) throw new Error('Too many upstream redirects')
        url = assertAllowedUrl(new URL(response.headers.get('location') || '', url).href)
        if (url.origin !== initialOrigin) throw new Error('Cross-origin upstream redirect not allowed')
        continue
      }
      const contentType = (response.headers.get('content-type') || '').split(';')[0].trim().toLowerCase()
      if (response.ok && options.expectedContentTypes && !options.expectedContentTypes.includes(contentType)) {
        await response.body?.cancel()
        throw new Error('Unexpected upstream content type')
      }
      if (Number(response.headers.get('content-length')) > maxBytes) { await response.body?.cancel(); throw new Error('Upstream body too large') }
      const reader = response.status === 304 ? null : response.body?.getReader()
      const decoder = new TextDecoder()
      let text = '', bytes = 0
      if (reader) {
        try {
          while (true) {
            const { done, value: chunk } = await beforeAbort(reader.read(),signal)
            if (done) break
            bytes += chunk.byteLength
            if (bytes > maxBytes) { await reader.cancel(); throw new Error('Upstream body too large') }
            text += decoder.decode(chunk, { stream: true })
          }
          text += decoder.decode()
        } catch (error) { void reader.cancel().catch(()=>{}); throw error }
        finally { reader.releaseLock() }
      }
      return { ok:response.ok, status:response.status, etag:response.headers.get('etag'), text, headers:response.headers }
    }
  } finally { clearTimeout(timer) }
}
function cookiePair(cookie) {
  const pair = String(cookie).split(';')[0].trim()
  if (!pair || /[\u0000-\u001F\u007F]/.test(pair)) return ''
  const separator = pair.indexOf('=')
  if (separator <= 0) return ''
  const name = pair.slice(0, separator)
  const value = pair.slice(separator + 1)
  // RFC 6265 token / cookie-octet. Control characters would split the next request's headers.
  if (!value || !/^[-!#$%&'*+.^_`|~0-9A-Za-z]+$/.test(name)) return ''
  if (!/^[\u0021\u0023-\u002B\u002D-\u003A\u003C-\u005B\u005D-\u007E]+$/.test(value)) return ''
  return `${name}=${value}`
}

export function safeCookieHeader(value) {
  if (typeof value !== 'string' || !value) return ''
  return value.split(';').map((part) => cookiePair(part)).filter(Boolean).join('; ')
}

export function sachetCookieHeader(headers) {
  const lines = typeof headers?.getSetCookie === 'function' ? headers.getSetCookie() : []
  return lines.map((cookie) => cookiePair(cookie)).filter(Boolean).join('; ')
}

function sachetAuthBlocked(result) {
  return Boolean(result) && !result.ok && (result.status === 401 || result.status === 403)
}

export async function ensureSachetSession(options = {}) {
  try {
    const home = await fetchText('https://sachet.ndma.gov.in/', { ...options, timeoutMs: Math.min(options.timeoutMs ?? 5_000, 5_000) })
    if (!home.ok) return ''
    return sachetCookieHeader(home.headers)
  } catch (error) {
    if (error?.code === 'SOURCE_BUDGET_EXCEEDED') throw error
    return ''
  }
}

export async function sachetGet(url, options = {}) {
  if (assertAllowedUrl(url).hostname !== 'sachet.ndma.gov.in') throw new Error('SACHET URL not allowed')
  const cookie = typeof options.cookie === 'string' ? options.cookie : ''
  const result = await fetchText(url, {
    ...options,
    cookie,
    referer: 'https://sachet.ndma.gov.in/',
    accept: 'application/xml,text/xml,application/rss+xml',
    expectedContentTypes: ['application/xml', 'text/xml', 'application/rss+xml'],
    headers: { 'accept-language': 'en-IN,en;q=0.9', ...options.headers },
  })
  const withCookie = { ...result, cookie }
  if (options.sachetAuthRetry || !sachetAuthBlocked(result)) return withCookie
  if (cookie) return sachetGet(url, { ...options, cookie: '', sachetAuthRetry: true })
  const refreshed = await ensureSachetSession(options)
  if (!refreshed) return withCookie
  return sachetGet(url, { ...options, cookie: refreshed, sachetAuthRetry: true })
}
// Compatibility name only: TLS verification remains mandatory.
export const fetchTextRelaxedTls = fetchText
