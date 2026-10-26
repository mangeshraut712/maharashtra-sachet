import { alertContent, readAlertSnapshot, safeOfficialUrl, snapshotFresh, sourceStatus } from './ui-model.js'
import { METRO_STATIONS, metroAlerts, metroExplainHref } from './modules/metro-model.mjs'

const $ = id => document.getElementById(id)
const node = (tag, text, className) => {
  const element = document.createElement(tag)
  if (text != null) element.textContent = text
  if (className) element.className = className
  return element
}
const query = new URLSearchParams(location.search)
let demo = query.get('demo') === '1'
let lang = 'en'
let selected = METRO_STATIONS[0].id
let snapshot = null
let error = false
let loading = false
const tx = (en, mr) => lang === 'mr' ? mr : en
const date = value => Number.isFinite(Date.parse(value))
  ? new Date(value).toLocaleString(lang === 'mr' ? 'mr-IN' : 'en-IN', { dateStyle: 'medium', timeStyle: 'short' })
  : tx('Not reported', 'नोंद उपलब्ध नाही')

function render() {
  $('metroDemoBanner').hidden = !demo
  $('metroDemoLink').hidden = demo
  $('metroLiveLink').hidden = !demo
  $('metroHome').href = demo ? '/?demo=1' : '/'
  $('metroDemoBanner').firstElementChild.textContent = tx('DEMO / sample data — not live government alerts. This fixture does not report a Metro incident.', 'DEMO / नमुना माहिती — या थेट शासकीय सूचना नाहीत. ही मेट्रोमधील घटनेची नोंद नाही.')
  $('metroTagline').textContent = tx('Public alerts, along my Metro ride.', 'माझ्या मेट्रो प्रवासातील जिल्ह्याच्या सार्वजनिक सूचना.')
  $('metroIntro').textContent = tx('Choose a station to read Pune district alerts. Every stop maps to the same district; an alert may concern a place far from your station.', 'पुणे जिल्ह्याच्या सूचना वाचण्यासाठी स्थानक निवडा. सर्व स्थानके एकाच जिल्ह्यात येतात; सूचना स्थानकापासून दूरच्या ठिकाणाची असू शकते.')
  $('metroPrecision').textContent = tx('District-alias precision only. No station-level incident, disruption or route-safety claim.', 'फक्त जिल्हा स्तरावरील जुळणी. स्थानकावरील घटना, सेवा खंडित होणे किंवा मार्ग सुरक्षित असल्याचा दावा नाही.')
  $('metroLang').textContent = tx('मराठी', 'English')
  $('metroLang').lang = tx('mr', 'en')
  $('metroLang').setAttribute('aria-label', tx('Switch language to मराठी', 'Switch language to English'))
  $('stationsTitle').textContent = tx('Your stop', 'तुमचे स्थानक')
  $('stationHint').textContent = tx('Select a station. This is a station directory, not a live train map.', 'स्थानक निवडा. ही स्थानकांची यादी आहे; थेट रेल्वे नकाशा नाही.')
  $('metroAlertTitle').textContent = tx('Pune district bulletin', 'पुणे जिल्हा सूचना फलक')
  $('metroRefresh').textContent = tx('Refresh', 'पुन्हा तपासा')
  const station = METRO_STATIONS.find(row => row.id === selected)
  $('metroSelection').textContent = `${station[lang]} → ${tx('Pune district · district alias', 'पुणे जिल्हा · जिल्हा जुळणी')}`
  for (const button of $('metroStations').querySelectorAll('button')) {
    const row = METRO_STATIONS.find(item => item.id === button.dataset.station)
    button.textContent = row[lang]
    button.setAttribute('aria-pressed', String(selected === row.id))
  }
  const status = $('metroStatus')
  status.textContent = loading ? tx('Checking district feed…', 'जिल्ह्याच्या सूचना तपासत आहोत…')
    : error ? tx('Relay unavailable. District alerts cannot be confirmed.', 'रिले अनुपलब्ध. जिल्ह्याच्या सूचनांची खात्री करता येत नाही.')
    : demo ? tx('DEMO / sample data · no live source check', 'DEMO / नमुना माहिती · थेट स्रोत तपासलेला नाही')
    : !snapshotFresh(snapshot?.generatedAt) ? tx('Last-known feed; freshness is not confirmed.', 'शेवटचा उपलब्ध फीड; ताजेपणाची खात्री नाही.')
    : `${tx('Feed status', 'फीडची स्थिती')}: ${snapshot?.status || 'unknown'}. ${tx('Check issuing authorities for complete information.', 'संपूर्ण माहितीसाठी मूळ संस्था तपासा.')}`
  const feed = $('metroFeed')
  feed.replaceChildren()
  const alerts = metroAlerts(snapshot?.alerts || [], selected)
  if (!alerts.length && !loading) feed.append(node('p', error
    ? tx('No confirmed district bulletin is available. Try the labelled demo to explore the product.', 'जिल्ह्याचे खात्रीशीर बुलेटिन उपलब्ध नाही. उत्पादन पाहण्यासाठी नमुना डेमो वापरा.')
    : tx('No current alerts are shown for Pune district. An empty feed is not an all-clear.', 'पुणे जिल्ह्यासाठी सध्याच्या सूचना दिसत नाहीत. रिकामा फीड म्हणजे सर्व सुरक्षित आहे असे नाही.'), 'metro-empty'))
  for (const alert of alerts) {
    const content = alertContent(alert, lang)
    const card = node('article', null, 'metro-alert')
    const sample = demo || alert.demo === true
    card.append(node('p', sample ? 'DEMO / SAMPLE DATA' : tx('RELAYED PUBLIC ALERT', 'रिले केलेली सार्वजनिक सूचना'), 'eyebrow'))
    const title = node('h3', content.headline)
    title.lang = content.language
    card.append(title, node('p', tx('Pune district · relevance to this station is unverified', 'पुणे जिल्हा · या स्थानकाशी संबंध सत्यापित नाही'), 'alert-meta'))
    if (!sample) {
      card.append(node('p', `${tx('Source', 'स्रोत')}: ${alert.sender || alert.source} · ${tx('Issued', 'जारी')}: ${date(alert.sent)}`, 'alert-meta'))
      card.append(node('p', `${tx('Valid until', 'वैधता')}: ${date(alert.expires)}`, 'alert-meta'))
      if (error || !snapshotFresh(snapshot?.generatedAt) || sourceStatus(snapshot?.sources?.[alert.source]) !== 'healthy') {
        card.append(node('p', tx('Last-known message: source freshness is not confirmed. Check the issuing authority.', 'शेवटचा उपलब्ध संदेश: स्रोताच्या ताजेपणाची खात्री नाही. मूळ संस्थेकडे तपासा.'), 'language-note'))
      }
    }
    const description = node('p', content.description)
    description.lang = content.language
    const instruction = node('p', content.instruction, 'instruction')
    instruction.lang = content.language
    card.append(description, instruction)
    if (!sample) {
      const url = safeOfficialUrl(alert.capUrl)
      if (url) {
        const source = node('a', tx('Read original source (opens in a new tab)', 'मूळ स्रोत वाचा (नवीन टॅबमध्ये)'))
        source.href = url; source.target = '_blank'; source.rel = 'noopener noreferrer'
        card.append(source)
      }
    }
    const explain = node('a', tx('Explain in plain words →', 'सोप्या भाषेत समजावून सांगा →'), 'call-button')
    explain.href = metroExplainHref(alert, { demo: sample })
    card.append(node('p', tx('Next: explain this alert, then switch to मराठी.', 'पुढे: सूचना समजावून घ्या आणि मराठी निवडा.'), 'small'), explain)
    feed.append(card)
  }
}

