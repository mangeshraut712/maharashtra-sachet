import {
  safeOfficialUrl,
  sourceStatus,
  matchingAlerts,
  alertContent,
  snapshotFresh,
  nextPollMs,
  alertKey,
  isCurrent,
  validSnapshot,
  validMeta,
} from './ui-model.js'

const $ = (id) => document.getElementById(id)
const node = (tag, text, className) => {
  const el = document.createElement(tag)
  if (text !== undefined) el.textContent = text
  if (className) el.className = className
  return el
}
const storage = {
  get(key) {
    try {
      return localStorage.getItem(key)
    } catch {
      return null
    }
  },
  set(key, value) {
    try {
      localStorage.setItem(key, value)
      return true
    } catch {
      return false
    }
  },
}
const EN = Object.fromEntries(
  [...document.querySelectorAll('[data-i18n]')].map((el) => [
    el.dataset.i18n,
    el.innerText,
  ]),
)
const MR = {
  skip: 'सूचनांकडे जा',
  independent: 'स्वतंत्र नागरी उपक्रम · हे शासकीय संकेतस्थळ नाही',
  officialSachet: 'अधिकृत NDMA SACHET ↗',
  brandSub: 'स्वतंत्र सार्वजनिक माहिती संकेतस्थळ',
  alertsNav: 'सूचना',
  coverageNav: 'व्याप्ती',
  servicesNav: 'नागरिक सेवा',
  sourcesNav: 'स्रोतांची स्थिती',
  readinessNav: 'फोन सूचना मार्गदर्शक',
  updateLabel: 'ताजी स्थिती',
  call112: 'आपत्कालीन ११२',
  eyebrow: 'नागरिकांसाठी माहिती',
  heroTitle: 'सार्वजनिक सूचना व नागरिक सेवा',
  heroCopy:
    'आपल्या जिल्ह्यातील सार्वजनिक सूचना शोधा, स्रोतांची अद्ययावत स्थिती तपासा आणि महाराष्ट्रातील आवश्यक सेवांची माहिती मिळवा.',
  heroAside:
    'महाराष्ट्रातील ३६ जिल्हे.\nस्थानिक माहिती. स्पष्ट स्रोत.',
  refresh: 'पुन्हा तपासा',
  demoBanner:
    'चिन्हांकित डेमो · या नोंदी चाचणी नमुने आहेत, लाइव्ह आपत्कालीन सूचना नाहीत.',
  demoAdvance: 'पुढील डेमो टप्पा',
  demoReset: 'डेमो पुन्हा सुरू करा',
  locationEyebrow: 'आपल्या परिसरासाठी',
  locationTitle: 'आपला परिसर निवडा',
  reset: 'फिल्टर हटवा',
  placeLabel: 'शहर, गाव किंवा जिल्हा शोधा',
  search: 'ठिकाण शोधा',
  placeNote:
    'ठिकाणांची नावे जिल्ह्याशी जोडली जातात. अचूक गाव व प्रभाग स्तरावरील व्याप्ती सत्यापित नाही.',
  region: 'प्रदेश',
  district: 'जिल्हा',
  situation: 'परिस्थिती',
  priority: 'सूचना प्रकार',
  alertsTitle: 'सार्वजनिक सूचना फलक',
  servicesEyebrow: 'हवामानापलीकडील माहिती',
  servicesTitle: 'दैनंदिन आवश्यक सेवा',
  servicesNote:
    'प्रत्येक सेवेची व्याप्ती वेगळी आहे. निर्देशिका दुवे अधिकृत संकेतस्थळे उघडतात; ते थेट घटना फीड नाहीत.',
  coverageEyebrow: 'माहितीच्या मर्यादा जाणून घ्या',
  coverageTitle: 'जिल्हानिहाय व्याप्ती',
  coverageNote:
    'जिल्ह्यासाठी सूचना नसणे म्हणजे सर्व सुरक्षित आहे असे नाही. फीडमधील त्रुटी आणि स्थानिक घटना येथे दिसणार नाहीत. महाराष्ट्रातील सीमावर्ती गावे समाविष्ट आहेत; गोवा या रिलेच्या बाहेर आहे.',
  helpEyebrow: 'तातडीने मदत हवी आहे?',
  helpTitle: 'धोका असल्यास आधी कॉल करा.',
  helpNote:
    'संकेतस्थळ अद्ययावत होण्याची वाट पाहू नका. आपत्कालीन सेवांशी संपर्क साधा.',
  emergencyServices: 'आपत्कालीन सेवा',
  helpFoot: 'पोलीस · अग्निशमन · वैद्यकीय मदत',
  sourcesTitle: 'स्रोतांची स्थिती',
  sourcesNote:
    'यशस्वी तपासणीतही शून्य सूचना मिळू शकतात. अनुपलब्ध स्रोतांमुळे माहिती अपूर्ण असू शकते.',
  notificationsTitle: 'जागरूकतेसाठी आणखी एक पाऊल.',
  notificationsNote:
    'हे पृष्ठ उघडे व दिसत असताना आपल्या फिल्टरशी जुळणाऱ्या नवीन तातडीच्या ब्राउझर सूचनांसाठी परवानगी द्या. सूचना मिळण्याची हमी नाही.',
  notify: 'ब्राउझर सूचना चालू करा',
  prepareEyebrow: 'गरज पडण्यापूर्वी',
  prepareTitle: 'साधी तयारी ठेवा.',
  prepareOne:
    'आपत्कालीन संपर्क व जिल्ह्याच्या अधिकृत संकेतस्थळाचा पत्ता जतन करा.',
  prepareTwo: 'सूचना देणाऱ्या संस्थेचे निर्देश व प्रभावित क्षेत्र तपासा.',
  prepareThree: 'असत्यापित स्क्रीनशॉटऐवजी अधिकृत स्रोत शेअर करा.',
  preparedness: 'महाराष्ट्र SDMA मार्गदर्शन ↗',
  aboutTitle: 'सार्वजनिक माहिती. स्पष्ट मर्यादा.',
  aboutNote:
    'हा स्वतंत्र प्रकल्प सार्वजनिक शासकीय फीडमधील माहिती दाखवतो. तो अधिकृत सूचना जारी करत नाही, मदत पाठवत नाही किंवा शासकीय सेल ब्रॉडकास्ट पाठवत नाही. मूळ संस्था व स्थानिक प्रशासनाचे निर्देश पाळा.',
  footer: 'महाराष्ट्रातील जनजागृतीसाठी.',
  footerNote: 'खाते आवश्यक नाही. अचूक स्थानाचा मागोवा नाही.',
  pitchLink: 'प्रकल्प सादरीकरण',
}
const KINDS = {
  tsunami: 'सुनामी',
  cyclone: 'चक्रीवादळ',
  flood: 'पूर',
  landslide: 'दरड',
  earthquake: 'भूकंप',
  lightning: 'विजा / गडगडाट',
  heat: 'उष्णतेची लाट',
  cold: 'थंडीची लाट',
  chemical: 'रासायनिक धोका',
  fire: 'आग',
  health: 'आरोग्य',
  child: 'बेपत्ता बालक',
  air: 'हवेची गुणवत्ता',
  rain: 'पाऊस',
  civil: 'नागरी सुरक्षा',
  other: 'इतर',
  transport: 'वाहतूक',
  water: 'पाणीपुरवठा',
  power: 'वीजपुरवठा',
  infrastructure: 'पायाभूत सुविधा',
  administration: 'प्रशासन',
  admin: 'प्रशासन',
  agriculture: 'शेती',
  industry: 'उद्योग',
}
const SOURCES = {
  sachet: 'NDMA SACHET',
  imd: 'IMD',
  incois: 'INCOIS',
  cwc: 'CWC FloodWatch',
  cpcb: 'CPCB AQI',
}
const URGENT = new Set(['PRESIDENTIAL', 'IMMINENT_THREAT', 'AMBER'])
const state = {
  lang: storage.get('mh-sachet-lang') === 'mr' ? 'mr' : 'en',
  meta: null,
  alerts: [],
  sources: {},
  generatedAt: null,
  status: 'uninitialized',
  error: null,
  offline: !navigator.onLine,
  loaded: false,
  busy: false,
  seen: new Set(),
  primed: false,
  notify: false,
  metaError: false,
  saveFailed: false,
}
const tx = (en, mr) => (state.lang === 'mr' ? mr : en)
const label = (row) =>
  state.lang === 'mr'
    ? row?.mr || row?.en || row?.label || row?.id || ''
    : row?.en || row?.label || row?.id || ''
