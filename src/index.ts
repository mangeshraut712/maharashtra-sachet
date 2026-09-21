import { collectSnapshot, emptyState, handleApi, jsonResponse, publicSnapshot, SECURITY_HEADERS, snapshotNeedsIngest, sourceCollectors } from '../server/service.mjs'
import { acquireLease, appendJevShadowEntries, readRecentJevShadowEntries, readState, releaseLease, saveState } from './storage'
import { jevShadowEnabled, triageAlertShadow } from '../server/jev-shadow.mjs'

export async function ingest(env: Env, collectors?: ReturnType<typeof sourceCollectors>): Promise<{ status: string }> {
  const token = crypto.randomUUID()
  if (!await acquireLease(env.DB, token, Date.now())) return { status: 'already-running' }
  try {
    const previous = await readState(env.DB)
    const apiKey = 'DATA_GOV_IN_API_KEY' in env && typeof env.DATA_GOV_IN_API_KEY === 'string' ? env.DATA_GOV_IN_API_KEY : undefined
    const next = await collectSnapshot(previous, collectors || sourceCollectors({ apiKey, cpcbEnabled: String(env.CPCB_ENABLED) === 'true' }))
    if (!await saveState(env.DB, token, next)) throw new Error('Ingestion lease expired')
    if (jevShadowEnabled(env)) {
      const { alerts } = publicSnapshot(next, Date.now())
      const generatedAt = next.generatedAt || new Date().toISOString()
      const entries = []
      for (const alert of alerts) {
        const payload = await triageAlertShadow(alert, env)
        entries.push({ alertKey: payload.alertKey, generatedAt, payload })
        console.log(JSON.stringify({ event: 'jev_shadow_triage', alertKey: payload.alertKey, provider: payload.provider }))
      }
      await appendJevShadowEntries(env.DB, entries)
    }
    console.log(JSON.stringify({ event: 'ingestion_complete', generatedAt: next.generatedAt }))
    return { status: 'completed' }
  } finally {
    await releaseLease(env.DB, token)
  }
}

export function maybeScheduleRecovery(
  env: Env,
  state: Parameters<typeof snapshotNeedsIngest>[0],
  ctx: ExecutionContext,
  runIngest: (target: Env) => Promise<{ status: string }> = ingest,
): boolean {
  if (!['production', 'staging'].includes(env.ENVIRONMENT) || !snapshotNeedsIngest(state)) return false
  ctx.waitUntil(runIngest(env).then(
    () => undefined,
    () => console.error(JSON.stringify({ event: 'recovery_ingestion_failed' })),
  ))
  return true
}

export default {
  async fetch(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
    try {
      const path = new URL(request.url).pathname
      if (path === '/api/jev/shadow') {
        if (!jevShadowEnabled(env)) return jsonResponse(404, { error: 'Jev shadow triage is disabled.' })
        const limit = Math.min(Math.max(Number(new URL(request.url).searchParams.get('limit') || 20), 1), 100)
        const entries = await readRecentJevShadowEntries(env.DB, limit)
        return jsonResponse(200, {
          unofficial: true,
          mode: 'shadow',
          disclaimer: 'Ops-only shadow triage. Does not change public CAP bulletin truth.',
          entries,
        })
      }
      if (path === '/api' || path.startsWith('/api/')) {
        if (request.method !== 'GET' && request.method !== 'HEAD') return jsonResponse(405, { error: 'Method not allowed' }, { allow: 'GET, HEAD', ...(new URL(request.url).protocol === 'https:' ? { 'strict-transport-security': 'max-age=31536000' } : {}) })
        const staticApi = /^\/api(?:\/v1)?\/(?:meta|locations)$/.test(path)
        const state = staticApi ? emptyState() : await readState(env.DB)
        if (!staticApi) maybeScheduleRecovery(env, state, ctx)
        const firmsKey = 'FIRMS_MAP_KEY' in env && typeof env.FIRMS_MAP_KEY === 'string' ? env.FIRMS_MAP_KEY : ''
        const situationalEnabled = String(env.SITUATIONAL_LAYERS_ENABLED) === 'true'
        const response = await handleApi(request, state, {
          environment: env.ENVIRONMENT,
          situationalEnabled,
          firmsMapKey: firmsKey,
          jevShadowEnabled: jevShadowEnabled(env),
        }) || jsonResponse(404, { error: 'Not found' })
        if (new URL(request.url).protocol === 'https:') response.headers.set('strict-transport-security', 'max-age=31536000')
        return response
      }
      if (request.method !== 'GET' && request.method !== 'HEAD') return jsonResponse(405, { error: 'Method not allowed' }, { allow: 'GET, HEAD' })
      const asset = await env.ASSETS.fetch(request)
      const response = new Response(asset.body, asset)
      for (const [name, value] of Object.entries(SECURITY_HEADERS)) response.headers.set(name, value)
      if (new URL(request.url).protocol === 'https:') response.headers.set('strict-transport-security', 'max-age=31536000')
      return response
    } catch {
      console.error(JSON.stringify({ event: 'request_failed' }))
      return jsonResponse(503, { error: 'Relay data temporarily unavailable', status: 'unavailable' }, new URL(request.url).protocol === 'https:' ? { 'strict-transport-security': 'max-age=31536000' } : {})
    }
  },
  async scheduled(_controller: ScheduledController, env: Env): Promise<void> {
    try {
      await ingest(env)
    } catch {
      console.error(JSON.stringify({ event: 'ingestion_failed' }))
      throw new Error('Ingestion failed')
    }
  },
} satisfies ExportedHandler<Env>
