/**
 * Shadow Jev / TypeSafe System One triage.
 *
 * Helps operators decide which relayed CAP bulletins need human attention
 * for clearer citizen UX. Never invents alerts, never mutates public CAP
 * fields, never sends SMS/push/WEA.
 *
 * Live path: POST https://api.typesafe.ai/v1/systemone (model jev-latest).
 * CI uses the mock/fixture scorer unless JEV_USE_LIVE=true.
 */

export const SYSTEM_ONE_DEFAULT_URL = 'https://api.typesafe.ai/v1/systemone'
export const JEV_MODEL = 'jev-latest'
export const LOW_CONFIDENCE = 0.6
export const CLARITY_LEVELS = ['unclear', 'usable', 'clear action']
export const HAZARD_FAMILIES = ['flood', 'cyclone', 'heat', 'earthquake', 'air_quality', 'other']
export const MODEL_RECOMMENDATIONS = ['log_only', 'surface_ops_badge', 'escalate_human']

const RELAY_KIND_TO_FAMILY = {
  flood: 'flood',
  rain: 'flood',
  cyclone: 'cyclone',
  heat: 'heat',
  earthquake: 'earthquake',
  air: 'air_quality',
}

export function jevShadowEnabled(env = {}) {
  if (String(env.JEV_SHADOW_KILL) === 'true') return false
  return String(env.JEV_SHADOW_ENABLED) === 'true'
}

export function resolveJevApiKey(env = {}) {
  const primary = typeof env.JEV_API_KEY === 'string' ? env.JEV_API_KEY.trim() : ''
  if (primary) return primary
  const cursorSecret = typeof env.cursor === 'string' ? env.cursor.trim() : ''
  return cursorSecret
}

export function systemOneUrl(env = {}) {
  const raw = String(env.JEV_GATEWAY_URL || SYSTEM_ONE_DEFAULT_URL).trim()
  const trimmed = raw.replace(/\/$/, '')
  if (trimmed.endsWith('/v1')) return `${trimmed}/systemone`
  if (trimmed.endsWith('/score')) return trimmed.replace(/\/score$/, '/systemone')
  return trimmed
}

export function alertShadowKey(alert) {
  return `${alert.source}:${alert.id}`
}

export function capShadowState(alert) {
  return {
    headlineEn: alert.headlineEn || '',
    descriptionEn: alert.descriptionEn || '',
    headlineMr: alert.headlineMr || '',
    descriptionMr: alert.descriptionMr || '',
    kind: alert.kind || '',
    weaClass: alert.weaClass || '',
    districts: Array.isArray(alert.districts) ? alert.districts : [],
    source: alert.source || '',
    id: alert.id || '',
  }
}

export function relayKindToFamily(kind) {
  return RELAY_KIND_TO_FAMILY[kind] || 'other'
}

export const TRIAGE_QUESTIONS = {
  hazard_family: {
    type: 'choice',
    instructions:
      'Which hazard family best matches this official CAP bulletin using only the supplied state fields? Do not invent hazards that are not in the text.',
    criteria: {
      flood: 'Flood, heavy rain, dam/lake release, inundation',
      cyclone: 'Cyclone, storm surge, severe cyclonic storm',
      heat: 'Heat wave or extreme heat',
      earthquake: 'Earthquake or seismic shaking',
      air_quality: 'Air quality, AQI, pollution, smog',
      other: 'Any other hazard, mixed signals, or not enough text to classify',
    },
  },
  citizen_urgency_clarity_en: {
    type: 'score',
    instructions:
      'How clearly do the English CAP fields tell a Maharashtra resident what is happening and what to do? Judge only existing English text. Do not invent missing actions.',
    criteria: [...CLARITY_LEVELS],
  },
  citizen_urgency_clarity_mr: {
    type: 'score',
    instructions:
      'How clearly do the Marathi CAP fields tell a Maharashtra resident what is happening and what to do? Judge only existing Marathi text. Do not invent missing actions.',
    criteria: [...CLARITY_LEVELS],
  },
  bilingual_gap: {
    type: 'noul',
    instructions:
      'Do the English and Marathi headlines/descriptions say materially different things (different hazard, geography, or protective action)? An empty language when the other has those facts is a gap. Wording differences that preserve meaning are not.',
    criteria: {
      true: 'EN and MR materially disagree, or one language omits facts the other states',
      false: 'Both languages convey the same material facts, or both are similarly sparse',
    },
  },
  needs_human_ops_review: {
    type: 'noul',
    instructions:
      'Should a human operator review this bulletin for citizen UX (ambiguous geography, missing action, or conflicting Cancel/Update cues in the text)? Do not treat normal official wording as a defect. Never recommend changing CAP text or sending SMS/push.',
    criteria: {
      true: 'Ambiguous districts, missing protective action, or cancel/update language that conflicts',
      false: 'Geography and action are coherent enough as relayed',
    },
  },
  recommendation: {
    type: 'choice',
    instructions:
      'Ops-only routing. Never recommend SMS, push, cell broadcast, WEA, or rewriting CAP. log_only = keep in the ops log; surface_ops_badge = optional future ops UI flag; escalate_human = a person should inspect the bulletin.',
    criteria: {
      log_only: 'Bulletin is coherent; ops log only',
      surface_ops_badge: 'Clarity or bilingual issue worth a non-public ops badge',
      escalate_human: 'Human review for mismatch, missing action, or conflicting cues',
    },
  },
}

