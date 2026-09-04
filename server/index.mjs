import { createServer } from 'node:http'
import { readFile } from 'node:fs/promises'
import { extname, join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import { collectSachet } from './sachet.mjs'
import { collectImdNowcast } from './imd.mjs'
import { collectIncois } from './incois.mjs'
import { collectCpcb } from './cpcb.mjs'
import { collectCwc } from './cwc.mjs'
import { mergeAlerts, snapshotStats } from './merge.mjs'
import { DISTRICTS, HELPLINES, OFFICIAL_LINKS } from './districts.mjs'
import { SITUATION_KINDS, WEA_CLASSES } from './wea.mjs'

const __dirname = dirname(fileURLToPath(import.meta.url))
const WEB = join(__dirname, '..', 'web')
const PORT = Number(process.env.PORT || 8787)
const POLL_MS = Number(process.env.POLL_MS || 45_000)
const AQI_CITIES = String(process.env.AQI_CITIES || 'Mumbai,Pune,Nagpur,Nashik,Thane,Aurangabad,Kolhapur,Solapur')
  .split(',')
  .map((s) => s.trim())
  .filter(Boolean)

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.webmanifest': 'application/manifest+json',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.ico': 'image/x-icon',
}

let lastSachet = []
let snapshot = {
  generatedAt: null,
  alerts: [],
  stats: { total: 0, byClass: {}, byKind: {}, districtsCovered: 0 },
  sources: {},
  errors: [],
  polling: false,
}

async function safe(name, fn) {
  try {
    const value = await fn()
    return { name, ok: true, value }
  } catch (err) {
    return { name, ok: false, error: err instanceof Error ? err.message : String(err), value: [] }
  }
}

async function pollOnce() {
  const errors = []
  const sources = {}
  const groups = []

  const sachet = await safe('sachet', collectSachet)
  if (sachet.ok) {
    if (sachet.value.unchanged) {
      sources.sachet = { ok: true, unchanged: true, count: lastSachet.length }
      groups.push(lastSachet)
    } else {
      lastSachet = sachet.value.alerts || []
      sources.sachet = { ok: true, unchanged: false, count: lastSachet.length }
      groups.push(lastSachet)
    }
  } else {
    sources.sachet = { ok: false, count: lastSachet.length, error: sachet.error }
    errors.push({ source: 'sachet', error: sachet.error })
    groups.push(lastSachet)
  }

  const imd = await safe('imd', collectImdNowcast)
  sources.imd = { ok: imd.ok, count: imd.ok ? imd.value.length : 0, error: imd.error }
  if (imd.ok) groups.push(imd.value)
  else errors.push({ source: 'imd', error: imd.error })

  const incois = await safe('incois', collectIncois)
  sources.incois = { ok: incois.ok, count: incois.ok ? incois.value.length : 0, error: incois.error }
  if (incois.ok) groups.push(incois.value)
  else errors.push({ source: 'incois', error: incois.error })

  const cwc = await safe('cwc', collectCwc)
  sources.cwc = { ok: cwc.ok, count: cwc.ok ? cwc.value.length : 0, error: cwc.error }
  if (cwc.ok) groups.push(cwc.value)
  else errors.push({ source: 'cwc', error: cwc.error })

  const key = process.env.DATA_GOV_IN_API_KEY
  if (key) {
    const cpcb = await safe('cpcb', () => collectCpcb(key, AQI_CITIES))
    sources.cpcb = { ok: cpcb.ok, count: cpcb.ok ? cpcb.value.length : 0, error: cpcb.error }
    if (cpcb.ok) groups.push(cpcb.value)
    else errors.push({ source: 'cpcb', error: cpcb.error })
  } else {
    sources.cpcb = { ok: true, skipped: true, count: 0, reason: 'DATA_GOV_IN_API_KEY unset' }
  }

  const alerts = mergeAlerts(groups)
  snapshot = {
    generatedAt: new Date().toISOString(),
    alerts,
    stats: snapshotStats(alerts),
    sources,
    errors,
    polling: true,
  }
  const top = alerts[0]
  console.error(
    `[poll] ${alerts.length} alerts | sachet=${sources.sachet.count} imd=${sources.imd.count} incois=${sources.incois.count} cwc=${sources.cwc.count} cpcb=${sources.cpcb.count}${sources.cpcb.skipped ? ' (no key)' : ''} | top=${top ? `${top.weaClass} ${top.headlineEn || top.event}` : 'none'}`,
  )
}

