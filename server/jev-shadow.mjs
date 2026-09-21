/**
 * Shadow Jev triage — never mutates public CAP bulletin fields.
 * Live Gateway integration is optional; mock/fixture path keeps CI secret-free.
 */

export function jevShadowEnabled(env = {}) {
  if (String(env.JEV_SHADOW_KILL) === 'true') return false
  return String(env.JEV_SHADOW_ENABLED) === 'true'
}

export function alertShadowKey(alert) {
  return `${alert.source}:${alert.id}`
}

function clarityScore(text) {
  const value = String(text || '').trim()
  if (!value) return 0
  if (value.length < 12) return 0.35
  if (value.length < 40) return 0.6
  return 0.85
}

export function scoreAlertShadow(alert, { provider = 'mock' } = {}) {
  const en = alert.headlineEn || alert.descriptionEn || ''
  const mr = alert.headlineMr || alert.descriptionMr || ''
  const kindConfidence = alert.kind ? 0.82 : 0.45
  const severityConfidence = alert.weaClass && alert.weaClass !== 'PUBLIC_SAFETY' ? 0.75 : 0.55
  return {
    provider,
    mode: 'shadow',
    alertKey: alertShadowKey(alert),
    kind: alert.kind || 'other',
    kindConfidence,
    severityConfidence,
    clarity: { en: clarityScore(en), mr: clarityScore(mr) },
    recommendation: 'human_review',
    note: 'Shadow triage only — does not change relayed CAP text.',
  }
}

export async function triageAlertShadow(alert, env = {}, fetchImpl = globalThis.fetch) {
  if (String(env.JEV_USE_LIVE) === 'true' && env.JEV_API_KEY) {
    try {
      const live = await triageViaGateway(alert, env, fetchImpl)
      if (live) return live
    } catch {
      /* fall through to mock */
    }
  }
  return scoreAlertShadow(alert, { provider: 'mock-fixture' })
}

async function triageViaGateway(alert, env, fetchImpl) {
  const base = env.JEV_GATEWAY_URL || 'https://api.typesafe.ai/v1'
  const url = `${base.replace(/\/$/, '')}/score`
  const response = await fetchImpl(url, {
    method: 'POST',
    headers: {
      authorization: `Bearer ${env.JEV_API_KEY}`,
      'content-type': 'application/json',
      accept: 'application/json',
    },
    body: JSON.stringify({
      task: 'cap_shadow_triage',
      text: {
        en: alert.headlineEn || alert.descriptionEn || '',
        mr: alert.headlineMr || alert.descriptionMr || '',
      },
      kind: alert.kind,
      weaClass: alert.weaClass,
    }),
  })
  if (!response.ok) throw new Error(`Jev gateway HTTP ${response.status}`)
  const body = await response.json()
  if (!body || typeof body !== 'object') throw new Error('Invalid Jev gateway response')
  return {
    provider: 'jev-gateway',
    mode: 'shadow',
    alertKey: alertShadowKey(alert),
    kind: body.kind || alert.kind || 'other',
    kindConfidence: Number(body.kindConfidence) || 0.5,
    severityConfidence: Number(body.severityConfidence) || 0.5,
    clarity: {
      en: Number(body.clarity?.en) || clarityScore(alert.headlineEn),
      mr: Number(body.clarity?.mr) || clarityScore(alert.headlineMr),
    },
    recommendation: 'human_review',
    note: 'Shadow triage only — does not change relayed CAP text.',
  }
}

export function retainShadowLogRows(rows, limit = 200) {
  return rows.slice(-limit)
}