const filters = () =>
  Object.fromEntries(
    ['district', 'region', 'kind', 'weaClass'].map((id) => [id, $(id).value]),
  )
const date = (iso) =>
  Number.isFinite(Date.parse(iso))
    ? new Date(iso).toLocaleString(state.lang === 'mr' ? 'mr-IN' : 'en-IN', {
        dateStyle: 'medium',
        timeStyle: 'short',
      })
    : tx('Not reported', 'नोंद उपलब्ध नाही')
const number = (n) =>
  Number(n).toLocaleString(state.lang === 'mr' ? 'mr-IN' : 'en-IN')
function officialLink(url, text) {
  const href = safeOfficialUrl(url)
  if (!href) return null
  const link = node('a', text)
  link.href = href
  link.target = '_blank'
  link.rel = 'noopener noreferrer'
  return link
}
function applyLanguage() {
  document.documentElement.lang = state.lang
  document.title = tx(
    'Maharashtra Civic Alerts — Independent public-feed relay',
    'महाराष्ट्र नागरी सतर्कता — स्वतंत्र सार्वजनिक फीड रिले',
  )
  for (const el of document.querySelectorAll('[data-i18n]'))
    el.textContent =
      (state.lang === 'mr' ? MR[el.dataset.i18n] : EN[el.dataset.i18n]) ||
      EN[el.dataset.i18n]
  $('langBtn').textContent = tx('मराठी', 'English')
  $('langBtn').lang = tx('mr', 'en')
  $('place').placeholder = tx(
    'Try Pune, Sawantwadi, Chandgad…',
    'पुणे, सावंतवाडी, चंदगड…',
  )
  $('notifyBtn').textContent = state.notify
    ? tx('Turn notifications off', 'ब्राउझर सूचना बंद करा')
    : tx('Enable notifications', 'ब्राउझर सूचना चालू करा')
  if (!('Notification' in window)) {
    $('notifyBtn').disabled = true
    $('notificationStatus').textContent = tx(
      'This browser does not support notifications. The bulletin still works.',
      'या ब्राउझरमध्ये सूचना उपलब्ध नाहीत. सूचना फलक वापरता येईल.',
    )
  }
}
function fillSelects() {
  const selections = filters()
  const sets = [
    [
      'district',
      state.meta?.districts,
      tx('All Maharashtra districts', 'महाराष्ट्रातील सर्व जिल्हे'),
    ],
    ['region', state.meta?.regions, tx('All regions', 'सर्व प्रदेश')],
    [
      'kind',
      state.meta?.situationKinds,
      tx('All situations', 'सर्व परिस्थिती'),
    ],
    ['weaClass', state.meta?.weaClasses, tx('All categories', 'सर्व प्रकार')],
  ]
  for (const [id, rows, all] of sets) {
    const first = node('option', all)
    first.value = ''
    $(id).replaceChildren(first)
    for (const row of rows || []) {
      const option = node(
        'option',
        id === 'kind' && state.lang === 'mr'
          ? row.mr || KINDS[row.id] || row.en
          : label(row),
      )
      option.value = row.id
      $(id).append(option)
    }
    $(id).value = selections[id]
  }
}
function selectedAlerts() {
  return matchingAlerts(state.alerts, filters(), state.meta?.regions || [])
}
function freshness() {
  if (state.offline) return 'offline'
  if (state.error) return 'error'
  if (!state.loaded || !state.generatedAt || state.status === 'uninitialized')
    return 'loading'
  if (!snapshotFresh(state.generatedAt) || state.status === 'stale')
    return 'stale'
  if (
    state.status === 'degraded' ||
    !Object.keys(state.sources).length ||
    Object.values(state.sources).some((s) => sourceStatus(s) !== 'healthy')
  )
    return 'degraded'
  return 'healthy'
}
function renderStatus() {
  const mode = freshness()
  const text = {
    offline: tx(
      'Offline · Showing last-known information, if available. Check official channels.',
      'ऑफलाइन · उपलब्ध असल्यास शेवटची माहिती दाखवत आहोत. अधिकृत माध्यमे तपासा.',
    ),
    error: tx(
      'Relay unavailable · The last-known bulletin may be outdated. Retry or check official sources.',
      'रिले अनुपलब्ध · शेवटची माहिती जुनी असू शकते. पुन्हा प्रयत्न करा किंवा अधिकृत स्रोत तपासा.',
    ),
    loading: tx(
      'Waiting for a verified feed snapshot · Coverage is not yet known.',
      'फीडमधील माहितीची प्रतीक्षा · सध्याची व्याप्ती अद्याप ज्ञात नाही.',
    ),
    stale: tx(
      'Stale snapshot · This bulletin has not refreshed within 5 minutes. Do not treat it as current.',
      'जुनी माहिती · सूचना फलक ५ मिनिटांत अद्ययावत झालेला नाही. ही वर्तमान माहिती समजू नका.',
    ),
    degraded: tx(
      'Partial coverage · One or more sources are unavailable or not configured. Check source health.',
      'अपूर्ण व्याप्ती · एक किंवा अधिक स्रोत अनुपलब्ध किंवा जोडलेले नाहीत. स्रोतांची स्थिती पहा.',
    ),
    healthy: tx(
      'Connected · Official feeds checked. Local incidents may still be missing.',
      'जोडलेले · अधिकृत फीड तपासले. काही स्थानिक घटना तरीही उपलब्ध नसू शकतात.',
    ),
  }[mode]
  $('connectionText').textContent =
    text +
    (state.metaError
      ? tx(
          ' Location metadata is unavailable.',
          ' ठिकाणांची माहिती अनुपलब्ध आहे.',
        )
      : '')
  $('connection').className =
    `connection ${['offline', 'error'].includes(mode) ? 'offline' : mode !== 'healthy' ? 'warning' : ''}`
  $('snapshotTime').textContent =
    `${tx('Snapshot', 'माहितीची वेळ')}: ${date(state.generatedAt)}` +
    (mode === 'stale' || mode === 'loading'
      ? tx(
          ' · Rechecking every 15 seconds.',
          ' · दर १५ सेकंदाला पुन्हा तपासत आहोत.',
        )
      : '') +
    (state.saveFailed
      ? tx(
          ' · Offline snapshot storage is unavailable.',
          ' · ऑफलाइन माहिती जतन करता येत नाही.',
        )
      : '')
  const demoBanner = $('demoBanner')
  if (demoBanner) demoBanner.hidden = state.meta?.environment !== 'demo'
  $('feed').setAttribute('aria-busy', String(state.busy))
  return mode
}
function renderSources() {
  const list = $('sourceList')
  list.replaceChildren()
  const entries = Object.entries(state.sources)
  if (!entries.length)
    list.append(
      node(
        'p',
        tx(
          'No source health report is available yet.',
          'स्रोतांच्या स्थितीचा अहवाल अद्याप उपलब्ध नाही.',
        ),
        'hint',
      ),
    )
  for (const [id, source] of entries) {
    const status = sourceStatus(source)
    const row = node('div', undefined, 'source-row')
    const top = node('div', undefined, 'source-row-top')
    top.append(node('span', SOURCES[id] || source.name || id))
    const badgeText =
      source.status === 'stale'
        ? tx('Stale', 'जुनी माहिती')
        : status === 'healthy'
          ? tx('Checked', 'तपासले')
          : status === 'disabled'
            ? tx('Not connected', 'जोडलेले नाही')
            : status === 'degraded'
              ? tx('Unavailable', 'अनुपलब्ध')
              : tx('Not checked', 'तपासणी नाही')
    top.append(
      node(
        'span',
        badgeText,
        `source-badge ${status === 'healthy' ? '' : status === 'disabled' ? 'neutral' : 'warn'}`,
      ),
    )
    row.append(top)
    const detail =
      status === 'healthy'
        ? `${number(source.count || 0)} ${tx('records · last success', 'नोंदी · शेवटचे यश')} ${date(source.lastSuccessAt)}`
        : status === 'disabled'
          ? tx(
              'No live data from this source.',
              'या स्रोताकडून थेट माहिती नाही.',
            )
          : tx(
              'Coverage cannot be confirmed for this source.',
              'या स्रोताची व्याप्ती निश्चित करता येत नाही.',
            )
    row.append(node('p', detail, 'small'))
    if (source.error) {
      const details = node('details')
      details.append(
        node('summary', tx('Check details', 'तपशील पहा')),
        node('p', String(source.error).slice(0, 300), 'small'),
      )
      row.append(details)
    }
    list.append(row)
  }
}
function makeCard(alert) {
  const content = alertContent(alert, state.lang)
  const card = node(
    'article',
    undefined,
    `alert-card ${URGENT.has(alert.weaClass) ? 'urgent' : ''}`,
  )
  const bar = node('div', undefined, 'alert-bar')
  const category = state.meta?.weaClasses?.find((c) => c.id === alert.weaClass)
  const kind = state.meta?.situationKinds?.find((c) => c.id === alert.kind)
  bar.append(
    node(
      'span',
      category
        ? label(category)
        : alert.weaClass || tx('Public alert', 'सार्वजनिक सूचना'),
    ),
    node(
      'span',
      state.lang === 'mr'
        ? KINDS[alert.kind] || label(kind)
        : label(kind) || alert.kind || '',
    ),
  )
  const body = node('div', undefined, 'alert-body')
  const title = node(
    'h3',
    content.headline || tx('Official bulletin', 'अधिकृत सूचना'),
  )
  title.lang = content.language
  body.append(title)
  body.append(
    node(
      'p',
      `${alert.sender || SOURCES[alert.source] || alert.source} · ${tx('Issued', 'जारी')}: ${date(alert.sent)}`,
      'alert-meta',
    ),
  )
  body.append(
    node(
      'p',
      `${tx('Area', 'क्षेत्र')}: ${(alert.districts || []).map(label).join(', ') || tx('Not specified; check official source', 'नोंद नाही; अधिकृत स्रोत तपासा')}`,
      'alert-meta',
    ),
  )
  body.append(
    node(
      'p',
      alert.expires
        ? `${tx('Valid until', 'वैधता')}: ${date(alert.expires)}`
        : tx(
            'Expiry not reported — confirm validity with the source.',
            'वैधतेची वेळ उपलब्ध नाही — स्रोताकडे खात्री करा.',
          ),
      'alert-meta',
    ),
  )
  if (
    sourceStatus(state.sources[alert.source]) !== 'healthy' ||
    !snapshotFresh(state.generatedAt) ||
    state.offline ||
    state.error
  )
    body.append(
      node(
        'p',
        tx(
          'Last-known message: freshness is not confirmed. Check the issuing agency.',
          'शेवटचा उपलब्ध संदेश: ताजेपणाची खात्री नाही. मूळ संस्थेकडे तपासा.',
        ),
        'language-note',
      ),
    )
  if (content.fallback) {
    const names =
      state.lang === 'mr'
        ? { en: 'इंग्रजी', hi: 'हिंदी', mr: 'मराठी', und: 'अज्ञात भाषा' }
        : {
            en: 'English',
            hi: 'Hindi',
            mr: 'Marathi',
            und: 'unreported language',
          }
    body.append(
      node(
        'p',
        `${tx('Official text shown in', 'मूळ सूचना या भाषेत आहे')}: ${names[content.language.split('-')[0]] || content.language}. ${tx('Selected-language text is unavailable; no automatic translation.', 'निवडलेल्या भाषेतील मजकूर उपलब्ध नाही; स्वयंचलित भाषांतर केलेले नाही.')}`,
        'language-note',
      ),
    )
  }
  if (content.description) {
    const desc = node('p', content.description, 'description')
    desc.lang = content.language
    body.append(desc)
  }
  if (content.instruction) {
    const instruction = node('div', undefined, 'instruction')
    const text = node('p', content.instruction)
    text.lang = content.language
    instruction.append(
      node('strong', tx('Agency instructions', 'संस्थेचे निर्देश')),
      text,
    )
    body.append(instruction)
  }
  const actions = node('div', undefined, 'alert-actions')
  const sourceUrl =
    safeOfficialUrl(alert.capUrl) ||
    safeOfficialUrl(alert.url) ||
    state.meta?.links?.find(
      (l) =>
        l.id === alert.source ||
        (alert.source === 'cwc' && l.id === 'floodwatch'),
    )?.href
  const link = officialLink(
    sourceUrl,
    tx('Read official source ↗', 'अधिकृत स्रोत वाचा ↗'),
  )
  if (link) actions.append(link)
  else
    actions.append(
      node(
        'span',
        tx('Source link unavailable', 'स्रोताचा दुवा उपलब्ध नाही'),
        'small',
      ),
    )
  body.append(actions)
  card.append(bar, body)
  return card
}
function renderBulletin(mode) {
  const alerts = selectedAlerts()
  const feed = $('feed')
  feed.replaceChildren()
  $('alertCount').textContent =
    state.loaded && state.generatedAt
      ? `${number(alerts.length)} ${tx('alerts', 'सूचना')}`
      : '—'
  const selected =
    state.meta?.districts?.find((d) => d.id === $('district').value) ||
    state.meta?.regions?.find((r) => r.id === $('region').value)
  $('scopeLabel').textContent = selected
    ? label(selected)
    : tx('ACROSS MAHARASHTRA', 'संपूर्ण महाराष्ट्र')
  $('feedNote').textContent = tx(
    'Relayed official messages · Expired alerts are excluded · Times shown in your device’s timezone.',
    'अधिकृत संदेशांचे पुनर्प्रसारण · कालबाह्य सूचना वगळल्या आहेत · वेळ आपल्या उपकरणाच्या वेळक्षेत्रानुसार आहे.',
  )
  if (alerts.length) {
    for (const alert of alerts) feed.append(makeCard(alert))
    return
  }
  const empty = node('div', undefined, 'empty')
  const symbol = node('span', mode === 'healthy' ? '○' : '!', 'empty-symbol')
  symbol.setAttribute('aria-hidden', 'true')
  let title = tx('No matching active alerts', 'जुळणाऱ्या सक्रिय सूचना नाहीत')
  let note = tx(
    'No current messages match these filters. This is not an all-clear. Check official sources and local updates.',
    'या फिल्टरशी जुळणारे वर्तमान संदेश नाहीत. याचा अर्थ सर्व सुरक्षित आहे असा नाही. अधिकृत स्रोत व स्थानिक माहिती तपासा.',
  )
  if (!state.loaded || !state.generatedAt) {
    title = tx(
      'Current alerts cannot be confirmed',
      'वर्तमान सूचनांची खात्री करता येत नाही',
    )
    note = tx(
      'A verified snapshot is not available yet. Use the official source links and retry.',
      'फीडमधील माहिती अद्याप उपलब्ध नाही. अधिकृत दुवे वापरा आणि पुन्हा प्रयत्न करा.',
    )
  } else if (mode !== 'healthy') {
    title = tx(
      'No matching alerts in this snapshot',
      'या माहितीत जुळणाऱ्या सूचना नाहीत',
    )
    note = tx(
      'Coverage is incomplete or outdated. Missing alerts do not mean there is no danger. Check the source health panel.',
      'माहिती अपूर्ण किंवा जुनी आहे. सूचना नसणे म्हणजे धोका नाही असे नाही. स्रोतांची स्थिती पहा.',
    )
  }
  empty.append(symbol, node('h3', title), node('p', note))
  feed.append(empty)
}
function renderCoverage() {
  const counts = new Map((state.meta?.districts || []).map((d) => [d.id, 0]))
  for (const alert of state.alerts.filter((a) => isCurrent(a)))
    for (const district of alert.districts || [])
      if (counts.has(district.id))
        counts.set(district.id, counts.get(district.id) + 1)
  $('districtCount').textContent = state.meta ? number(counts.size) : '—'
  $('coverageGrid').replaceChildren()
  for (const district of state.meta?.districts || []) {
    const count = counts.get(district.id)
    const button = node(
      'button',
      undefined,
      `district-chip ${count ? 'hot' : ''} ${$('district').value === district.id ? 'selected' : ''}`,
    )
    button.type = 'button'
    button.setAttribute(
      'aria-pressed',
      String($('district').value === district.id),
    )
    button.setAttribute(
      'aria-label',
      `${label(district)}: ${state.loaded && state.generatedAt ? `${number(count)} ${tx('relayed active alerts', 'सक्रिय रिले सूचना')}` : tx('coverage not known', 'व्याप्ती ज्ञात नाही')}`,
    )
    button.append(
      node('span', label(district)),
      node(
        'span',
        state.loaded && state.generatedAt ? number(count) : '—',
        'district-number',
      ),
    )
    button.addEventListener('click', () => {
      $('district').value = district.id
      $('region').value = ''
      render()
      $('alerts').focus()
    })
    $('coverageGrid').append(button)
  }
}
function renderServices() {
  $('serviceGrid').replaceChildren()
  const icons = {
    transport: '↔',
    water: '≈',
    power: 'ϟ',
    infrastructure: '⌂',
    administration: '▤',
    agriculture: '♧',
    health: '+',
    industry: '▥',
    weather: '☁',
    disaster: '△',
  }
  for (const service of state.meta?.serviceCategories || []) {
    const card = node('article', undefined, 'service-card')
    const icon = node('span', icons[service.id] || '↗', 'service-icon')
    icon.setAttribute('aria-hidden', 'true')
    card.append(icon, node('h3', label(service)))
    const live = [
      'public-feed',
      'live',
      'partial-feed',
      'source-dependent',
    ].includes(service.coverage)
    card.append(
      node(
        'p',
        live
          ? tx('Partial public-feed coverage', 'अंशतः सार्वजनिक फीड')
          : tx(
              'Official directory · No live feed',
              'अधिकृत निर्देशिका · थेट फीड नाही',
            ),
        'small',
      ),
    )
    const link = officialLink(
      service.officialUrl,
      tx('Official portal ↗', 'अधिकृत संकेतस्थळ ↗'),
    )
    if (link) card.append(link)
    if (service.note) {
      const details = node('details')
      const note = node(
        'p',
        state.lang === 'mr' ? service.noteMr || service.note : service.note,
      )
      if (state.lang === 'mr' && !service.noteMr) note.lang = 'en'
      details.append(
        node('summary', tx('Coverage details', 'व्याप्तीचा तपशील')),
        note,
      )
      card.append(details)
    }
    $('serviceGrid').append(card)
  }
  if (!$('serviceGrid').children.length)
    $('serviceGrid').append(
      node(
        'p',
        tx(
          'Service directory is unavailable. Use the official agency links below.',
          'सेवा निर्देशिका उपलब्ध नाही. खालील अधिकृत संस्थांचे दुवे वापरा.',
        ),
        'hint',
      ),
    )
  $('officialLinks').replaceChildren()
  for (const item of state.meta?.links || []) {
    const link = officialLink(item.href || item.url, `${label(item)} ↗`)
    if (link) $('officialLinks').append(link)
  }
}
function render() {
  applyLanguage()
  const mode = renderStatus()
  renderBulletin(mode)
  renderSources()
  renderCoverage()
  renderServices()
}