async function request(path) {
  const url = new URL(path, location.origin)
  if (demo) url.searchParams.set('demo', '1')
  const response = await fetch(url, { cache: 'no-store', signal: AbortSignal.timeout(12_000) })
  if (response.status === 409) return { statusCode: 409 }
  if (!response.ok) throw new Error('Unavailable')
  return response.json()
}

async function refresh() {
  if (loading) return
  loading = true; $('metroRefresh').disabled = true; render()
  try {
    const meta = await request('/api/meta')
    // The local npm run demo server is also explicitly sample-only.
    if (meta.environment === 'demo') demo = true
    snapshot = await readAlertSnapshot(params => request(`/api/alerts?district=pune&${params}`))
    error = false
  } catch {
    error = true
  } finally {
    loading = false; $('metroRefresh').disabled = false; render()
  }
}

for (const station of METRO_STATIONS) {
  const item = node('li')
  const button = node('button', station.en)
  button.type = 'button'; button.dataset.station = station.id
  button.setAttribute('aria-controls', 'metroAlerts')
  button.addEventListener('click', () => {
    selected = station.id; render()
    $('metroAlerts').focus({ preventScroll: true })
    $('metroAlerts').scrollIntoView({ behavior: 'smooth', block: 'start' })
  })
  item.append(button); $('metroStations').append(item)
}
$('metroLang').addEventListener('click', () => { lang = lang === 'en' ? 'mr' : 'en'; document.documentElement.lang = lang; render() })
$('metroRefresh').addEventListener('click', refresh)
void refresh()
setInterval(() => { if (!document.hidden) void refresh() }, 60_000)
