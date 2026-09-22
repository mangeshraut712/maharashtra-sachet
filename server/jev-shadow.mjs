/**
 * Shadow Jev / TypeSafe System One triage.
 *
 * Helps operators decide which relayed CAP bulletins need human attention
 * for clearer citizen UX. Never invents alerts, never mutates public CAP
 * fields, never sends SMS/push/WEA.
 *
 * Live path: POST https://api.typesafe.ai/v1/systemone (model jev-latest).
 * CI uses the mock/fixture scorer unless JEV_USE_LIVE=true.
 *
 * Jev is a System One decision model, not a coding-agent / chat LLM.
 */

export const SYSTEM_ONE_DEFAULT_URL = 'https://api.typesafe.ai/v1/systemone'
export const JEV_MODEL = 'jev-latest'
/** Documented alias resolution; live responses pin the versioned id in `model`. */
export const JEV_LATEST_RESOLVES_TO = 'jev-1.13.0'
export const MEDIUM_CONFIDENCE = 0.6
export const HIGH_CONFIDENCE = 0.8
/** @deprecated Use MEDIUM_CONFIDENCE — kept as the low/medium floor. */
export const LOW_CONFIDENCE = MEDIUM_CONFIDENCE
export const CLARITY_LEVELS = ['unclear', 'usable', 'clear action']
export const HAZARD_FAMILIES = ['flood', 'cyclone', 'heat', 'earthquake', 'air_quality', 'other']
export const MODEL_RECOMMENDATIONS = ['log_only', 'surface_ops_badge', 'escalate_human']
export const OPS_RECOMMENDATIONS = ['log_only', 'surface_ops_badge', 'needs_stronger_check', 'human_review']
export const CONFIDENCE_BANDS = ['high', 'medium', 'low']

const RELAY_KIND_TO_FAMILY = {
  flood: 'flood',
  rain: 'flood',
  cyclone: 'cyclone',
  heat: 'heat',
  earthquake: 'earthquake',
  air: 'air_quality',
}

