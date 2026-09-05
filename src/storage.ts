import { emptyState, MAX_SOURCE_BYTES, SOURCE_IDS, SOURCE_ERROR_CODES } from '../server/service.mjs'

export type SourceState = {
  records: Record<string, unknown>[]
  state: string
  lastSuccessAt: string | null
  lastAttemptAt: string | null
  error: string | null
  errorCode?: string | null
  capCache?: Record<string, { etag: string; xml: string }>
}
export type RelayState = { generatedAt: string | null; sources: Record<string, SourceState> }

function parseSource(payload: string): SourceState {
  const value: unknown = JSON.parse(payload)
  if (!value || typeof value !== 'object' || !('records' in value) || !Array.isArray(value.records)
      || !('state' in value) || typeof value.state !== 'string'
      || !('lastSuccessAt' in value) || !(value.lastSuccessAt === null || typeof value.lastSuccessAt === 'string')
      || !('lastAttemptAt' in value) || !(value.lastAttemptAt === null || typeof value.lastAttemptAt === 'string')
      || !('error' in value) || !(value.error === null || typeof value.error === 'string')
      || !value.records.every(record => record && typeof record === 'object' && typeof record.id === 'string')) {
    throw new Error('Invalid persisted source state')
  }
  const errorCode = 'errorCode' in value && typeof value.errorCode === 'string' && SOURCE_ERROR_CODES.includes(value.errorCode) ? value.errorCode : null
  const result: SourceState = { records: value.records, state: value.state, lastSuccessAt: value.lastSuccessAt, lastAttemptAt: value.lastAttemptAt, error: value.error, errorCode }
  if ('capCache' in value && value.capCache != null) {
    if (typeof value.capCache !== 'object' || Array.isArray(value.capCache)) throw new Error('Invalid CAP cache')
    const cache: Record<string, {etag: string; xml: string}> = {}
    for (const [url, entry] of Object.entries(value.capCache)) {
      if (!entry || typeof entry !== 'object' || !('etag' in entry) || typeof entry.etag !== 'string' || entry.etag.length > 512 || !('xml' in entry) || typeof entry.xml !== 'string') throw new Error('Invalid CAP cache')
      cache[url] = {etag: entry.etag, xml: entry.xml}
    }
    result.capCache = cache
  }
  return result
}

export async function readState(db: D1Database): Promise<RelayState> {
  // One batch reads the generation and sources from a consistent transaction.
  const results = await db.batch<Record<string, unknown>>([
    db.prepare('SELECT generated_at FROM relay_state WHERE id = 1'),
    db.prepare('SELECT source, payload FROM source_snapshots'),
  ])
  const state: RelayState = emptyState()
  const generated = results[0].results[0]?.generated_at
  state.generatedAt = typeof generated === 'string' ? generated : null
  for (const row of results[1].results) {
    if (typeof row.source !== 'string' || !SOURCE_IDS.includes(row.source) || typeof row.payload !== 'string') throw new Error('Invalid source row')
    state.sources[row.source] = parseSource(row.payload)
  }
  return state
}

export async function acquireLease(db: D1Database, token: string, now: number): Promise<boolean> {
  const result = await db.prepare('UPDATE relay_state SET lease_token = ?, lease_until = ? WHERE id = 1 AND lease_until <= ?')
    .bind(token, now + 120_000, now).run()
  return result.meta.changes === 1
}

export async function releaseLease(db: D1Database, token: string): Promise<void> {
  await db.prepare('UPDATE relay_state SET lease_token = NULL, lease_until = 0 WHERE id = 1 AND lease_token = ?').bind(token).run()
}

export async function saveState(db: D1Database, token: string, state: RelayState, now = Date.now()): Promise<boolean> {
  const statements = Object.entries(state.sources).map(([source, value]) => {
    if (!SOURCE_IDS.includes(source)) throw new Error('Unknown source')
    const payload = JSON.stringify(value)
    if (new TextEncoder().encode(payload).length > MAX_SOURCE_BYTES + 4096) throw new Error('Source state exceeds storage budget')
    return db.prepare(`INSERT INTO source_snapshots (source, payload)
      SELECT ?, ? WHERE EXISTS (SELECT 1 FROM relay_state WHERE id = 1 AND lease_token = ? AND lease_until > ?)
      ON CONFLICT(source) DO UPDATE SET payload = excluded.payload`).bind(source, payload, token, now)
  })
  statements.push(db.prepare('UPDATE relay_state SET generated_at = ?, lease_token = NULL, lease_until = 0 WHERE id = 1 AND lease_token = ? AND lease_until > ?')
    .bind(state.generatedAt, token, now))
  const results = await db.batch(statements)
  return results[results.length - 1].meta.changes === 1
}
