import { collectSnapshot, emptyState, handleApi, jsonResponse, SECURITY_HEADERS, snapshotNeedsIngest, sourceCollectors } from '../server/service.mjs'
import { acquireLease, readState, releaseLease, saveState } from './storage'

export async function ingest(env: Env, collectors?: ReturnType<typeof sourceCollectors>): Promise<{ status: string }> {
  const token = crypto.randomUUID()
  if (!await acquireLease(env.DB, token, Date.now())) return { status: 'already-running' }
  try {
    const previous = await readState(env.DB)
    const apiKey = 'DATA_GOV_IN_API_KEY' in env && typeof env.DATA_GOV_IN_API_KEY === 'string' ? env.DATA_GOV_IN_API_KEY : undefined
    const next = await collectSnapshot(previous, collectors || sourceCollectors({ apiKey, cpcbEnabled: String(env.CPCB_ENABLED) === 'true' }))
    if (!await saveState(env.DB, token, next)) throw new Error('Ingestion lease expired')
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
      if (path === '/api' || path.startsWith('/api/')) {
        if (request.method !== 'GET' && request.method !== 'HEAD') return jsonResponse(405, { error: 'Method not allowed' }, { allow: 'GET, HEAD', ...(new URL(request.url).protocol === 'https:' ? { 'strict-transport-security': 'max-age=31536000' } : {}) })
        const staticApi = /^\/api(?:\/v1)?\/(?:meta|locations)$/.test(path)
        const state = staticApi ? emptyState() : await readState(env.DB)
        if (!staticApi) maybeScheduleRecovery(env, state, ctx)
        const response = handleApi(request, state, { environment: env.ENVIRONMENT }) || jsonResponse(404, { error: 'Not found' })
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
