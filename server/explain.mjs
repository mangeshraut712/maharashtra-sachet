// Sachet Explainer: plain-language explanation of a pasted public alert.
// Built with Google AI Studio + Gemini. The Gemini key comes only from the
// Worker secret GEMINI_API_KEY; caller-supplied keys are never accepted.
export const DEFAULT_GEMINI_MODEL = 'gemini-3.8-flash'
export const MAX_ALERT_CHARS = 6000
const GEMINI_ENDPOINT = 'https://generativelanguage.googleapis.com/v1beta/models'
const LEVELS = ['Red', 'Orange', 'Yellow', 'Green']

const LANG_BLOCK = {
  type: 'OBJECT',
  properties: {
    summary: { type: 'STRING' },
    districtImpact: { type: 'STRING' },
    safetySteps: { type: 'ARRAY', items: { type: 'STRING' } },
  },
  required: ['summary', 'districtImpact', 'safetySteps'],
}
const SCHEMA = {
  type: 'OBJECT',
  properties: {
    severity: { type: 'STRING', enum: [...LEVELS, 'Not stated'] },
    hazardType: { type: 'STRING' },
    districts: { type: 'ARRAY', items: { type: 'STRING' } },
    validity: { type: 'STRING' },
    english: LANG_BLOCK,
    marathi: LANG_BLOCK,
    hindi: LANG_BLOCK,
  },
  required: ['severity', 'hazardType', 'districts', 'validity', 'english', 'marathi', 'hindi'],
}
const SYSTEM = `You are "Sachet Explainer", a public alert simplifier for Maharashtra, India.
Explain ONLY what is in the pasted alert. Never invent dates, amounts, districts or severity.
severity: the colour level only if the alert text explicitly states Red, Orange, Yellow or Green; otherwise "Not stated".
For english, marathi (Devanagari) and hindi (Devanagari) give: a 2-line plain summary (lines separated by \\n),
what it means for someone in the named district, and exactly 3 concrete safety steps.
Use "Not stated" for validity if absent. Return strict JSON only.`

const DISTRICTS = ['Mumbai', 'Thane', 'Palghar', 'Raigad', 'Ratnagiri', 'Sindhudurg', 'Pune', 'Satara', 'Kolhapur', 'Sangli', 'Solapur', 'Nashik', 'Ahmednagar', 'Ahilyanagar', 'Dhule', 'Jalgaon', 'Nandurbar', 'Aurangabad', 'Chhatrapati Sambhajinagar', 'Jalna', 'Parbhani', 'Hingoli', 'Nanded', 'Beed', 'Latur', 'Dharashiv', 'Osmanabad', 'Amravati', 'Akola', 'Washim', 'Buldhana', 'Yavatmal', 'Nagpur', 'Wardha', 'Bhandara', 'Gondia', 'Chandrapur', 'Gadchiroli']

export function statedSeverity(text) {
  const t = String(text)
  const m = t.match(/\b(red|orange|yellow|green)\b/i) || (/लाल|रेड/.test(t) ? ['', 'red'] : /नारंगी|ऑरेंज/.test(t) ? ['', 'orange'] : /पिवळा|यलो|येलो/.test(t) ? ['', 'yellow'] : null)
  return m ? m[1][0].toUpperCase() + m[1].slice(1).toLowerCase() : 'Not stated'
}