function json(res, status, body) {
  res.writeHead(status, {
    'content-type': 'application/json; charset=utf-8',
    'cache-control': 'no-store',
    'access-control-allow-origin': '*',
  })
  res.end(JSON.stringify(body))
}

async function serveStatic(res, pathname) {
  let rel = pathname === '/' ? '/index.html' : pathname
  if (rel.includes('..')) {
    res.writeHead(400)
    res.end('bad path')
    return
  }
  const file = join(WEB, rel.replace(/^\//, ''))
  if (!file.startsWith(WEB)) {
    res.writeHead(403)
    res.end('forbidden')
    return
  }
  try {
    const buf = await readFile(file)
    const type = MIME[extname(file)] || 'application/octet-stream'
    res.writeHead(200, { 'content-type': type, 'cache-control': 'no-cache' })
    res.end(buf)
  } catch {
    res.writeHead(404, { 'content-type': 'text/plain; charset=utf-8' })
    res.end('not found')
  }
}

const server = createServer(async (req, res) => {
  const url = new URL(req.url || '/', `http://${req.headers.host || 'localhost'}`)
  const path = url.pathname

  if (path === '/api/health') {
    json(res, 200, {
      ok: true,
      unofficial: true,
      generatedAt: snapshot.generatedAt,
      polling: snapshot.polling,
      stats: snapshot.stats,
    })
    return
  }

  if (path === '/api/meta') {
    json(res, 200, {
      unofficial: true,
      disclaimer:
        'Civic relay of public government feeds. Not NDMA, MSDMA, IMD, CWC, INCOIS, CPCB, or any telecom operator. Cannot send Wireless Emergency Alerts or cell broadcasts.',
      helplines: HELPLINES,
      links: OFFICIAL_LINKS,
      districts: DISTRICTS.map((d) => ({
        id: d.id,
        en: d.en,
        mr: d.mr,
        division: d.division,
        lgd: d.lgd,
      })),
      weaClasses: Object.values(WEA_CLASSES).map((c) => ({ id: c.id, en: c.en, mr: c.mr, hint: c.hint })),
      situationKinds: SITUATION_KINDS.map(([id, en]) => ({ id, en })),
    })
    return
  }

  if (path === '/api/alerts') {
    const district = url.searchParams.get('district')?.toLowerCase()
    const weaClass = url.searchParams.get('class')?.toUpperCase()
    const kind = url.searchParams.get('kind')
    const source = url.searchParams.get('source')
    const limit = Math.min(500, Math.max(1, Number(url.searchParams.get('limit') || 200)))
    let alerts = snapshot.alerts
    if (district) alerts = alerts.filter((a) => (a.districts || []).some((d) => d.id === district))
    if (weaClass) alerts = alerts.filter((a) => a.weaClass === weaClass)
    if (kind) alerts = alerts.filter((a) => a.kind === kind)
    if (source) alerts = alerts.filter((a) => a.source === source)
    json(res, 200, {
      generatedAt: snapshot.generatedAt,
      stats: snapshot.stats,
      sources: snapshot.sources,
      errors: snapshot.errors,
      count: alerts.length,
      alerts: alerts.slice(0, limit),
    })
    return
  }

  if (path === '/api/alerts/live') {
    res.writeHead(200, {
      'content-type': 'text/event-stream',
      'cache-control': 'no-cache',
      connection: 'keep-alive',
      'access-control-allow-origin': '*',
    })
    const send = () => {
      res.write(
        `data: ${JSON.stringify({
          generatedAt: snapshot.generatedAt,
          stats: snapshot.stats,
          count: snapshot.alerts.length,
          alerts: snapshot.alerts.slice(0, 80),
        })}\n\n`,
      )
    }
    send()
    const t = setInterval(send, 15_000)
    req.on('close', () => clearInterval(t))
    return
  }

  await serveStatic(res, path)
})

server.listen(PORT, '0.0.0.0', async () => {
  console.error(`Maharashtra civic alert relay http://127.0.0.1:${PORT}`)
  console.error('UNOFFICIAL — relays public CAP / IMD / INCOIS / CWC / CPCB. Does not send cell broadcasts.')
  await pollOnce()
  setInterval(() => {
    pollOnce().catch((err) => console.error('poll failed', err))
  }, POLL_MS)
})