async function request(url, { method = 'GET' } = {}) {
  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), 15_000)
  try {
    const response = await fetch(url, {
      method,
      cache: 'no-store',
      signal: controller.signal,
      headers: { accept: 'application/json' },
    })
    if (!response.ok) throw new Error(`HTTP ${response.status}`)
    return await response.json()
  } finally {
    clearTimeout(timeout)
  }
}
async function fullSnapshot() {
  const first = await request('/api/alerts?limit=500')
  if (!validSnapshot(first)) throw new Error('Invalid alert snapshot')
  const alerts = [...first.alerts]
  let next = first.pagination?.nextOffset
  let pages = 0
  while (next != null) {
    if (++pages > 50) throw new Error('Snapshot exceeds supported page count')
    const query = new URLSearchParams({
      limit: '500',
      offset: String(next),
      snapshot: first.pagination.snapshot || first.generatedAt || '',
    })
    const page = await request(`/api/alerts?${query}`)
    if (
      page.generatedAt !== first.generatedAt ||
      !validSnapshot(page) ||
      (page.pagination?.nextOffset != null &&
        page.pagination.nextOffset <= next)
    )
      throw new Error('Snapshot changed during pagination')
    alerts.push(...page.alerts)
    next = page.pagination?.nextOffset
  }
  if (
    first.pagination?.total != null &&
    alerts.length !== first.pagination.total
  )
    throw new Error('Incomplete alert snapshot')
  if (!first.pagination && first.count > alerts.length)
    throw new Error('Truncated alert snapshot')
  return { ...first, alerts }
}
function notifyNew(alerts) {
  const fresh = new Set(
    alerts.filter((a) => !state.seen.has(alertKey(a))).map(alertKey),
  )
  for (const alert of alerts) state.seen.add(alertKey(alert))
  if (state.seen.size > 10_000)
    state.seen = new Set([...state.seen].slice(-5000))
  if (!state.primed) {
    state.primed = true
    return
  }
  if (
    !state.notify ||
    document.visibilityState !== 'visible' ||
    !('Notification' in window) ||
    Notification.permission !== 'granted' ||
    !snapshotFresh(state.generatedAt) ||
    state.offline
  )
    return
  const alert = selectedAlerts().find(
    (a) => fresh.has(alertKey(a)) && URGENT.has(a.weaClass),
  )
  if (alert)
    try {
      new Notification(
        tx('Maharashtra · New urgent alert', 'महाराष्ट्र · नवीन तातडीची सूचना'),
        {
          body: alertContent(alert, state.lang).headline,
          tag: alertKey(alert),
          silent: true,
        },
      )
    } catch {
      $('notificationStatus').textContent = tx(
        'Notifications could not be displayed. Use the bulletin.',
        'ब्राउझर सूचना दाखवता आल्या नाहीत. सूचना फलक वापरा.',
      )
    }
}
function restoreSnapshot() {
  try {
    const raw = storage.get('mh-sachet-snapshot')
    if (!raw || raw.length > 2_000_000) return
    const saved = JSON.parse(raw)
    if (!validSnapshot(saved?.body) || !validMeta(saved?.meta)) return
    state.meta = saved.meta
    Object.assign(state, {
      alerts: saved.body.alerts,
      sources: saved.body.sources || {},
      generatedAt: saved.body.generatedAt,
      status: saved.body.status || 'stale',
      loaded: true,
      error: 'restored',
    })
    for (const alert of state.alerts) state.seen.add(alertKey(alert))
    fillSelects()
  } catch {
    /* Storage may be denied or a previous version may be malformed. */
  }
}
let refreshTimer
async function refresh() {
  if (state.busy) return
  clearTimeout(refreshTimer)
  state.busy = true
  $('refreshBtn').disabled = true
  renderStatus()
  try {
    const results = await Promise.allSettled([
      request('/api/meta'),
      fullSnapshot(),
    ])
    if (results[0].status === 'fulfilled' && validMeta(results[0].value)) {
      state.meta = results[0].value
      state.metaError = false
      fillSelects()
    } else state.metaError = true
    if (results[1].status === 'rejected') throw results[1].reason
    const body = results[1].value
    Object.assign(state, {
      alerts: body.alerts,
      sources: body.sources || {},
      generatedAt: body.generatedAt,
      status: body.status || 'unknown',
      loaded: true,
      error: null,
      offline: !navigator.onLine,
    })
    notifyNew(state.alerts)
    if (state.meta) {
      const saved = JSON.stringify({ meta: state.meta, body })
      state.saveFailed =
        saved.length > 2_000_000 || !storage.set('mh-sachet-snapshot', saved)
    }
  } catch (error) {
    state.error = error.message
    state.offline = !navigator.onLine
  } finally {
    state.busy = false
    $('refreshBtn').disabled = false
    render()
    refreshTimer = setTimeout(refresh, nextPollMs(freshness()))
  }
}
let searchSequence = 0
$('locationForm').addEventListener('submit', async (event) => {
  event.preventDefault()
  const query = $('place').value.trim()
  const sequence = ++searchSequence
  $('placeResults').replaceChildren()
  if (query.length < 2) {
    $('placeResults').append(
      node(
        'p',
        tx('Enter at least two characters.', 'किमान दोन अक्षरे लिहा.'),
        'hint',
      ),
    )
    return
  }
  $('placeResults').append(
    node('p', tx('Finding district matches…', 'जिल्हे शोधत आहोत…'), 'hint'),
  )
  try {
    const body = await request(
      `/api/locations?${new URLSearchParams({ q: query })}`,
    )
    if (sequence !== searchSequence) return
    $('placeResults').replaceChildren()
    for (const place of body.locations || []) {
      const button = node(
        'button',
        `${place.name} · ${state.lang === 'mr' ? place.districtMr : place.districtEn}`,
      )
      button.type = 'button'
      button.addEventListener('click', () => {
        $('district').value = place.districtId
        $('region').value = ''
        $('placeResults').replaceChildren(
          node(
            'p',
            `${place.name}: ${tx('district-level match; exact village/ward coverage is not verified.', 'जिल्हा स्तरावरील जुळणी; अचूक गाव/प्रभाग व्याप्ती सत्यापित नाही.')}`,
            'hint',
          ),
        )
        render()
      })
      $('placeResults').append(button)
    }
    if (!$('placeResults').children.length)
      $('placeResults').append(
        node(
          'p',
          tx(
            'No verified place match. Select a district above; this is not a complete village directory.',
            'ठिकाणाची जुळणी नाही. वरील जिल्हा निवडा; ही सर्व गावांची निर्देशिका नाही.',
          ),
          'hint',
        ),
      )
  } catch {
    if (sequence === searchSequence)
      $('placeResults').replaceChildren(
        node(
          'p',
          tx(
            'Place search is unavailable. Use the district filter.',
            'ठिकाण शोध उपलब्ध नाही. जिल्हा फिल्टर वापरा.',
          ),
          'hint',
        ),
      )
  }
})
$('langBtn').addEventListener('click', () => {
  state.lang = state.lang === 'en' ? 'mr' : 'en'
  storage.set('mh-sachet-lang', state.lang)
  $('placeResults').replaceChildren()
  $('notificationStatus').textContent = ''
  fillSelects()
  render()
})
$('refreshBtn').addEventListener('click', refresh)
async function runDemoControl(action) {
  if (state.meta?.environment !== 'demo') return
  const controls = [$('demoAdvance'), $('demoReset')]
  controls.forEach(button => { button.disabled = true })
  try {
    const result = await request(`/__demo/${action}`, { method: 'POST' })
    $('demoStatus').textContent = tx(
      `Demo step ${result.step} loaded.`,
      `डेमो टप्पा ${result.step} दाखवला आहे.`,
    )
    await refresh()
  } catch {
    $('demoStatus').textContent = tx(
      'Demo control failed. Restart the local demo server.',
      'डेमो नियंत्रण अयशस्वी. स्थानिक डेमो सर्व्हर पुन्हा सुरू करा.',
    )
  } finally {
    controls.forEach(button => { button.disabled = false })
  }
}
$('demoAdvance').addEventListener('click', () => runDemoControl('advance'))
$('demoReset').addEventListener('click', () => runDemoControl('reset'))
$('resetBtn').addEventListener('click', () => {
  for (const id of ['district', 'region', 'kind', 'weaClass']) $(id).value = ''
  $('place').value = ''
  $('placeResults').replaceChildren()
  searchSequence++
  render()
})
for (const id of ['district', 'region', 'kind', 'weaClass'])
  $(id).addEventListener('change', () => {
    if (id === 'region') $('district').value = ''
    $('placeResults').replaceChildren()
    render()
  })
