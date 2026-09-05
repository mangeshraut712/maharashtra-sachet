const OFFICIAL_HOSTS = [
  'gov.in',
  'nic.in',
  'mahadiscom.in',
  'india-water.gov.in',
]

export function safeOfficialUrl(value) {
  try {
    const url = new URL(value)
    if (
      url.protocol !== 'https:' ||
      url.username ||
      url.password ||
      (url.port && url.port !== '443')
    )
      return null
    if (
      !OFFICIAL_HOSTS.some(
        (host) => url.hostname === host || url.hostname.endsWith(`.${host}`),
      )
    )
      return null
    return url.href
  } catch {
    return null
  }
}

export function sourceStatus(source = {}) {
  if (!source || typeof source !== 'object') return 'unknown'
  if (
    source.skipped ||
    ['disabled', 'misconfigured', 'directory-only', 'directory'].includes(
      source.status,
    )
  )
    return 'disabled'
  if (
    ['stale', 'degraded', 'unavailable', 'error'].includes(source.status) ||
    source.ok === false
  )
    return 'degraded'
  if (source.status === 'healthy' || source.ok === true) return 'healthy'
  return 'unknown'
}

export function isCurrent(alert, now = Date.now()) {
  if (!alert || typeof alert !== 'object') return false
  if (alert.recordType === 'observation') return false
  if (
    alert.active === false ||
    alert.isActive === false ||
    /^(cancel|cancelled|expired|superseded)$/i.test(
      alert.messageType || alert.msgType || '',
    )
  )
    return false
  const expires = Date.parse(alert.expires)
  // An unknown expiry is retained with an explicit label, never invented.
  return !Number.isFinite(expires) || expires > now
}

export function matchingAlerts(
  alerts,
  filters = {},
  regions = [],
  now = Date.now(),
) {
  const ids = filters.region
    ? new Set(regions.find((r) => r.id === filters.region)?.districtIds || [])
    : null
  return alerts.filter(
    (a) =>
      isCurrent(a, now) &&
      (!filters.district ||
        (a.districts || []).some((d) => d.id === filters.district)) &&
      (!ids || (a.districts || []).some((d) => ids.has(d.id))) &&
      (!filters.kind || a.kind === filters.kind) &&
      (!filters.weaClass || a.weaClass === filters.weaClass),
  )
}

export function alertContent(alert, preferred = 'en') {
  const blocks = alert.contentByLanguage || alert.languages || {}
  const entries = (
    Array.isArray(blocks)
      ? blocks
          .filter((b) => b && typeof b === 'object')
          .map((b) => [typeof b.language === 'string' ? b.language : 'und', b])
      : Object.entries(blocks)
  ).filter(([, value]) => value && typeof value === 'object')
  const order = preferred === 'mr' ? ['mr', 'hi', 'en'] : ['en', 'mr', 'hi']
  let chosen
  for (const lang of order) {
    chosen = entries.find(
      ([key, value]) =>
        key.toLowerCase().split('-')[0] === lang &&
        value &&
        typeof value === 'object',
    )
    if (chosen) break
  }
  chosen ||= entries[0]
  if (chosen) {
    const [language, value] = chosen
    return {
      headline: value.headline || value.headlineEn || '',
      description: value.description || '',
      instruction: value.instruction || '',
      language,
      fallback: language.split('-')[0] !== preferred,
    }
  }
  const language =
    typeof alert.language === 'string' && alert.language
      ? alert.language
      : alert.headlineEn
        ? 'en'
        : 'und'
  // Legacy headlineMr does not prove the instruction or description is Marathi.
  return {
    headline: alert.headlineEn || alert.headlineMr || alert.event || '',
    description: alert.description || '',
    instruction: alert.instruction || '',
    language,
    fallback: language.split('-')[0] !== preferred,
  }
}

export function snapshotFresh(generatedAt, now = Date.now()) {
  const timestamp = Date.parse(generatedAt)
  return (
    Number.isFinite(timestamp) &&
    now - timestamp < 5 * 60_000 &&
    timestamp <= now + 60_000
  )
}

export function nextPollMs(mode) {
  switch (mode) {
    case 'healthy':
    case 'degraded':
      return 60_000
    case 'stale':
    case 'loading':
    case 'error':
    case 'offline':
      return 15_000
    default: {
      const unexpected = mode
      void unexpected
      return 60_000
    }
  }
}

export function alertKey(alert) {
  return `${alert.source || ''}:${alert.id}`
}

export function validSnapshot(body) {
  return (
    !!body &&
    Array.isArray(body.alerts) &&
    body.alerts.length <= 25_000 &&
    body.alerts.every(
      (a) =>
        a &&
        typeof a === 'object' &&
        typeof a.id === 'string' &&
        typeof a.source === 'string' &&
        (!a.districts ||
          (Array.isArray(a.districts) &&
            a.districts.every((d) => d && typeof d.id === 'string'))),
    ) &&
    (!body.sources ||
      (typeof body.sources === 'object' &&
        !Array.isArray(body.sources) &&
        Object.values(body.sources).every(
          (s) => s && typeof s === 'object',
        ))) &&
    (body.generatedAt == null || typeof body.generatedAt === 'string')
  )
}

export function validMeta(meta) {
  return (
    !!meta &&
    Array.isArray(meta.districts) &&
    meta.districts.length > 0 &&
    [
      'districts',
      'regions',
      'weaClasses',
      'situationKinds',
      'serviceCategories',
      'links',
    ].every(
      (key) =>
        !meta[key] ||
        (Array.isArray(meta[key]) &&
          meta[key].every(
            (row) =>
              row && typeof row === 'object' && typeof row.id === 'string',
          )),
    ) &&
    (meta.regions || []).every(
      (r) =>
        Array.isArray(r.districtIds) &&
        r.districtIds.every((id) => typeof id === 'string'),
    )
  )
}
