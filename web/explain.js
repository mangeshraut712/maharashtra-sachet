const SAMPLES = {
  rain: `[SAMPLE ONLY - NOT LIVE ALERT]
ALERT LEVEL: RED WARNING (TAKE ACTION)
HAZARD: Extremely Heavy Rainfall & Localized Flash Flooding
AFFECTED DISTRICTS: Ratnagiri and Raigad
VALIDITY: Next 24 Hours from 08:30 IST
Extremely heavy rainfall (exceeding 204.4 mm in 24 hours) likely over isolated places in Ratnagiri and Raigad districts. Risk of flash floods in Vashishti and Savitri river basins and landslides along NH-66 ghats. Fishermen advised not to venture into the sea.`,
  heat: `[SAMPLE ONLY - NOT LIVE ALERT]
ALERT LEVEL: ORANGE ALERT (BE PREPARED)
HAZARD: Severe Heatwave Conditions & Hot Winds (Loo)
AFFECTED DISTRICTS: Nagpur, Chandrapur, and Wardha
VALIDITY: Next 48 Hours (Peak impact 11:30 AM to 04:30 PM)
Maximum temperatures expected between 45.0°C and 46.8°C with warm nights. High probability of heat illness for outdoor labourers, elderly and children.`,
  aqi: `[SAMPLE ONLY - NOT LIVE ALERT]
ALERT LEVEL: YELLOW ADVISORY (BE UPDATED)
HAZARD: Deterioration of Ambient Air Quality (AQI 315-340 / Very Poor)
AFFECTED REGION: Mumbai, Thane & Navi Mumbai
VALIDITY: Next 36 Hours
People with asthma, respiratory and cardiac conditions, senior citizens and children should avoid prolonged outdoor exertion.`,
  nolevel: `[SAMPLE ONLY - NOT LIVE ALERT]
Thunderstorm with lightning and gusty winds likely at isolated places in Pune and Satara districts this evening. Stay indoors during lightning.`,
}
const $ = id => document.getElementById(id)
const el = (tag, text, cls) => { const n = document.createElement(tag); if (text) n.textContent = text; if (cls) n.className = cls; return n }
const LANGS = [['english', 'English', 'en'], ['marathi', 'मराठी', 'mr'], ['hindi', 'हिंदी', 'hi']]
let selectedLanguage = 'en'
let sampleMode = new URLSearchParams(location.search).get('demo') === '1'

function markSample() {
  sampleMode = true
  $('explainDemoBanner').hidden = false
  $('explainBack').href = '/metro?demo=1'
  $('explainBack').textContent = '← Metro Sachet DEMO'
  const url = new URL(location.href)
  url.searchParams.set('demo', '1')
  history.replaceState(null, '', `${url.pathname}${url.search}${url.hash}`)
}

function selectLanguage(lang) {
  selectedLanguage = lang
  for (const button of document.querySelectorAll('[data-explain-lang]')) {
    button.setAttribute('aria-pressed', String(button.dataset.explainLang === lang))
  }
  for (const block of $('langBlocks').children) block.hidden = block.lang !== lang
}

function render(payload) {
  const d = payload.data
  const sev = ['Red', 'Orange', 'Yellow', 'Green'].includes(d.severity) ? d.severity : 'Not stated'
  const badge = $('severityBadge')
  badge.textContent = sev === 'Not stated' ? 'Level: Not stated' : `${sev} level (as stated)`
  badge.dataset.level = sev.toLowerCase().replace(' ', '-')
  $('hazardType').textContent = d.hazardType || ''
  $('explainMeta').textContent = `Districts: ${(d.districts || []).join(', ') || 'Not stated'} · Validity: ${d.validity || 'Not stated'} · ${payload.source === 'gemini' ? `Explained by Gemini (${payload.model})` : 'Offline fallback'}`
  const note = $('fallbackNote')
  note.hidden = payload.source === 'gemini'
  note.textContent = payload.note || 'Offline fallback: simple keyword-based summary. Read the original alert. / ऑफलाइन सारांश: मूळ सूचना वाचा.'
  const blocks = $('langBlocks'); blocks.replaceChildren()
  for (const [key, title, lang] of LANGS) {
    const b = d[key]; if (!b) continue
    const box = el('div', undefined, 'instruction'); box.lang = lang
    box.append(el('h3', title))
    for (const line of String(b.summary).split('\n')) box.append(el('p', line))
    box.append(el('p', b.districtImpact, 'description'))
    const ol = el('ol'); for (const s of (b.safetySteps || []).slice(0, 3)) ol.append(el('li', s)); box.append(ol)
    blocks.append(box)
  }
  $('explainResult').hidden = false
  selectLanguage(selectedLanguage)
}

async function explain() {
  const alertText = $('alertText').value.trim()
  if (!alertText) { $('explainStatus').textContent = 'Paste an alert first.'; return }
  if (sampleMode || /\[(?:DEMO|SAMPLE)/i.test(alertText)) markSample()
  $('explainResult').hidden = true
  $('explainButton').disabled = true; $('explainStatus').textContent = 'Explaining…'
  try {
    const res = await fetch('/api/explain', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ alertText }) })
    let body
    try { body = await res.json() } catch { throw new Error(`HTTP ${res.status}`) }
    if (!res.ok || !body?.data) throw new Error(typeof body?.error === 'string' ? body.error : `HTTP ${res.status}`)
    render(body); $('explainStatus').textContent = 'Explanation ready. The original alert is still the authority.'
  } catch (error) {
    $('explainStatus').textContent = `Could not explain: ${error.message}. Read the original alert.`
  } finally { $('explainButton').disabled = false }
}

for (const b of document.querySelectorAll('[data-sample]')) b.addEventListener('click', () => { markSample(); $('alertText').value = SAMPLES[b.dataset.sample]; explain() })
for (const button of document.querySelectorAll('[data-explain-lang]')) button.addEventListener('click', () => selectLanguage(button.dataset.explainLang))
$('explainButton').addEventListener('click', explain)
const params = new URLSearchParams(location.hash.slice(1))
if (sampleMode) markSample()
if (params.get('alert')) {
  $('alertText').value = params.get('alert').slice(0, 6000)
  if (/\[(?:DEMO|SAMPLE)/i.test($('alertText').value)) markSample()
  history.replaceState(null, '', `${location.pathname}${location.search}`)
  if (params.get('run') === '1') void explain()
}
