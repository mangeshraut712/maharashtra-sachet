const LANG = {
  en: {
    title: 'Maharashtra Civic Alert Relay',
    tag: 'Unofficial public-feed relay · not NDMA / MSDMA / IMD',
    langBtn: 'मराठी',
    notify: 'Enable alerts',
    notifyOn: 'Alerts on',
    sirenOn: 'Siren: on',
    sirenOff: 'Siren: off',
    bannerTitle: 'This is not a government website.',
    bannerBody:
      'It only republishes public Common Alerting Protocol and allied feeds. It cannot send Wireless Emergency Alerts or cell broadcasts. For life-threatening events call 112.',
    district: 'District',
    region: 'Region',
    weaClass: 'WEA class',
    situation: 'Situation',
    allDistricts: 'All 36 districts',
    allRegions: 'All regions',
    allClasses: 'All classes',
    allKinds: 'All situations',
    coverageTitle: 'All 36 Maharashtra districts',
    coverageNote:
      'Every district stays on the map even with no live card. Goa state is excluded. Sindhudurg and Kolhapur still cover the border gaons (Sawantwadi, Dodamarg, Chandgad, Tillari).',
    mapNote:
      'Polygons come from NDMA SACHET CAP when the feed includes them. Light rain nowcasts often have no polygon.',
    empty: 'No matching alerts right now. Keep this page open — the relay polls official feeds about every 45 seconds.',
    until: 'Until',
    source: 'Source',
    call112: 'Call 112',
    call1098: 'Call 1098',
    official: 'Open official source',
    speak: 'Speak',
    districts: 'Districts',
    updated: 'Updated',
    emergency: 'EMERGENCY ALERT',
  },
  mr: {
    title: 'महाराष्ट्र नागरी सतर्कता रिले',
    tag: 'अनाधिकृत सार्वजनिक फीड रिले · एनडीएमए / एसडीएमए / आयएमडी नाही',
    langBtn: 'English',
    notify: 'सूचना चालू करा',
    notifyOn: 'सूचना चालू',
    sirenOn: 'सायरन: चालू',
    sirenOff: 'सायरन: बंद',
    bannerTitle: 'ही शासकीय संकेतस्थळ नाही.',
    bannerBody:
      'येथे फक्त सार्वजनिक CAP आणि संबंधित शासकीय फीड परत दाखवले जातात. वायरलेस इमर्जन्सी अलर्ट किंवा सेल ब्रॉडकास्ट पाठवता येत नाहीत. जीवाची भीती असेल तर ११२ वर कॉल करा.',
    district: 'जिल्हा',
    region: 'प्रदेश',
    weaClass: 'WEA वर्ग',
    situation: 'परिस्थिती',
    allDistricts: 'सर्व ३६ जिल्हे',
    allRegions: 'सर्व प्रदेश',
    allClasses: 'सर्व वर्ग',
    allKinds: 'सर्व परिस्थिती',
    coverageTitle: 'महाराष्ट्राचे सर्व ३६ जिल्हे',
    coverageNote:
      'लाईव्ह कार्ड नसला तरी जिल्हा नकाशात राहतो. गोवा राज्य नाही. सिंधुदुर्ग / कोल्हापूर सीमा गावे (सावंतवाडी, दोडामार्ग, चंदगड, तिल्लारी) महाराष्ट्रात आहेत.',
    mapNote:
      'बहुभुजे NDMA SACHET CAP मध्ये असतील तेव्हा दिसतात. हलका पाऊस नाऊकास्ट बहुतेकदा बहुभुज नसतो.',
    empty: 'सध्या जुळणारे अलर्ट नाहीत. पृष्ठ उघडे ठेवा — रिले सुमारे ४५ सेकंदांनी अधिकृत फीड तपासतो.',
    until: 'पर्यंत',
    source: 'स्रोत',
    call112: '११२ कॉल',
    call1098: '१०९८ कॉल',
    official: 'अधिकृत स्रोत',
    speak: 'ऐका',
    districts: 'जिल्हे',
    updated: 'अद्यतन',
    emergency: 'आणीबाणी सूचना',
  },
}

const KIND_MR = {
  tsunami: 'सुनामी',
  cyclone: 'चक्रीवादळ',
  flood: 'पूर',
  landslide: 'दरड',
  earthquake: 'भूकंप',
  lightning: 'विज / गडगडाट',
  heat: 'उष्णतेची लाट',
  cold: 'थंडीची लाट',
  chemical: 'रासायनिक / औद्योगिक',
  fire: 'आग',
  health: 'आरोग्य',
  child: 'बेपत्ता बालक',
  air: 'हवेची गुणवत्ता',
  rain: 'पाऊस / नाऊकास्ट',
  civil: 'नागरी / सुरक्षा',
  other: 'इतर',
}