export function buildSystemOneRequest(alert) {
  return {
    state: capShadowState(alert),
    model: JEV_MODEL,
    questions: TRIAGE_QUESTIONS,
  }
}

function noulValue(answer) {
  const value = Number(answer?.noul)
  return Number.isFinite(value) ? value : 0.5
}

function noulCertainty(noul) {
  return Math.abs(noul - 0.5) * 2
}

function nearestClarityLevel(score, legend = {}) {
  if (typeof legend === 'object' && legend !== null) {
    const labels = Object.values(legend).map((value) => String(value))
    if (labels.length) {
      const index = Math.min(Math.max(Math.round(Number(score) || 0), 0), labels.length - 1)
      return labels[index]
    }
  }
  const index = Math.min(Math.max(Math.round(Number(score) || 0), 0), CLARITY_LEVELS.length - 1)
  return CLARITY_LEVELS[index]
}

function finiteOr(value, fallback) {
  const number = Number(value)
  return Number.isFinite(number) ? number : fallback
}

export function collectAnswerConfidence(answers = {}) {
  const scores = []
  for (const key of Object.keys(answers)) {
    const answer = answers[key]
    if (!answer || typeof answer !== 'object') continue
    if (typeof answer.confidence === 'number' && Number.isFinite(answer.confidence)) {
      scores.push(answer.confidence)
      continue
    }
    if (answer.type === 'noul') scores.push(noulCertainty(noulValue(answer)))
  }
  if (!scores.length) return 0
  return Math.min(...scores)
}

export function composeOpsRecommendation(answers = {}, { hazardMismatch = false } = {}) {
  const blocked = new Set(['sms', 'push', 'send_sms', 'cell_broadcast', 'wea', 'notify_public'])
  let modelChoice = answers.recommendation?.choice
  if (!MODEL_RECOMMENDATIONS.includes(modelChoice) || blocked.has(modelChoice)) {
    modelChoice = 'escalate_human'
  }
  const confidence = collectAnswerConfidence(answers)
  const needsReview = noulValue(answers.needs_human_ops_review) >= LOW_CONFIDENCE
  if (modelChoice === 'escalate_human' || confidence < LOW_CONFIDENCE || needsReview || hazardMismatch) {
    return { recommendation: 'human_review', confidence, modelChoice }
  }
  return { recommendation: modelChoice, confidence, modelChoice }
}

export function parseSystemOneResponse(body, alert) {
  if (!body || typeof body !== 'object' || !body.answers || typeof body.answers !== 'object') {
    throw new Error('Invalid System One response')
  }
  const answers = body.answers
  const hazardFamily = HAZARD_FAMILIES.includes(answers.hazard_family?.choice)
    ? answers.hazard_family.choice
    : 'other'
  const relayedFamily = relayKindToFamily(alert.kind)
  const hazardMismatch = Boolean(alert.kind) && hazardFamily !== relayedFamily
  const composed = composeOpsRecommendation(answers, { hazardMismatch })
  const enScore = answers.citizen_urgency_clarity_en
  const mrScore = answers.citizen_urgency_clarity_mr
  return {
    provider: 'jev-systemone',
    mode: 'shadow',
    alertKey: alertShadowKey(alert),
    model: body.model || JEV_MODEL,
    kind: alert.kind || 'other',
    hazardFamily,
    relayedFamily,
    hazardMismatch,
    kindConfidence: finiteOr(answers.hazard_family?.confidence, 0.5),
    clarity: {
      en: nearestClarityLevel(enScore?.score, enScore?.legend),
      mr: nearestClarityLevel(mrScore?.score, mrScore?.legend),
      enScore: finiteOr(enScore?.score, 0),
      mrScore: finiteOr(mrScore?.score, 0),
    },
    bilingualGap: noulValue(answers.bilingual_gap),
    needsHumanOpsReview: noulValue(answers.needs_human_ops_review),
    modelRecommendation: composed.modelChoice,
    recommendation: composed.recommendation,
    confidence: composed.confidence,
    answers,
    note: 'Shadow triage only — does not change relayed CAP text; never sends SMS/push.',
  }
}