$('notifyBtn').addEventListener('click', async () => {
  if (state.notify) {
    state.notify = false
    $('notificationStatus').textContent = tx(
      'Notifications are off for this page.',
      'या पृष्ठासाठी ब्राउझर सूचना बंद आहेत.',
    )
    applyLanguage()
    return
  }
  if (!('Notification' in window)) return
  try {
    const permission = await Notification.requestPermission()
    state.notify = permission === 'granted'
    for (const a of state.alerts) state.seen.add(alertKey(a))
    $('notificationStatus').textContent = state.notify
      ? tx(
          'On for this visit. Only new matching urgent alerts while this page is visible.',
          'या भेटीसाठी चालू. पृष्ठ दिसत असताना फक्त नवीन जुळणाऱ्या तातडीच्या सूचना.',
        )
      : tx(
          'Permission was not granted. You can still read all alerts here.',
          'परवानगी मिळाली नाही. सर्व सूचना येथे वाचता येतील.',
        )
    applyLanguage()
  } catch {
    $('notificationStatus').textContent = tx(
      'Notifications are unavailable in this browser.',
      'या ब्राउझरमध्ये सूचना उपलब्ध नाहीत.',
    )
  }
})
window.addEventListener('offline', () => {
  state.offline = true
  render()
})
window.addEventListener('online', () => {
  state.offline = false
  refresh()
})
document.addEventListener('visibilitychange', () => {
  if (document.visibilityState === 'visible') refresh()
})
if ('serviceWorker' in navigator)
  navigator.serviceWorker.register('/sw.js').catch(() => {
    $('notificationStatus').textContent = tx(
      'Offline shell unavailable; online browsing still works.',
      'ऑफलाइन पृष्ठ उपलब्ध नाही; ऑनलाइन वापर सुरू आहे.',
    )
  })
restoreSnapshot()
applyLanguage()
render()
refresh()
