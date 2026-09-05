const DEFAULT_UA = 'MaharashtraSachet/0.1 (unofficial civic CAP relay)'
const ALLOWED_PATHS = {
  'sachet.ndma.gov.in': /^\/(?:$|cap_public_website\/)/,
  'mausam.imd.gov.in': /^\/imd_latest\/contents\/dist_nowcast_rss\.php$/,
  'tsunami.incois.gov.in': /^\/itews\/DSSProducts\/OPR\/past90days\.json$/,
  'ffs.india-water.gov.in': /^\/iam\/api\/new-alert-public$/,
  'api.data.gov.in': /^\/resource\/3b01bcb8-0b14-4abf-b6f2-c1bfd384ba69$/,
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
  if (options.cookie) headers.cookie = options.cookie
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
export async function ensureSachetSession(options = {}) {
  const home = await fetchText('https://sachet.ndma.gov.in/', options)
  if (!home.ok) throw new Error(`SACHET session HTTP ${home.status}`)
  return (home.headers.getSetCookie?.() || []).map(cookie => cookie.split(';')[0]).join('; ')
}
export async function sachetGet(url, options = {}) {
  if (assertAllowedUrl(url).hostname !== 'sachet.ndma.gov.in') throw new Error('SACHET URL not allowed')
  const cookie = options.cookie ?? await ensureSachetSession(options)
  return fetchText(url, { ...options, cookie, referer:'https://sachet.ndma.gov.in/', accept:'application/xml,text/xml,application/rss+xml', expectedContentTypes:['application/xml','text/xml','application/rss+xml'] })
}
// Compatibility name only: TLS verification remains mandatory.
export const fetchTextRelaxedTls = fetchText
