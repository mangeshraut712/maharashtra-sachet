import { createServer } from 'node:http'
import { readFile } from 'node:fs/promises'
import { extname, resolve, sep } from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'
import { collectSnapshot, emptyState, handleApi, jsonResponse, SECURITY_HEADERS, sourceCollectors } from './service.mjs'

const WEB = fileURLToPath(new URL('../web', import.meta.url))
const MIME = { '.html': 'text/html; charset=utf-8', '.css': 'text/css; charset=utf-8', '.js': 'application/javascript; charset=utf-8', '.json': 'application/json; charset=utf-8', '.webmanifest': 'application/manifest+json', '.svg': 'image/svg+xml', '.png': 'image/png', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.ico': 'image/x-icon', '.pptx': 'application/vnd.openxmlformats-officedocument.presentationml.presentation' }

export function boundedInteger(value, fallback, min, max) {
  if (value === undefined || value === '') return fallback
  if (!/^\d+$/.test(String(value))) throw new Error('Invalid numeric configuration')
  const parsed = Number(value)
  if (!Number.isSafeInteger(parsed) || parsed < min || parsed > max) throw new Error('Numeric configuration out of range')
  return parsed
}

export function createRelay({ collectors = sourceCollectors(), initialState = emptyState() } = {}) {
  let state = initialState
  let pending = null
  function pollOnce() {
    if (!pending) pending = collectSnapshot(state, collectors).then(next => { state = next; return next }).finally(() => { pending = null })
    return pending
  }
  return { pollOnce, getState: () => state }
}

export function createRelayServer({ relay = createRelay(), webRoot = WEB, environment = 'local', controlHandler = null, now = () => Date.now() } = {}) {
  return createServer(async (req, res) => {
    try {
      const request = new Request(new URL(req.url || '/', 'http://localhost'), { method: req.method || 'GET' })
      let response = controlHandler ? await controlHandler(request) : null
      if (!response) response = handleApi(request, relay.getState(), { environment, now: now() })
      if (!response) {
        if (!['GET', 'HEAD'].includes(request.method)) response = jsonResponse(405, { error: 'Method not allowed' }, { allow: 'GET, HEAD' })
        else {
          let pathname
          try { pathname = decodeURIComponent(new URL(request.url).pathname) } catch { response = jsonResponse(400, { error: 'Invalid path' }) }
          if (!response) {
            const root = resolve(webRoot)
            const path = resolve(root, '.' + (pathname === '/' ? '/index.html' : pathname))
            if (!path.startsWith(root + sep) || pathname.includes('\0') || pathname.includes('\\')) response = jsonResponse(400, { error: 'Invalid path' })
            else {
              try {
                const data = await readFile(path)
                response = new Response(data, { headers: { ...SECURITY_HEADERS, 'content-type': MIME[extname(path)] || 'application/octet-stream', 'cache-control': 'no-cache' } })
              } catch { response = jsonResponse(404, { error: 'Not found' }) }
            }
          }
        }
      }
      res.writeHead(response.status, Object.fromEntries(response.headers))
      res.end(request.method === 'HEAD' ? undefined : Buffer.from(await response.arrayBuffer()))
    } catch {
      res.writeHead(500, { ...SECURITY_HEADERS, 'content-type': 'application/json', 'cache-control': 'no-store' })
      res.end('{"error":"Internal server error"}')
    }
  })
}

export function startServer(env = process.env) {
  const port = boundedInteger(env.PORT, 8787, 1, 65535)
  const interval = boundedInteger(env.POLL_MS, 60_000, 10_000, 3_600_000)
  const collectors = sourceCollectors({ apiKey: env.DATA_GOV_IN_API_KEY, cpcbEnabled: env.CPCB_ENABLED ? env.CPCB_ENABLED === 'true' : Boolean(env.DATA_GOV_IN_API_KEY), aqiCities: env.AQI_CITIES?.split(',').map(s => s.trim()).filter(Boolean) })
  const relay = createRelay({ collectors })
  const environment = env.DEMO === '1' || env.ENVIRONMENT === 'demo' ? 'demo' : env.ENVIRONMENT || 'local'
  const server = createRelayServer({ relay, environment })
  let timer
  const poll = async () => {
    try { await relay.pollOnce() } catch { console.error(JSON.stringify({ event: 'ingestion_failed' })) }
    if (server.listening) timer = setTimeout(poll, interval)
  }
  server.on('close', () => clearTimeout(timer))
  server.listen(port, '127.0.0.1', () => {
    console.log(`Unofficial Maharashtra civic relay http://127.0.0.1:${port}`)
    void poll()
  })
  return server
}

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) startServer()
