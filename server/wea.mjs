/**
 * Map ITU CAP 1.2 onto US Wireless Emergency Alert classes.
 * These are presentation classes only, never an official broadcast designation.
 */
export const WEA_CLASSES = {
  PRESIDENTIAL: {
    id: 'PRESIDENTIAL',
    rank: 100,
    en: 'National emergency',
    mr: 'राष्ट्रीय आणीबाणी',
    hint: 'Highest class — follow official instructions immediately',
  },
  IMMINENT_THREAT: {
    id: 'IMMINENT_THREAT',
    rank: 90,
    en: 'Imminent threat',
    mr: 'तात्काळ धोका',
    hint: 'Life-saving action now — shelter, leave, or stay clear',
  },
  AMBER: {
    id: 'AMBER',
    rank: 80,
    en: 'Child / missing person',
    mr: 'बालक / बेपत्ता',
    hint: 'Legacy presentation class; this relay does not assign official AMBER status',
  },
  PUBLIC_SAFETY: {
    id: 'PUBLIC_SAFETY',
    rank: 60,
    en: 'Public safety',
    mr: 'सार्वजनिक सुरक्षा',
    hint: 'Health, fire, chemical, transport, law-and-order, or civic hazard',
  },
  WEATHER_ADVISORY: {
    id: 'WEATHER_ADVISORY',
    rank: 40,
    en: 'Weather advisory',
    mr: 'हवामान सल्ला',
    hint: 'Stay aware — not a lock-screen emergency unless it escalates',
  },
  TEST: {
    id: 'TEST',
    rank: 10,
    en: 'Test / exercise',
    mr: 'चाचणी',
    hint: 'No public action required',
  },
}

const SEVERITY_RANK = { Extreme: 4, Severe: 3, Moderate: 2, Minor: 1, Unknown: 0 }
const URGENCY_RANK = { Immediate: 4, Expected: 3, Future: 2, Past: 1, Unknown: 0 }

export function weaRank(weaClass) {
  return (WEA_CLASSES[weaClass] || WEA_CLASSES.WEATHER_ADVISORY).rank
}

function primaryCategory(category) {
  if (Array.isArray(category)) return String(category[0] || 'Other')
  return String(category || 'Other')
}

export function classifyWea(alert) {
  const status = alert.status || 'Actual'
  const category = primaryCategory(alert.category)
  const severity = alert.severity || 'Unknown'
  const urgency = alert.urgency || 'Unknown'

  if (status === 'Exercise' || status === 'Test') {
    return 'TEST'
  }
  const imminentCategory = new Set(['Geo', 'Met', 'CBRNE', 'Fire', 'Health', 'Infra', 'Safety'])
  if (
    imminentCategory.has(category) &&
    URGENCY_RANK[urgency] >= 3 && SEVERITY_RANK[severity] >= 3
  ) {
    return 'IMMINENT_THREAT'
  }
  if (['Safety', 'Security', 'Fire', 'Health', 'CBRNE', 'Transport', 'Infra', 'Env', 'Rescue'].includes(category)) {
    return 'PUBLIC_SAFETY'
  }
  if (category === 'Met' || category === 'Geo') return 'WEATHER_ADVISORY'
  return 'PUBLIC_SAFETY'
}

export const SITUATION_KINDS = [
  ['tsunami', 'Tsunami'],
  ['cyclone', 'Cyclone / storm surge'],
  ['flood', 'Flood / dam release'],
  ['landslide', 'Landslide'],
  ['earthquake', 'Earthquake'],
  ['lightning', 'Lightning / thunderstorm'],
  ['heat', 'Heatwave'],
  ['cold', 'Cold wave'],
  ['chemical', 'Chemical / industrial'],
  ['fire', 'Fire'],
  ['health', 'Health / outbreak'],
  ['child', 'Missing child'],
  ['air', 'Air quality'],
  ['rain', 'Rain / nowcast'],
  ['civil', 'Civil / security'],
  ['transport', 'Transport / road closure'],
  ['water', 'Water supply'],
  ['power', 'Power supply'],
  ['infrastructure', 'Infrastructure'],
  ['administration', 'Administrative notice'],
  ['agriculture', 'Agriculture'],
  ['other', 'Other'],
]

export function situationKind(alert) {
  const blob = `${alert.category || ''} ${alert.event || ''} ${alert.headline || ''} ${alert.headlineEn || ''}`.toLowerCase()
  const rules = [
    ['transport', /transport|road closure|railway|traffic|flight|रस्ता बंद|वाहतूक/],
    ['water', /water supply|drinking water|पाणीपुरवठा/],
    ['power', /power outage|power supply|electricity|वीजपुरवठा/],
    ['infrastructure', /infrastructure|bridge collapse|building collapse|पूल कोसळ/],
    ['administration', /administrative|administration|office closure|प्रशासकीय/],
    ['agriculture', /agriculture|crop|pest advisory|शेती|पीक/],
    ['tsunami', /tsunami|सुनामी/],
    ['cyclone', /cyclone|storm surge|चक्रीवादळ/],
    ['flood', /flood|inundat|dam |lake release|पूर|पाणी सोड/],
    ['landslide', /landslide|landslip|दरडी/],
    ['earthquake', /earthquake|भूकंप/],
    ['lightning', /lightning|thunderstorm|विज/],
    ['heat', /heatwave|heat wave|उष्णतेची/],
    ['cold', /cold wave|शीत लहर|थंडी/],
    ['chemical', /chemical|gas leak|cbrne|midc|विषारी|industrial (?:accident|leak|hazard)/],
    ['fire', /fire|आग/],
    ['health', /outbreak|pandemic|dengue|cholera|health/],
    ['child', /missing|abduct|child|बाल/],
    ['air', /aqi|pollution|smog|air quality/],
    ['civil', /security|civil defence|law and order|curfew/],
    ['rain', /rain|पाऊस/],
  ]
  for (const [id, re] of rules) {
    if (re.test(blob)) return id
  }
  const category = primaryCategory(alert.category).toLowerCase()
  if (category === 'transport') return 'transport'
  if (category === 'infra') return 'infrastructure'
  return 'other'
}

export function sortKey(alert) {
  const wea = WEA_CLASSES[alert.weaClass] || WEA_CLASSES.WEATHER_ADVISORY
  const sev = SEVERITY_RANK[alert.severity] || 0
  const urg = URGENCY_RANK[alert.urgency] || 0
  const sent = Date.parse(alert.sent || alert.effective || 0) || 0
  return wea.rank * 1e6 + sev * 1e4 + urg * 1e2 + sent / 1e12
}
