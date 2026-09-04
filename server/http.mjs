import https from 'node:https'

const DEFAULT_UA =
  'MaharashtraSachet/0.1 (civic CAP relay; +https://github.com/mangeshraut712/maharashtra-sachet)'

const sachetJar = { cookie: '' }

export async function fetchText(url, options = {}) {
  const headers = {
    'user-agent': options.userAgent || DEFAULT_UA,
    accept: options.accept || '*/*',
    ...options.headers,
  }
  if (options.referer) headers.referer = options.referer
  if (options.etag) headers['if-none-match'] = options.etag
  if (options.cookie) headers.cookie = options.cookie

  const signal =
    options.signal || (options.timeoutMs ? AbortSignal.timeout(options.timeoutMs) : undefined)

  const response = await fetch(url, {
    headers,
    redirect: 'follow',
    signal,
  })

  return {
    ok: response.ok,
    status: response.status,
    etag: response.headers.get('etag'),
    text: response.status === 304 ? '' : await response.text(),
  }
}

export async function ensureSachetSession() {
  if (sachetJar.cookie) return sachetJar.cookie
  const home = await fetch('https://sachet.ndma.gov.in/', {
    headers: { 'user-agent': DEFAULT_UA },
    redirect: 'follow',
  })
  const cookies = home.headers.getSetCookie?.() || []
  sachetJar.cookie = cookies.map(c => c.split(';')[0]).join('; ')
  return sachetJar.cookie
}

export async function sachetGet(url, extra = {}) {
  const cookie = await ensureSachetSession()
  return fetchText(url, {
    referer: 'https://sachet.ndma.gov.in/',
    cookie,
    etag: extra.etag,
    accept: extra.accept || 'application/xml,text/xml,*/*',
  })
}

export async function fetchTextRelaxedTls(url) {
  return new Promise((resolve, reject) => {
    const req = https.request(
      url,
      {
        method: 'GET',
        rejectUnauthorized: false,
        headers: { 'user-agent': DEFAULT_UA, accept: 'application/json' },
      },
      res => {
        const chunks = []
        res.on('data', c => chunks.push(c))
        res.on('end', () => {
          resolve({
            ok: res.statusCode >= 200 && res.statusCode < 300,
            status: res.statusCode,
            text: Buffer.concat(chunks).toString('utf8'),
          })
        })
      },
    )
    req.on('error', reject)
    req.end()
  })
}