const BLOCKED_PUBLIC_CHANNELS = new Set([
  'sms',
  'push',
  'send_sms',
  'cell_broadcast',
  'wea',
  'notify_public',
  'whatsapp',
  'web_push',
])

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
    instructions: {
      question: 'Which hazard family best matches this official CAP bulletin?',
      focus: 'Use only `headlineEn`, `descriptionEn`, `headlineMr`, `descriptionMr`, and `kind`. Do not invent a hazard that is not in the text.',
    },
    criteria: {
      flood: {
        what: 'Flood, heavy rain, dam/lake release, or inundation',
        not_for: 'Cyclone/storm surge as the primary hazard, heat, quake, or AQI',
        examples: ['Heavy rainfall and waterlogging in Pune', 'Dam release warning for downstream villages'],
      },
      cyclone: {
        what: 'Cyclone, storm surge, or severe cyclonic storm',
        not_for: 'Inland heavy rain with no cyclone/surge language',
        examples: ['Cyclonic storm over the Arabian Sea', 'Storm surge alert for the Konkan coast'],
      },
      heat: {
        what: 'Heat wave or extreme heat',
        not_for: 'Warm-weather wording that is actually a flood, cyclone, or AQI bulletin',
        examples: ['Heat wave warning for Vidarbha', 'Avoid outdoor work during peak heat'],
      },
      earthquake: {
        what: 'Earthquake or seismic shaking',
        not_for: 'Non-seismic building or landslide text without a quake',
        examples: ['Earthquake reported near the district', 'Seismic intensity advisory'],
      },
      air_quality: {
        what: 'Air quality, AQI, pollution, or smog',
        not_for: 'Weather hazards that mention haze only in passing',
        examples: ['AQI in the very poor range', 'Smog advisory for Mumbai'],
      },
      other: {
        what: 'Any other hazard, mixed signals, or not enough text to classify',
        not_for: 'A clear single family already listed',
        examples: ['Mixed flood and cyclone cues', 'Headline too short to classify'],
      },
    },
  },
  citizen_urgency_clarity_en: {
    type: 'score',
    instructions: {
      question: 'How clearly do the English CAP fields tell a Maharashtra resident what is happening and what to do?',
      focus: 'Judge only `headlineEn` and `descriptionEn`. Do not invent missing protective actions.',
    },
    criteria: [
      {
        what: 'unclear',
        signals: ['Empty or fragmentary English', 'No usable what/where/do'],
        examples: ['Alert', 'Weather update'],
      },
      {
        what: 'usable',
        signals: ['Hazard and area are stated', 'Action is implied or weak'],
        examples: ['Heavy rain expected in Pune district tonight'],
      },
      {
        what: 'clear action',
        signals: ['Hazard, geography, and a protective action are all present'],
        examples: ['Avoid waterlogged roads in Pune. Stay away from low-lying areas.'],
      },
    ],
  },
  citizen_urgency_clarity_mr: {
    type: 'score',
    instructions: {
      question: 'How clearly do the Marathi CAP fields tell a Maharashtra resident what is happening and what to do?',
      focus: 'Judge only `headlineMr` and `descriptionMr`. Do not invent missing protective actions.',
    },
    criteria: [
      {
        what: 'unclear',
        signals: ['Empty or fragmentary Marathi', 'No usable what/where/do'],
        examples: ['सूचना'],
      },
      {
        what: 'usable',
        signals: ['Hazard and area are stated', 'Action is implied or weak'],
        examples: ['पुणे जिल्ह्यात मुसळधार पाऊस अपेक्षित'],
      },
      {
        what: 'clear action',
        signals: ['Hazard, geography, and a protective action are all present'],
        examples: ['पाणी साचलेल्या रस्त्यांपासून दूर राहा'],
      },
    ],
  },
  bilingual_gap: {
    type: 'noul',
    instructions: {
      question: 'Do the English and Marathi headlines/descriptions say materially different things?',
      compare: ['`headlineEn`', '`descriptionEn`', '`headlineMr`', '`descriptionMr`'],
      focus: 'Different hazard, geography, or protective action is a gap. An empty language when the other has those facts is a gap. Wording differences that preserve meaning are not.',
    },
    criteria: {
      true: {
        what: 'EN and MR materially disagree, or one language omits facts the other states',
        not_for: 'Equivalent meaning with different wording',
        examples: ['English names a district the Marathi text omits', 'Marathi tells people to leave while English does not'],
      },
      false: {
        what: 'Both languages convey the same material facts, or both are similarly sparse',
        examples: ['Both say heavy rain in Pune with the same caution', 'Both headlines are equally short'],
      },
    },
  },
  needs_human_ops_review: {
    type: 'noul',
    instructions: {
      question: 'Should a human operator review this bulletin for citizen UX?',
      inspect: ['`headlineEn`', '`descriptionEn`', '`headlineMr`', '`descriptionMr`', '`districts`', '`kind`'],
      focus: 'Look for ambiguous geography, missing action, or conflicting Cancel/Update cues. Do not treat normal official wording as a defect. Never recommend changing CAP text or sending SMS/push.',
    },
    criteria: {
      true: {
        what: 'Ambiguous districts, missing protective action, or cancel/update language that conflicts',
        examples: ['Cancel that still reads as an active warning', 'No districts and no area in the text'],
      },
      false: {
        what: 'Geography and action are coherent enough as relayed',
        not_for: 'Routine official phrasing that a resident can still act on',
        examples: ['Pune rainfall advisory with a stay-away instruction'],
      },
    },
  },
  recommendation: {
    type: 'choice',
    instructions: {
      question: 'Which ops-only routing should apply to this relayed bulletin?',
      focus: 'Never recommend SMS, push, WhatsApp, cell broadcast, WEA, or rewriting CAP. Code will still discard public-notify choices. Use `kind` plus the bilingual headlines only as already-relayed context.',
    },
    criteria: {
      log_only: {
        what: 'Bulletin is coherent; keep it in the ops log only',
        not_for: 'Material bilingual gap, kind/hazard mismatch, or conflicting cancel/update cues',
        examples: ['Clear bilingual rainfall advisory with districts'],
      },
      surface_ops_badge: {
        what: 'Clarity or bilingual issue worth a non-public ops badge',
        not_for: 'A case that already needs a person, or a fully coherent bulletin',
        examples: ['Usable English but thin Marathi action text'],
      },
      escalate_human: {
        what: 'A person should inspect the bulletin',
        not_for: 'Coherent log-only cases or a badge-only clarity niggle',
        examples: ['Hazard family disagrees with `kind`', 'Cancel/Update language conflicts'],
      },
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

export function confidenceBand(confidence) {
  const value = finiteOr(confidence, 0)
  if (value >= HIGH_CONFIDENCE) return 'high'
  if (value >= MEDIUM_CONFIDENCE) return 'medium'
  return 'low'
}

function assertConfidenceBand(band) {
  switch (band) {
    case 'high':
    case 'medium':
    case 'low':
      return band
    default: {
      const exhaustive = band
      throw new Error(`Unhandled confidence band: ${exhaustive}`)
    }
  }
}

export function composeOpsRecommendation(answers = {}, { hazardMismatch = false } = {}) {
  let modelChoice = answers.recommendation?.choice
  const blockedChoice = BLOCKED_PUBLIC_CHANNELS.has(modelChoice)
  if (!MODEL_RECOMMENDATIONS.includes(modelChoice) || blockedChoice) {
    modelChoice = 'escalate_human'
  }
  const confidence = collectAnswerConfidence(answers)
  const band = assertConfidenceBand(confidenceBand(confidence))
  const needsReview = noulValue(answers.needs_human_ops_review) >= MEDIUM_CONFIDENCE
  const escalate = modelChoice === 'escalate_human'

  if (hazardMismatch || needsReview || escalate || band === 'low') {
    let gate = 'low_confidence'
    if (hazardMismatch) gate = 'hazard_mismatch'
    else if (needsReview) gate = 'needs_human_ops_review'
    else if (escalate) gate = 'escalate_or_blocked_channel'
    return {
      recommendation: 'human_review',
      confidence,
      modelChoice,
      confidenceBand: band,
      gate,
    }
  }

  switch (band) {
    case 'medium':
      return {
        recommendation: 'needs_stronger_check',
        confidence,
        modelChoice,
        confidenceBand: band,
        gate: 'medium_confidence',
      }
    case 'high':
      return {
        recommendation: modelChoice,
        confidence,
        modelChoice,
        confidenceBand: band,
        gate: 'high_confidence',
      }
    case 'low':
      return {
        recommendation: 'human_review',
        confidence,
        modelChoice,
        confidenceBand: band,
        gate: 'low_confidence',
      }
    default: {
      const exhaustive = band
      throw new Error(`Unhandled confidence band: ${exhaustive}`)
    }
  }
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
  const resolvedModel = typeof body.model === 'string' && body.model.trim() ? body.model.trim() : JEV_MODEL
  return {
    provider: 'jev-systemone',
    mode: 'shadow',
    public: false,
    opsOnly: true,
    alertKey: alertShadowKey(alert),
    requestedModel: JEV_MODEL,
    model: resolvedModel,
    modelAlias: JEV_MODEL,
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
    confidenceBand: composed.confidenceBand,
    gate: composed.gate,
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
  if (needsReview >= MEDIUM_CONFIDENCE || bilingual >= MEDIUM_CONFIDENCE) recommendation = 'escalate_human'
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
    bilingual_gap: { type: 'noul', noul: bilingual, confidence: 0.81 },
    needs_human_ops_review: { type: 'noul', noul: needsReview, confidence: 0.83 },
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

export function shadowOpsEnvelope(entries = []) {
  return {
    unofficial: true,
    mode: 'shadow',
    public: false,
    opsOnly: true,
    opsBadge: {
      visible: true,
      publicBulletin: false,
      label: 'Jev shadow (ops only)',
    },
    requestedModel: JEV_MODEL,
    modelAliasResolvesTo: JEV_LATEST_RESOLVES_TO,
    disclaimer: 'Ops-only shadow triage. Does not change public CAP bulletin truth.',
    entries,
  }
}
