import { resolve } from 'node:path'
import { pathToFileURL } from 'node:url'
import { DISTRICTS } from '../server/districts.mjs'
import { createRelayServer } from '../server/index.mjs'
import { jsonResponse, SOURCE_IDS } from '../server/service.mjs'

const district = id => DISTRICTS.find(row => row.id === id)

function demoAlert({ id, sent, expires, districtId, kind, headline, headlineMr, description, descriptionMr, instruction, instructionMr, msgType = 'Alert', references = [] }) {
  const area = district(districtId)
  return {
    id, source: 'sachet', official: true, sender: 'Demo fixture authority', sent,
    effective: sent, expires, status: 'Actual', scope: 'Public', msgType,
    category: 'Safety', severity: 'Moderate', urgency: 'Expected', certainty: 'Observed',
    headlineEn: headline, language: 'en', description, instruction, areaDesc: area.en,
    districts: [{ id: area.id, en: area.en, mr: area.mr, lgd: area.lgd }],
    weaClass: 'PUBLIC_SAFETY', kind, capUrl: 'https://sachet.ndma.gov.in/', references,
    languages: [
      { language: 'en', headline, description, instruction },
      { language: 'mr', headline: headlineMr, description: descriptionMr, instruction: instructionMr },
    ],
  }
}

export function createDemoRelay(now = () => Date.now()) {
  let step = 0
  function state() {
    const current = now()
    const generatedAt = new Date(current).toISOString()
    const originalSent = new Date(current - 120_000).toISOString()
    const updateSent = new Date(current - 60_000).toISOString()
    const cancelSent = new Date(current - 1_000).toISOString()
    const expires = new Date(current + 3_600_000).toISOString()
    const original = demoAlert({
      id: 'demo-water-alert', sent: originalSent, expires, districtId: 'pune', kind: 'water',
      headline: 'Demo: Marunji water service notice', headlineMr: 'डेमो: मारुंजी पाणीपुरवठा सूचना',
      description: 'Labelled fixture for Pune district. It is not a live municipal notice.',
      descriptionMr: 'पुणे जिल्ह्यासाठी चिन्हांकित चाचणी नोंद. ही थेट पालिका सूचना नाही.',
      instruction: 'Demo only: check the relevant local authority for real service information.',
      instructionMr: 'फक्त डेमो: प्रत्यक्ष सेवेसाठी संबंधित स्थानिक प्रशासनाची माहिती तपासा.',
    })
    const update = demoAlert({
      id: 'demo-water-update', sent: updateSent, expires, districtId: 'pune', kind: 'water', msgType: 'Update',
      headline: 'Demo update: Marunji water notice revised', headlineMr: 'डेमो अपडेट: मारुंजी पाणी सूचना सुधारित',
      description: 'The lifecycle demo replaced the original fixture with revised information.',
      descriptionMr: 'जीवनचक्र डेमोने मूळ चाचणी नोंदीऐवजी सुधारित माहिती दाखवली आहे.',
      instruction: 'Demo only: this updated instruction supersedes the original fixture.',
      instructionMr: 'फक्त डेमो: ही सुधारित सूचना मूळ चाचणी सूचनेची जागा घेते.',
      references: [{ sender: original.sender, identifier: original.id, sent: original.sent }],
    })
    const cancel = demoAlert({
      id: 'demo-water-cancel', sent: cancelSent, expires, districtId: 'pune', kind: 'water', msgType: 'Cancel',
      headline: 'Demo cancellation', headlineMr: 'डेमो रद्द सूचना',
      description: 'The demo water notice is cancelled.', descriptionMr: 'डेमो पाणी सूचना रद्द केली आहे.',
      instruction: 'Demo complete.', instructionMr: 'डेमो पूर्ण.',
      references: [{ sender: update.sender, identifier: update.id, sent: update.sent }],
    })
    const road = demoAlert({
      id: 'demo-road-alert', sent: originalSent, expires, districtId: 'sindhudurg', kind: 'transport',
      headline: 'Demo: Sindhudurg road advisory', headlineMr: 'डेमो: सिंधुदुर्ग रस्ता सूचना',
      description: '<img src=x onerror="window.__feedInjected=true"> This fixture proves remote text is not executed.',
      descriptionMr: 'ही चाचणी नोंद दूरस्थ मजकूर चालवला जात नाही हे तपासते.',
      instruction: 'Demo only: use official transport sources for real closures.',
      instructionMr: 'फक्त डेमो: प्रत्यक्ष रस्तेबंदीसाठी अधिकृत वाहतूक स्रोत वापरा.',
    })
    const records = step === 0 ? [original, road] : step === 1 ? [original, update, road] : [original, update, cancel, road]
    const sources = Object.fromEntries(SOURCE_IDS.map(id => [id, {
      records: id === 'sachet' ? records : [],
      state: ['cwc', 'cpcb'].includes(id) ? 'disabled' : 'healthy',
      lastSuccessAt: ['cwc', 'cpcb'].includes(id) ? null : generatedAt,
      lastAttemptAt: generatedAt,
      error: id === 'cwc' ? 'Direct warning integration unavailable; consult the official source.' : null,
      errorCode: null,
    }]))
    return { generatedAt, sources }
  }
  return {
    getState: state,
    pollOnce: async () => state(),
    advance() { step = Math.min(2, step + 1); return { step, state: state() } },
    reset() { step = 0; return { step, state: state() } },
  }
}

export function createDemoServer({ now = () => Date.now(), webRoot } = {}) {
  const relay = createDemoRelay(now)
  const controlHandler = async request => {
    const path = new URL(request.url).pathname
    if (!path.startsWith('/__demo/')) return null
    if (request.method !== 'POST') return jsonResponse(405, { error: 'Method not allowed' }, { allow: 'POST' })
    const result = path === '/__demo/advance' ? relay.advance() : path === '/__demo/reset' ? relay.reset() : null
    return result ? jsonResponse(200, { demo: true, step: result.step }) : jsonResponse(404, { error: 'Not found' })
  }
  return createRelayServer({ relay, webRoot, environment: 'demo', controlHandler, now })
}

export function startDemoServer({ port = Number(process.env.PORT || 8799) } = {}) {
  const server = createDemoServer()
  server.listen(port, '127.0.0.1', () => console.log(`LABELLED DEMO http://127.0.0.1:${port}`))
  return server
}

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) startDemoServer()