const state = {
  lang: localStorage.getItem('mh-sachet-lang') || 'en',
  siren: localStorage.getItem('mh-sachet-siren') !== 'off',
  meta: null,
  alerts: [],
  stats: {},
  generatedAt: null,
  seen: new Set(JSON.parse(localStorage.getItem('mh-sachet-seen') || '[]')),
}

const $ = (id) => document.getElementById(id)

function t() {
  return LANG[state.lang]
}

function applyLang() {
  const L = t()
  $('title').textContent = L.title
  document.title = `${L.title} — unofficial`
  $('tag').textContent = L.tag
  $('langBtn').textContent = L.langBtn
  $('bannerTitle').textContent = L.bannerTitle
  $('bannerBody').textContent = L.bannerBody
  $('lblDistrict').textContent = L.district
  $('lblRegion').textContent = L.region
  $('lblClass').textContent = L.weaClass
  $('lblKind').textContent = L.situation
  $('coverageTitle').textContent = L.coverageTitle
  $('coverageNote').textContent = L.coverageNote
  $('mapNote').textContent = L.mapNote
  $('sirenBtn').textContent = state.siren ? L.sirenOn : L.sirenOff
  $('notifyBtn').textContent = Notification?.permission === 'granted' ? L.notifyOn : L.notify
  document.documentElement.lang = state.lang === 'mr' ? 'mr' : 'en'
}

function headline(alert) {
  return state.lang === 'mr' ? alert.headlineMr || alert.headlineEn : alert.headlineEn || alert.headlineMr
}

function weaLabel(id) {
  const row = state.meta?.weaClasses?.find((c) => c.id === id)
  if (!row) return id
  return state.lang === 'mr' ? row.mr : row.en
}

function fillSelects() {
  const prevDistrict = $('district').value
  const prevKind = $('kind').value
  const prevRegion = $('region').value
  const district = $('district')
  const kind = $('kind')
  const region = $('region')
  district.innerHTML = `<option value="">${t().allDistricts}</option>`
  const byDiv = new Map()
  for (const d of state.meta.districts) {
    if (!byDiv.has(d.division)) byDiv.set(d.division, [])
    byDiv.get(d.division).push(d)
  }
  for (const [div, list] of byDiv) {
    const group = document.createElement('optgroup')
    group.label = div
    for (const d of list) {
      const opt = document.createElement('option')
      opt.value = d.id
      opt.textContent = state.lang === 'mr' ? d.mr : d.en
      group.appendChild(opt)
    }
    district.appendChild(group)
  }
  district.value = prevDistrict
  region.innerHTML = `<option value="">${t().allRegions}</option>`
  for (const r of state.meta.regions || []) {
    const opt = document.createElement('option')
    opt.value = r.id
    opt.textContent = `${state.lang === 'mr' ? r.mr : r.en} (${r.districtIds.length})`
    region.appendChild(opt)
  }
  region.value = prevRegion
  kind.innerHTML = `<option value="">${t().allKinds}</option>`
  for (const k of state.meta.situationKinds) {
    const opt = document.createElement('option')
    opt.value = k.id
    opt.textContent = state.lang === 'mr' ? KIND_MR[k.id] || k.en : k.en
    kind.appendChild(opt)
  }
  kind.value = prevKind
  const cls = $('weaClass')
  cls.options[0].textContent = t().allClasses
}

function filtered() {
  const district = $('district').value
  const weaClass = $('weaClass').value
  const kind = $('kind').value
  const region = $('region').value
  const allowed = region ? new Set((state.meta.regions || []).find((r) => r.id === region)?.districtIds || []) : null
  return state.alerts.filter((a) => {
    if (district && !(a.districts || []).some((d) => d.id === district)) return false
    if (allowed && !(a.districts || []).some((d) => allowed.has(d.id))) return false
    if (weaClass && a.weaClass !== weaClass) return false
    if (kind && a.kind !== kind) return false
    return true
  })
}

function formatWhen(iso) {
  if (!iso) return ''
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return iso
  return d.toLocaleString(state.lang === 'mr' ? 'mr-IN' : 'en-IN', { hour12: true })
}

