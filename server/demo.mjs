import { createDemoRelay } from '../demo/fixtures.mjs'
import { handleApi, jsonResponse } from './service.mjs'

export const DEMO_LABEL = 'DEMO / sample data — not live government alerts.'

export function isDemoRequest(request) {
  const url = new URL(request.url)
  return (url.pathname === '/api' || url.pathname.startsWith('/api/')) &&
    url.pathname !== '/api/explain' && url.searchParams.get('demo') === '1'
}

// The demo has its own in-memory snapshot. Never read or write live storage,
// query collectors, or enable optional overlays when serving this path.
export async function handleDemoApi(request, { now = Date.now(), relay = null, controls = false } = {}) {
  const url = new URL(request.url)
  if (url.searchParams.has('demo') && (url.searchParams.getAll('demo').length !== 1 || url.searchParams.get('demo') !== '1')) {
    const response = jsonResponse(400, { error: 'Invalid query parameters', demo: true, demoLabel: DEMO_LABEL })
    return request.method === 'HEAD' ? new Response(null, response) : response
  }
  url.searchParams.delete('demo')
  // Keep paging tokens stable for requests in the same minute. Normal snapshot
  // restart handling covers the minute boundary, just as it does live updates.
  const fixtureTime = Math.floor(now / 60_000) * 60_000
  const state = relay ? relay.getState() : createDemoRelay(() => fixtureTime).getState()
  const method = request.method === 'HEAD' ? 'GET' : request.method
  const response = await handleApi(new Request(url, { method }), state, { now, environment: 'demo' })
  if (!response) return null
  const body = await response.json()
  Object.assign(body, { unofficial: true, environment: 'demo', demo: true, demoLabel: DEMO_LABEL, demoControls: controls })
  if (body.disclaimer) body.disclaimer = `${DEMO_LABEL} Independent civic project. In danger call 112. Empty does not mean all-clear.`
  if (body.sources) {
    for (const source of Object.values(body.sources)) {
      source.demo = true
      source.label = 'DEMO / sample source data'
    }
  }
  if (body.alerts) {
    body.alerts = body.alerts.map(alert => ({
      ...alert, status: 'Test', official: false, demo: true, sourceLabel: 'DEMO / sample data',
    }))
  }
  const labelled = jsonResponse(response.status, body, Object.fromEntries(response.headers))
  labelled.headers.set('x-sachet-data-mode', 'demo')
  return request.method === 'HEAD' ? new Response(null, labelled) : labelled
}