function mockClarityIndex(text) {
  const value = String(text || '').trim()
  if (!value) return 0
  if (/(stay|leave|shelter|avoid|call 112|दूर|निघून|आश्रय)/i.test(value) && value.length >= 24) return 2
  if (value.length >= 20) return 1
  return 0
}

function mockAnswers(alert) {
  const state = capShadowState(alert)
  const family = relayKindToFamily(alert.kind)
  const enIndex = mockClarityIndex(`${state.headlineEn} ${state.descriptionEn}`)
  const mrIndex = mockClarityIndex(`${state.headlineMr} ${state.descriptionMr}`)
  const enText = `${state.headlineEn} ${state.descriptionEn}`.trim()
  const mrText = `${state.headlineMr} ${state.descriptionMr}`.trim()
  const bilingual = enText && mrText
    ? (enText.length > 80 && mrText.length < 12) || (mrText.length > 80 && enText.length < 12) ? 0.78 : 0.12
    : enText || mrText ? 0.64 : 0.2
  const cancelCue = /cancel|update|सुधारणा|रद्द/i.test(`${enText} ${mrText}`)
  const missingGeo = !state.districts.length
  const needsReview = missingGeo || cancelCue || enIndex === 0 || mrIndex === 0 ? 0.71 : 0.18
  let recommendation = 'log_only'
  if (needsReview >= LOW_CONFIDENCE || bilingual >= LOW_CONFIDENCE) recommendation = 'escalate_human'
  else if (enIndex < 2 || mrIndex < 2) recommendation = 'surface_ops_badge'
  return {
    hazard_family: {
      type: 'choice',
      choice: family,
      probabilities: Object.fromEntries(HAZARD_FAMILIES.map((id) => [id, id === family ? 0.91 : 0.018])),
      confidence: 0.84,
    },
    citizen_urgency_clarity_en: {
      type: 'score',
      score: enIndex,
      legend: Object.fromEntries(CLARITY_LEVELS.map((label, index) => [String(index), label])),
      probabilities: Object.fromEntries(CLARITY_LEVELS.map((_, index) => [String(index), index === enIndex ? 0.9 : 0.05])),
      confidence: 0.82,
    },
    citizen_urgency_clarity_mr: {
      type: 'score',
      score: mrIndex,
      legend: Object.fromEntries(CLARITY_LEVELS.map((label, index) => [String(index), label])),
      probabilities: Object.fromEntries(CLARITY_LEVELS.map((_, index) => [String(index), index === mrIndex ? 0.9 : 0.05])),
      confidence: 0.8,
    },
    bilingual_gap: { type: 'noul', noul: bilingual },
    needs_human_ops_review: { type: 'noul', noul: needsReview },
    recommendation: {
      type: 'choice',
      choice: recommendation,
      probabilities: Object.fromEntries(MODEL_RECOMMENDATIONS.map((id) => [id, id === recommendation ? 0.88 : 0.06])),
      confidence: 0.81,
    },
  }
}

export function scoreAlertShadow(alert, { provider = 'mock' } = {}) {
  const parsed = parseSystemOneResponse({ model: 'mock-fixture', answers: mockAnswers(alert) }, alert)
  return { ...parsed, provider }
}

export async function triageViaGateway(alert, env, fetchImpl) {
  const key = resolveJevApiKey(env)
  if (!key) throw new Error('Missing Jev API key')
  const url = systemOneUrl(env)
  const response = await fetchImpl(url, {
    method: 'POST',
    headers: {
      authorization: `Bearer ${key}`,
      'content-type': 'application/json',
      accept: 'application/json',
    },
    body: JSON.stringify(buildSystemOneRequest(alert)),
  })
  if (response.status === 429 || response.status === 529) {
    throw new Error(`Jev System One HTTP ${response.status}`)
  }
  if (!response.ok) throw new Error(`Jev System One HTTP ${response.status}`)
  const body = await response.json()
  return parseSystemOneResponse(body, alert)
}

export async function triageAlertShadow(alert, env = {}, fetchImpl = globalThis.fetch) {
  if (String(env.JEV_USE_LIVE) === 'true' && resolveJevApiKey(env)) {
    try {
      const live = await triageViaGateway(alert, env, fetchImpl)
      if (live) return live
    } catch {
      /* fall through to mock */
    }
  }
  return scoreAlertShadow(alert, { provider: 'mock-fixture' })
}

export function retainShadowLogRows(rows, limit = 200) {
  return rows.slice(-limit)
}
