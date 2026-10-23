export type SourceId = 'sachet' | 'imd' | 'incois' | 'cwc' | 'cpcb'

export type SourceErrorCode =
  | 'timeout'
  | 'request_budget'
  | 'invalid_cap'
  | 'schema_invalid'
  | 'http_error'
  | 'tls_error'
  | 'unavailable'

export type AlertRecord = {
  id: string
  source?: string
  kind?: string
  msgType?: string
  sent?: string
  expires?: string
  weaClass?: string
  headlineEn?: string
  headlineMr?: string
  description?: string
  instruction?: string
  districts?: { id?: string }[]
  languages?: { language?: string; headline?: string; description?: string; instruction?: string }[]
}

export type CapCacheEntry = { etag: string; xml: string }

export type SourceState = {
  records: AlertRecord[]
  state: string
  lastSuccessAt: string | null
  lastAttemptAt: string | null
  error: string | null
  errorCode?: SourceErrorCode | null
  capCache?: Record<string, CapCacheEntry>
}

export type RelayState = {
  generatedAt: string | null
  sources: Record<string, SourceState>
}

export type SourceCollector = {
  id: string
  state?: string | null
  collect: (input?: { cache?: Record<string, CapCacheEntry> }) => Promise<unknown>
}

export type PublicSourceStatus = {
  status: string
  ok: boolean
  count: number
  lastSuccessAt: string | null
  lastAttemptAt: string | null
  ageMs: number | null
  error: string | null
  errorCode: string | null
}

export type PublicSnapshot = {
  generatedAt: string | null
  status: string
  polling: boolean
  alerts: AlertRecord[]
  stats: unknown
  sources: Record<string, PublicSourceStatus>
  errors: { source: string; error: string }[]
}

/** Ops shadow record. Known triage fields are checked; remaining keys are preserved. */
export type ShadowPayload = Record<string, unknown> & { alertKey: string }

export type JevShadowEntry = {
  alertKey: string
  generatedAt: string
  payload: ShadowPayload
}

export type ShadowEnvelope = {
  unofficial: true
  mode: 'shadow'
  public: false
  opsOnly: true
  opsBadge: { visible: boolean; publicBulletin: boolean; label: string }
  requestedModel: string
  modelAliasResolvesTo: string
  disclaimer: string
  entries: JevShadowEntry[]
}

export type ShadowEnv = {
  JEV_SHADOW_KILL?: string
  JEV_SHADOW_ENABLED?: string
  JEV_USE_LIVE?: string
  JEV_API_KEY?: string
  JEV_GATEWAY_URL?: string
  cursor?: string
}

export function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

export function parseShadowPayload(value: unknown): ShadowPayload {
  if (!isRecord(value) || typeof value.alertKey !== 'string' || value.alertKey.length === 0) {
    throw new Error('Invalid shadow payload')
  }
  const payload: ShadowPayload = { alertKey: value.alertKey }
  for (const [key, field] of Object.entries(value)) payload[key] = field
  payload.alertKey = value.alertKey
  return payload
}