function persistSeen() {
  const ids = [...state.seen].slice(-400)
  localStorage.setItem('mh-sachet-seen', JSON.stringify(ids))
}

function playSiren() {
  if (!state.siren) return
  const ctx = new AudioContext()
  const osc = ctx.createOscillator()
  const gain = ctx.createGain()
  osc.type = 'sawtooth'
  osc.frequency.value = 880
  gain.gain.value = 0.04
  osc.connect(gain)
  gain.connect(ctx.destination)
  osc.start()
  let up = true
  const pulse = setInterval(() => {
    osc.frequency.value = up ? 620 : 880
    up = !up
  }, 180)
  setTimeout(() => {
    clearInterval(pulse)
    osc.stop()
    ctx.close()
  }, 1800)
}

let primed = false

function notifyNew(alerts) {
  if (!primed) {
    for (const a of alerts) state.seen.add(a.id)
    primed = true
    persistSeen()
    return
  }
  const fresh = alerts.filter((a) => !state.seen.has(a.id))
  for (const a of alerts) state.seen.add(a.id)
  persistSeen()
  const high = fresh.filter((a) => ['PRESIDENTIAL', 'IMMINENT_THREAT', 'AMBER'].includes(a.weaClass))
  if (high.length) playSiren()
  if (Notification?.permission !== 'granted' || high.length === 0) return
  const a = high[0]
  new Notification(`${weaLabel(a.weaClass)} · Maharashtra`, {
    body: headline(a),
    tag: a.id,
  })
}

let map
let polyLayer

function ensureMap() {
  if (map) return
  map = L.map('map', { zoomControl: true }).setView([19.2, 76.0], 6)
  L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    attribution: '&copy; OpenStreetMap',
    maxZoom: 18,
  }).addTo(map)
  polyLayer = L.layerGroup().addTo(map)
}

function colorFor(weaClass) {
  switch (weaClass) {
    case 'PRESIDENTIAL':
    case 'IMMINENT_THREAT':
      return '#c81e1e'
    case 'AMBER':
      return '#c47a00'
    case 'PUBLIC_SAFETY':
      return '#1d4ed8'
    case 'WEATHER_ADVISORY':
      return '#64748b'
    case 'TEST':
      return '#15803d'
    default:
      return '#64748b'
  }
}

function drawMap(alerts) {
  ensureMap()
  polyLayer.clearLayers()
  const bounds = []
  for (const a of alerts) {
    for (const ring of a.polygons || []) {
      const latlngs = ring.map(([lat, lon]) => [lat, lon])
      const layer = L.polygon(latlngs, {
        color: colorFor(a.weaClass),
        weight: 2,
        fillOpacity: 0.25,
      }).bindPopup(`<strong>${headline(a)}</strong>`)
      polyLayer.addLayer(layer)
      for (const p of latlngs) bounds.push(p)
    }
  }
  if (bounds.length) map.fitBounds(bounds, { padding: [24, 24], maxZoom: 10 })
  else map.setView([19.2, 76.0], 6)
}

function speak(alert) {
  const text = [weaLabel(alert.weaClass), headline(alert), alert.instruction].filter(Boolean).join('. ')
  const u = new SpeechSynthesisUtterance(text)
  u.lang = state.lang === 'mr' ? 'mr-IN' : 'en-IN'
  speechSynthesis.cancel()
  speechSynthesis.speak(u)
}

function card(alert) {
  const L = t()
  const districts = (alert.districts || []).map((d) => (state.lang === 'mr' ? d.mr : d.en)).join(', ')
  const until = alert.expires ? `${L.until} ${formatWhen(alert.expires)}` : formatWhen(alert.sent)
  const el = document.createElement('article')
  el.className = `wea ${alert.weaClass}`
  el.innerHTML = `
    <div class="bar">
      <span>${L.emergency} · ${weaLabel(alert.weaClass).toUpperCase()}</span>
      <span>${alert.kind || ''}</span>
    </div>
    <div class="body">
      <h2>${headline(alert)}</h2>
      <div class="meta">${L.source}: ${alert.sender || alert.author || alert.source} · ${until}${districts ? ` · ${L.districts}: ${districts}` : ''}</div>
      <div class="desc">${alert.description || ''}</div>
      ${alert.instruction ? `<div class="instr">${alert.instruction}</div>` : ''}
      <div class="actions">
        <a href="tel:112">${L.call112}</a>
        ${alert.weaClass === 'AMBER' ? `<a href="tel:1098">${L.call1098}</a>` : ''}
        ${alert.capUrl ? `<a href="${alert.capUrl}" target="_blank" rel="noopener">${L.official}</a>` : ''}
        <button type="button" data-speak="${alert.id}">${L.speak}</button>
      </div>
    </div>
  `
  el.querySelector('[data-speak]')?.addEventListener('click', () => speak(alert))
  return el
}