export function fallbackExplanation(text) {
  const severity = statedSeverity(text)
  const up = text.toUpperCase()
  const districts = DISTRICTS.filter(d => new RegExp(`\\b${d}\\b`, 'i').test(text))
  let hazard = 'Public alert'
  if (/RAIN|FLOOD|पाऊस|पूर/.test(up)) hazard = 'Heavy rain / flood'
  else if (/HEAT|TEMPERATURE|LOO|उष्ण/.test(up)) hazard = 'Heatwave'
  else if (/AQI|AIR QUALITY|POLLUTION|SMOG/.test(up)) hazard = 'Air quality'
  else if (/LIGHTNING|THUNDER|HAIL|वीज/.test(up)) hazard = 'Thunderstorm / lightning'
  else if (/CYCLONE|GALE|CYCLONIC STORM/.test(up)) hazard = 'Cyclone / high winds'
  const area = districts.join(', ') || 'the area named in the alert'
  const areaMr = districts.join(', ') || 'सूचनेत नमूद भाग'
  const areaHi = districts.join(', ') || 'सूचना में बताए गए क्षेत्र'
  const lvl = severity === 'Not stated' ? 'level not stated' : `${severity} level`
  return {
    severity, hazardType: hazard, districts, validity: 'Not stated — check the original alert',
    english: {
      summary: `The pasted alert describes: ${hazard.toLowerCase()} (${lvl}) for ${area}.\nThis is an automatic keyword summary; read the original alert for exact details.`,
      districtImpact: `People in ${area} should expect possible disruption to travel, power or outdoor work and follow district administration instructions.`,
      safetySteps: [`Avoid unnecessary travel in exposed or low-lying parts of ${area}.`, 'Keep your phone charged and store drinking water and essential medicines.', 'Follow official updates (SACHET, IMD, district administration); call 112 in an emergency.'],
    },
    marathi: {
      summary: `या सूचनेत ${areaMr} साठी धोक्याचा इशारा आहे (${severity === 'Not stated' ? 'स्तर नमूद नाही' : severity + ' स्तर'}).\nहा स्वयंचलित सारांश आहे; अचूक माहितीसाठी मूळ सूचना वाचा.`,
      districtImpact: `${areaMr} मधील नागरिकांना प्रवास, वीज किंवा बाहेरील कामांत अडथळे येऊ शकतात; जिल्हा प्रशासनाच्या सूचना पाळा.`,
      safetySteps: ['धोकादायक किंवा सखल भागात विनाकारण प्रवास टाळा.', 'फोन चार्ज ठेवा आणि पिण्याचे पाणी व आवश्यक औषधे जवळ ठेवा.', 'अधिकृत सूचनांचे पालन करा; आपत्कालीन स्थितीत ११२ वर फोन करा.'],
    },
    hindi: {
      summary: `इस सूचना में ${areaHi} के लिए खतरे की चेतावनी है (${severity === 'Not stated' ? 'स्तर नहीं बताया गया' : severity + ' स्तर'}).\nयह स्वचालित सारांश है; सटीक जानकारी के लिए मूल सूचना पढ़ें।`,
      districtImpact: `${areaHi} के लोगों को यात्रा, बिजली या बाहरी काम में रुकावट हो सकती है; ज़िला प्रशासन के निर्देश मानें।`,
      safetySteps: ['जोखिम वाले या निचले इलाकों में गैर-ज़रूरी यात्रा से बचें।', 'फ़ोन चार्ज रखें और पीने का पानी व ज़रूरी दवाइयाँ पास रखें।', 'आधिकारिक अपडेट देखें; आपात स्थिति में 112 पर कॉल करें।'],
    },
  }
}

function validExplanation(data) {
  const ok = b => b && typeof b.summary === 'string' && typeof b.districtImpact === 'string' && Array.isArray(b.safetySteps)
  return data && typeof data === 'object' && ok(data.english) && ok(data.marathi) && ok(data.hindi)
}

export async function geminiExplanation(text, { apiKey, model = DEFAULT_GEMINI_MODEL, fetchImpl = globalThis.fetch, timeoutMs = 20000 }) {
  const response = await fetchImpl(`${GEMINI_ENDPOINT}/${encodeURIComponent(model)}:generateContent`, {
    method: 'POST',
    headers: { 'content-type': 'application/json', 'x-goog-api-key': apiKey },
    signal: AbortSignal.timeout(timeoutMs),
    body: JSON.stringify({
      systemInstruction: { parts: [{ text: SYSTEM }] },
      contents: [{ role: 'user', parts: [{ text: `--- ALERT TEXT START ---\n${text}\n--- ALERT TEXT END ---` }] }],
      generationConfig: { temperature: 0.1, responseMimeType: 'application/json', responseSchema: SCHEMA },
    }),
  })
  if (!response.ok) throw new Error(`Gemini HTTP ${response.status}`)
  const body = await response.json()
  const data = JSON.parse(body?.candidates?.[0]?.content?.parts?.map(p => p.text || '').join('') || 'null')
  if (!validExplanation(data)) throw new Error('Gemini returned an unexpected shape')
  data.english.safetySteps = data.english.safetySteps.slice(0, 3)
  data.marathi.safetySteps = data.marathi.safetySteps.slice(0, 3)
  data.hindi.safetySteps = data.hindi.safetySteps.slice(0, 3)
  // Badge always reflects the level stated in the alert text, never a model guess.
  data.severity = statedSeverity(text)
  return data
}

// Returns a plain object { status, body }; callers wrap it with jsonResponse.
export async function explainAlert(input, env = {}, fetchImpl = globalThis.fetch) {
  const text = typeof input?.alertText === 'string' ? input.alertText.trim() : ''
  if (!text) return { status: 400, body: { error: 'Paste an alert text to explain.' } }
  if (text.length > MAX_ALERT_CHARS) return { status: 413, body: { error: `Alert text is limited to ${MAX_ALERT_CHARS} characters.` } }
  const apiKey = typeof env.GEMINI_API_KEY === 'string' ? env.GEMINI_API_KEY.trim() : ''
  const model = typeof env.GEMINI_MODEL === 'string' && env.GEMINI_MODEL.trim() ? env.GEMINI_MODEL.trim() : DEFAULT_GEMINI_MODEL
  if (apiKey) {
    try {
      return { status: 200, body: { source: 'gemini', model, data: await geminiExplanation(text, { apiKey, model, fetchImpl }) } }
    } catch (error) {
      console.error(JSON.stringify({ event: 'explain_gemini_failed', model, reason: String(error?.message || error).slice(0, 120) }))
    }
  }
  return { status: 200, body: { source: 'offline-fallback', model: null, note: 'Gemini is unavailable, so this is a simple keyword-based summary. Read the original alert.', data: fallbackExplanation(text) } }
}