function render() {
  applyLang()
  const alerts = filtered()
  const feed = $('feed')
  feed.innerHTML = ''
  if (alerts.length === 0) {
    const empty = document.createElement('div')
    empty.className = 'empty'
    empty.textContent = t().empty
    feed.appendChild(empty)
  } else {
    for (const a of alerts) feed.appendChild(card(a))
  }
  const bits = [
    `${t().updated} ${formatWhen(state.generatedAt) || '—'}`,
    `${alerts.length} / ${state.alerts.length}`,
  ]
  if (state.stats?.byClass) {
    bits.push(
      Object.entries(state.stats.byClass)
        .map(([k, n]) => `${k}:${n}`)
        .join(' · '),
    )
  }
  $('statusRow').textContent = bits.join('  ·  ')
  renderCoverage()
  drawMap(alerts)
}

function renderCoverage() {
  const grid = $('coverageGrid')
  if (!grid || !state.meta?.districts) return
  const counts = Object.fromEntries(state.meta.districts.map((d) => [d.id, 0]))
  for (const a of state.alerts) {
    for (const d of a.districts || []) {
      if (counts[d.id] != null) counts[d.id] += 1
    }
  }
  const hot = Object.values(counts).filter((n) => n > 0).length
  $('coverageTitle').textContent = `${t().coverageTitle} · ${hot}/36`
  const region = $('region')?.value
  const allowed = region ? new Set((state.meta.regions || []).find((r) => r.id === region)?.districtIds || []) : null
  grid.innerHTML = ''
  for (const d of state.meta.districts) {
    const chip = document.createElement('div')
    chip.className = counts[d.id] ? 'chip hot' : 'chip'
    if (allowed) chip.classList.add(allowed.has(d.id) ? 'in-region' : 'out-region')
    chip.title = d.division
    chip.textContent = `${state.lang === 'mr' ? d.mr : d.en}${counts[d.id] ? ` (${counts[d.id]})` : ''}`
    grid.appendChild(chip)
  }
}

async function loadMeta() {
  const res = await fetch('/api/meta')
  state.meta = await res.json()
  fillSelects()
  const help = $('helplines')
  help.innerHTML = ''
  for (const h of state.meta.helplines.slice(0, 5)) {
    const a = document.createElement('a')
    a.href = `tel:${h.tel}`
    a.textContent = h.label
    a.title = h.detail
    help.appendChild(a)
  }
}

async function loadAlerts() {
  const res = await fetch('/api/alerts?limit=200')
  const body = await res.json()
  state.alerts = body.alerts || []
  state.stats = body.stats || {}
  state.generatedAt = body.generatedAt
  notifyNew(state.alerts)
  render()
}

function bind() {
  $('langBtn').addEventListener('click', () => {
    state.lang = state.lang === 'en' ? 'mr' : 'en'
    localStorage.setItem('mh-sachet-lang', state.lang)
    fillSelects()
    render()
  })
  $('sirenBtn').addEventListener('click', () => {
    state.siren = !state.siren
    localStorage.setItem('mh-sachet-siren', state.siren ? 'on' : 'off')
    applyLang()
  })
  $('notifyBtn').addEventListener('click', async () => {
    if (!('Notification' in window)) return
    await Notification.requestPermission()
    applyLang()
  })
  $('district').addEventListener('change', render)
  $('region').addEventListener('change', render)
  $('weaClass').addEventListener('change', render)
  $('kind').addEventListener('change', render)
}

function live() {
  try {
    const es = new EventSource('/api/alerts/live')
    es.onmessage = (ev) => {
      const body = JSON.parse(ev.data)
      state.alerts = body.alerts || []
      state.stats = body.stats || {}
      state.generatedAt = body.generatedAt
      notifyNew(state.alerts)
      render()
    }
  } catch {
    setInterval(loadAlerts, 20_000)
  }
}

if ('serviceWorker' in navigator) {
  navigator.serviceWorker.register('/sw.js').catch(() => {})
}

bind()
applyLang()
await loadMeta()
await loadAlerts()
live()
