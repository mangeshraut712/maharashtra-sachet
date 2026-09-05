/** 36 Maharashtra districts, regions, and place aliases. Goa is a neighbouring state — not listed. */

function d(row) {
  return {
    aliases: [],
    places: [],
    imdTitles: [],
    ...row,
  }
}

export const DISTRICTS = [
  d({
    lgd: '466', census2011: '522', id: 'ahilyanagar', en: 'Ahilyanagar', mr: 'अहिल्यानगर', division: 'Nashik',
    aliases: ['ahmednagar', 'ahmed nagar'],
    imdTitles: ['ahilyanagar', 'ahmednagar', 'ahmed nagar'],
    places: ['shirdi', 'sangamner', 'kopargaon', 'shrirampur', 'rahuri', 'newasa', 'shevgaon', 'pathardi', 'karjat ahmednagar', 'jamkhed', 'parner', 'akole', 'bhandardara', 'wilson dam', 'loni'],
  }),
  d({
    lgd: '467', census2011: '501', id: 'akola', en: 'Akola', mr: 'अकोला', division: 'Amravati',
    imdTitles: ['akola'],
    places: ['akot', 'balapur', 'patur', 'murtizapur', 'telhara', 'barshitakli'],
  }),
  d({
    lgd: '468', census2011: '503', id: 'amravati', en: 'Amravati', mr: 'अमरावती', division: 'Amravati',
    imdTitles: ['amravati'],
    places: ['achalpur', 'warud', 'morshi', 'daryapur', 'anjangaon', 'chandur bazar', 'dharni', 'chikhaldara', 'melghat'],
  }),
  d({
    lgd: '470', census2011: '523', id: 'beed', en: 'Beed', mr: 'बीड', division: 'Chhatrapati Sambhajinagar',
    aliases: ['bhir', 'bid'],
    imdTitles: ['beed', 'bid', 'bhir'],
    places: ['georai', 'parli', 'ambajogai', 'majalgaon', 'kaij', 'wadwani', 'dharrur'],
  }),
  d({
    lgd: '471', census2011: '506', id: 'bhandara', en: 'Bhandara', mr: 'भंडारा', division: 'Nagpur',
    imdTitles: ['bhandara'],
    places: ['tumsar', 'pauni', 'mohadi', 'lakhandur', 'sakoli'],
  }),
  d({
    lgd: '472', census2011: '500', id: 'buldhana', en: 'Buldhana', mr: 'बुलढाणा', division: 'Amravati',
    aliases: ['buldana'],
    imdTitles: ['buldhana', 'buldana'],
    places: ['khamgaon', 'malkapur', 'shetgaon', 'chikhli', 'mehkar', 'jalgaon jamod', 'lonar', 'sindkhed raja'],
  }),
  d({
    lgd: '473', census2011: '509', id: 'chandrapur', en: 'Chandrapur', mr: 'चंद्रपूर', division: 'Nagpur',
    imdTitles: ['chandrapur'],
    places: ['ballarpur', 'warora', 'bhadravati', 'rajura', 'mul', 'saoli', 'gondpimpri', 'midc chandrapur'],
  }),
  d({
    lgd: '469', census2011: '515', id: 'chhatrapati-sambhajinagar', en: 'Chhatrapati Sambhajinagar', mr: 'छत्रपती संभाजीनगर', division: 'Chhatrapati Sambhajinagar',
    aliases: ['aurangabad', 'sambhajinagar', 'chh sambhajinagar'],
    imdTitles: ['chhatrapati sambhajinagar', 'sambhajinagar', 'aurangabad'],
    places: ['paithan', 'vaijapur', 'gangapur', 'sillod', 'khultabad', 'phulambri', 'soegaon', 'jayakwadi', 'chikalthana', 'waluj', 'cidco aurangabad'],
  }),
  d({
    lgd: '488', census2011: '525', id: 'dharashiv', en: 'Dharashiv', mr: 'धाराशिव', division: 'Chhatrapati Sambhajinagar',
    aliases: ['osmanabad'],
    imdTitles: ['dharashiv', 'osmanabad'],
    places: ['tuljapur', 'umarga', 'bhum', 'kalamb', 'paranda', 'lohara', 'washi'],
  }),
  d({
    lgd: '474', census2011: '498', id: 'dhule', en: 'Dhule', mr: 'धुळे', division: 'Nashik',
    imdTitles: ['dhule'],
    places: ['shirpur', 'sakri', 'shindkheda', 'nizampur'],
  }),
  d({
    lgd: '475', census2011: '508', id: 'gadchiroli', en: 'Gadchiroli', mr: 'गडचिरोली', division: 'Nagpur',
    imdTitles: ['gadchiroli'],
    places: ['aheri', 'chamorshi', 'dhanora', 'etapalli', 'kurkheda', 'sironcha', 'bhamragad'],
  }),
  d({
    lgd: '476', census2011: '507', id: 'gondia', en: 'Gondia', mr: 'गोंदिया', division: 'Nagpur',
    aliases: ['gondiya'],
    imdTitles: ['gondia', 'gondiya'],
    places: ['tirora', 'goregaon', 'amgaon', 'salekasa', 'deori', 'sadak arjuni', 'arjuni morgaon'],
  }),
  d({
    lgd: '477', census2011: '512', id: 'hingoli', en: 'Hingoli', mr: 'हिंगोली', division: 'Chhatrapati Sambhajinagar',
    imdTitles: ['hingoli'],
    places: ['kalamnuri', 'sengaon', 'basmath', 'aundha'],
  }),
  d({
    lgd: '478', census2011: '499', id: 'jalgaon', en: 'Jalgaon', mr: 'जळगाव', division: 'Nashik',
    imdTitles: ['jalgaon'],
    places: ['bhusawal', 'chopda', 'pachora', 'chalisgaon', 'yawal', 'raver', 'jamner', 'erandol', 'amalner', 'muktainagar'],
  }),
  d({
    lgd: '479', census2011: '514', id: 'jalna', en: 'Jalna', mr: 'जालना', division: 'Chhatrapati Sambhajinagar',
    imdTitles: ['jalna'],
    places: ['bhokardan', 'jafrabad', 'ambad', 'badnapur', 'ghansawangi', 'mantha', 'partur'],
  }),
  d({
    lgd: '480', census2011: '530', id: 'kolhapur', en: 'Kolhapur', mr: 'कोल्हापूर', division: 'Pune',
    imdTitles: ['kolhapur'],
    places: ['ichalkaranji', 'kagal', 'hatkanangale', 'shirol', 'panhala', 'radhanagari', 'bhudargad', 'gadhinglaj', 'ajara', 'chandgad', 'gaganbawada', 'karvir'],
  }),
  d({
    lgd: '481', census2011: '524', id: 'latur', en: 'Latur', mr: 'लातूर', division: 'Chhatrapati Sambhajinagar',
    imdTitles: ['latur'],
    places: ['udgir', 'ahmadpur', 'nilanga', 'ausa', 'chakur', 'renapur', 'shirur anantpal', 'deoni'],
  }),
  d({
    lgd: '482', census2011: '519', id: 'mumbai-city', en: 'Mumbai City', mr: 'मुंबई शहर', division: 'Konkan',
    aliases: ['mumbai', 'bombay', 'brihanmumbai', 'bmc', 'greater mumbai'],
    imdTitles: ['mumbai', 'mumbai city', 'greater mumbai', 'bombay', 'brihanmumbai'],
    places: ['colaba', 'fort', 'girgaon', 'byculla', 'parel', 'worli', 'dadar', 'matunga', 'sion', 'wadala', 'dharavi', 'cst', 'south mumbai'],
  }),
  d({
    lgd: '483', census2011: '518', id: 'mumbai-suburban', en: 'Mumbai Suburban', mr: 'मुंबई उपनगर', division: 'Konkan',
    aliases: ['mumbai', 'bombay', 'brihanmumbai', 'greater mumbai'],
    imdTitles: ['mumbai suburban', 'suburban mumbai', 'mumbai', 'greater mumbai', 'brihanmumbai'],
    places: ['andheri', 'bandra', 'khar', 'santacruz', 'vile parle', 'jogeshwari', 'goregaon', 'malad', 'kandivali', 'borivali', 'dahisar', 'kurla', 'ghatkopar', 'vikhroli', 'bhandup', 'mulund', 'chembur', 'govandi', 'mankhurd', 'trombay', 'powai', 'juhu'],
  }),
  d({
    lgd: '484', census2011: '505', id: 'nagpur', en: 'Nagpur', mr: 'नागपूर', division: 'Nagpur',
    imdTitles: ['nagpur'],
    places: ['kamptee', 'hingna', 'umred', 'katol', 'narkhed', 'parseoni', 'ramtek', 'saoner', 'mouda', 'kalmeshwar', 'mihan', 'butibori'],
  }),
  d({
    lgd: '485', census2011: '511', id: 'nanded', en: 'Nanded', mr: 'नांदेड', division: 'Chhatrapati Sambhajinagar',
    imdTitles: ['nanded'],
    places: ['nanded waghala', 'kinwat', 'hadgaon', 'bhokar', 'biloli', 'mukhed', 'degloor', 'kandhar', 'naigaon', 'mudkhed', 'himayatnagar'],
  }),
  d({
    lgd: '486', census2011: '497', id: 'nandurbar', en: 'Nandurbar', mr: 'नंदुरबार', division: 'Nashik',
    imdTitles: ['nandurbar'],
    places: ['shahada', 'taloda', 'akkalkuwa', 'akkalakuwa', 'dhadgaon', 'navapur', 'dhanora nandurbar'],
  }),
  d({
    lgd: '487', census2011: '516', id: 'nashik', en: 'Nashik', mr: 'नाशिक', division: 'Nashik',
    aliases: ['nasik'],
    imdTitles: ['nashik', 'nasik'],
    places: ['malegaon', 'igatpuri', 'sinnar', 'niphad', 'yeola', 'nandgaon', 'satana', 'kalwan', 'dindori', 'trimbak', 'devlali', 'manmad', 'vaitarna'],
  }),
  d({
    lgd: '665', census2011: '', id: 'palghar', en: 'Palghar', mr: 'पालघर', division: 'Konkan',
    imdTitles: ['palghar'],
    places: ['vasai', 'virar', 'nalasopara', 'nalasopara', 'dahanu', 'talasari', 'jawhar', 'mokhada', 'wada', 'vikramgad', 'boisar', 'tarapur', 'vasai virar'],
  }),
  d({
    lgd: '489', census2011: '513', id: 'parbhani', en: 'Parbhani', mr: 'परभणी', division: 'Chhatrapati Sambhajinagar',
    imdTitles: ['parbhani'],
    places: ['gangakhed', 'pathri', 'jintur', 'selu', 'manwat', 'sonpeth', 'palam', 'purna'],
  }),
  d({
    lgd: '490', census2011: '521', id: 'pune', en: 'Pune', mr: 'पुणे', division: 'Pune',
    imdTitles: ['pune'],
    places: ['pimpri', 'chinchwad', 'pcmc', 'pimpri chinchwad', 'hadapsar', 'hinjewadi', 'lonavala', 'lonavla', 'talegaon', 'baramati', 'indapur', 'daund', 'shirur', 'junnar', 'ambegaon', 'khed pune', 'mulshi', 'velhe', 'bhor', 'purandar', 'saswad', 'khadakwasla', 'pawna', 'lavasa'],
  }),
  d({
    lgd: '491', census2011: '520', id: 'raigad', en: 'Raigad', mr: 'रायगड', division: 'Konkan',
    imdTitles: ['raigad'],
    places: ['alibag', 'alibaug', 'pen', 'panvel', 'uran', 'karjat', 'khalapur', 'mahad', 'roha', 'murud', 'shrivardhan', 'mangaon', 'poladpur', 'sudhagad', 'tala', 'mhasla', 'khopoli', 'kharghar', 'kamothe', 'ulwe', 'dronagiri', 'jnpt', 'navi mumbai'],
  }),
  d({
    lgd: '492', census2011: '528', id: 'ratnagiri', en: 'Ratnagiri', mr: 'रत्नागिरी', division: 'Konkan',
    imdTitles: ['ratnagiri'],
    places: ['chiplun', 'dapoli', 'guhagar', 'rajapur', 'lanja', 'mandangad', 'khed ratnagiri', 'sangameshwar', 'ratnagiri city', 'ganpatipule', 'harne'],
  }),
  d({
    lgd: '493', census2011: '531', id: 'sangli', en: 'Sangli', mr: 'सांगली', division: 'Pune',
    imdTitles: ['sangli'],
    places: ['miraj', 'kupwad', 'sangli miraj', 'tasgaon', 'kavathe mahankal', 'jat', 'atpadi', 'khanapur', 'palus', 'walwa', 'shirala', 'kadegaon', 'vita'],
  }),
  d({
    lgd: '494', census2011: '527', id: 'satara', en: 'Satara', mr: 'सातारा', division: 'Pune',
    imdTitles: ['satara'],
    places: ['karad', 'wai', 'mahabaleshwar', 'panchgani', 'phaltan', 'koregaon', 'khatav', 'man satara', 'khandala satara', 'patan satara', 'jaoli', 'koyna', 'koynanagar'],
  }),
  d({
    lgd: '495', census2011: '529', id: 'sindhudurg', en: 'Sindhudurg', mr: 'सिंधुदुर्ग', division: 'Konkan',
    imdTitles: ['sindhudurg'],
    places: [
      'sawantwadi', 'vengurla', 'kudal', 'kankavli', 'malvan', 'malwan', 'devgad', 'dodamarg',
      'vaibhavwadi', 'kankavali', 'tillari', 'amboli', 'vengurla creek', 'terekhol', 'aronda',
    ],
  }),
  d({
    lgd: '496', census2011: '526', id: 'solapur', en: 'Solapur', mr: 'सोलापूर', division: 'Pune',
    aliases: ['sholapur'],
    imdTitles: ['solapur', 'sholapur'],
    places: ['pandharpur', 'barshi', 'akkalkot', 'karmala', 'madha', 'mohol', 'mangalvedha', 'sangola', 'malshiras', 'ujani'],
  }),
  d({
    lgd: '497', census2011: '517', id: 'thane', en: 'Thane', mr: 'ठाणे', division: 'Konkan',
    imdTitles: ['thane'],
    places: [
      'kalyan', 'dombivli', 'dombivali', 'kalyan dombivli', 'ulhasnagar', 'ambarnath', 'ambernath',
      'badlapur', 'bhiwandi', 'mira', 'bhayandar', 'mira bhayandar', 'murbad', 'shahapur',
      'navi mumbai', 'vashi', 'nerul', 'belapur', 'sanpada', 'airoli', 'ghansoli', 'kopar khairane',
      'thane city', 'bhatsa', 'tansa',
    ],
  }),
  d({
    lgd: '498', census2011: '504', id: 'wardha', en: 'Wardha', mr: 'वर्धा', division: 'Nagpur',
    imdTitles: ['wardha'],
    places: ['hinganghat', 'deoli', 'arvi', 'ashti', 'samudrapur', 'seloo', 'pulgaon'],
  }),
  d({
    lgd: '499', census2011: '502', id: 'washim', en: 'Washim', mr: 'वाशिम', division: 'Amravati',
    imdTitles: ['washim'],
    places: ['karanja', 'mangrulpir', 'risod', 'malegaon washim', 'manora'],
  }),
  d({
    lgd: '500', census2011: '510', id: 'yavatmal', en: 'Yavatmal', mr: 'यवतमाळ', division: 'Amravati',
    aliases: ['yeotmal'],
    imdTitles: ['yavatmal', 'yeotmal'],
    places: ['pusad', 'wani', 'darwha', 'digras', 'ghatanji', 'kelapur', 'pandharkawada', 'umarhed', 'ralegaon', 'maregaon'],
  }),
]

export const GOA_LGD = new Set(['551', '552', '585', '586'])

export const EXPECTED_DIVISION_COUNTS = {
  Konkan: 7,
  Nashik: 5,
  Pune: 5,
  'Chhatrapati Sambhajinagar': 8,
  Amravati: 5,
  Nagpur: 6,
}

export const REGIONS = [
  { id: 'konkan', en: 'Konkan', mr: 'कोकण', aliases: ['kokan', 'konkan division'], districtIds: DISTRICTS.filter((x) => x.division === 'Konkan').map((x) => x.id) },
  { id: 'vidarbha', en: 'Vidarbha', mr: 'विदर्भ', aliases: ['vidharbha'], districtIds: DISTRICTS.filter((x) => x.division === 'Nagpur' || x.division === 'Amravati').map((x) => x.id) },
  { id: 'marathwada', en: 'Marathwada', mr: 'मराठवाडा', aliases: ['marathawada'], districtIds: DISTRICTS.filter((x) => x.division === 'Chhatrapati Sambhajinagar').map((x) => x.id) },
  { id: 'khandesh', en: 'Khandesh', mr: 'खानदेश', aliases: ['khandesh region'], districtIds: ['dhule', 'nandurbar', 'jalgaon'] },
  { id: 'western-maharashtra', en: 'Western Maharashtra', mr: 'पश्चिम महाराष्ट्र', aliases: ['paschim maharashtra', 'desh'], districtIds: DISTRICTS.filter((x) => x.division === 'Pune').map((x) => x.id) },
  { id: 'nashik-division', en: 'Nashik division', mr: 'नाशिक विभाग', aliases: [], districtIds: DISTRICTS.filter((x) => x.division === 'Nashik').map((x) => x.id) },
  { id: 'heat-belt', en: 'Heat-vulnerable belt', mr: 'उष्णतेची पट्टा', aliases: [], districtIds: ['nandurbar', 'dhule', 'jalgaon', 'buldhana', 'akola', 'washim', 'amravati', 'wardha', 'nagpur', 'bhandara', 'gondia', 'chandrapur', 'nanded', 'latur', 'yavatmal'] },
]

export const DISTRICT_BY_ID = new Map(DISTRICTS.map((row) => [row.id, row]))

// LGD and Census codes are separate namespaces, even when their numbers overlap.
export const DISTRICT_BY_LGD = new Map(DISTRICTS.map(row => [String(row.lgd), row]))

const GOA_RE =
  /(?<![\p{L}\p{N}])(?:north\s+goa|south\s+goa|panaji|panjim|margao|madgaon|vasco(?:\s+da\s+gama)?|mapusa|ponda|calangute|canacona|pernem|bardez|tiswadi|salcete|goa\s+state|goan(?=\s|$)|(?<!sindhu)goa)(?![\p{L}\p{N}])/iu

const STATEWIDE_RE =
  /entire(?:\s+the)?\s+state|whole(?:\s+of)?\s+(?:the\s+)?state|state[\s-]?wide|all\s+(?:\d+\s+)?districts|across\s+maharashtra|throughout\s+maharashtra|whole\s+of\s+maharashtra|संपूर्ण\s*महाराष्ट्र|महाराष्ट्रभर/iu

function escapeRe(value) {
  return String(value).replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

function uniqueNames(row) {
  return [...new Set([row.en, row.mr, ...row.aliases, ...row.imdTitles, ...row.places].map((s) => String(s).trim()).filter(Boolean))]
}

function compileBoundary(names) {
  const alt = [...names].sort((a, b) => b.length - a.length).map(escapeRe).join('|')
  return new RegExp(`(?<![\\p{L}\\p{N}])(?:${alt})(?![\\p{L}\\p{N}])`, 'iu')
}

const DISTRICT_PATTERNS = DISTRICTS.map((row) => ({ row, re: compileBoundary(uniqueNames(row)) }))

const REGION_PATTERNS = REGIONS.map((region) => ({
  region,
  re: compileBoundary([region.en, region.mr, region.id.replace(/-/g, ' '), ...region.aliases]),
}))

export function mentionsGoa(text) {
  return GOA_RE.test(String(text || ''))
}

export function isStatewideText(text) {
  const raw = String(text || '').trim()
  if (/^(maharashtra|maharashtra state|state of maharashtra|महाराष्ट्र)$/i.test(raw)) return true
  return STATEWIDE_RE.test(raw)
}

export function isGoaLgd(code) {
  return GOA_LGD.has(String(code))
}

function addHit(hits, row) {
  if (row) hits.set(row.id, row)
}

export function matchDistricts(text) {
  const hay = String(text || '')
  const hits = new Map()

  if (isStatewideText(hay)) {
    for (const row of DISTRICTS) addHit(hits, row)
    return [...hits.values()]
  }

  for (const { row, re } of DISTRICT_PATTERNS) {
    re.lastIndex = 0
    if (re.test(hay)) addHit(hits, row)
  }
  for (const { region, re } of REGION_PATTERNS) {
    re.lastIndex = 0
    if (re.test(hay)) {
      for (const id of region.districtIds) addHit(hits, DISTRICT_BY_ID.get(id))
    }
  }

  if (hits.size === 0 && mentionsGoa(hay)) return []
  return DISTRICTS.filter((row) => hits.has(row.id))
}

export function matchImdDistrictTitle(title) {
  const key = String(title || '')
    .normalize('NFKC')
    .toLowerCase()
    .replace(/[^a-z0-9\u0900-\u097f]+/g, ' ')
    .trim()
  if (!key) return []
  if (/^(north goa|south goa|goa)$/i.test(key)) return []
  const exact = DISTRICTS.filter((row) => row.imdTitles.includes(key) || row.en.toLowerCase() === key)
  if (exact.length > 0) return exact
  return matchDistricts(title)
}

export function districtsInRegion(regionId) {
  if (!regionId) return DISTRICTS
  if (regionId === 'all') return DISTRICTS
  const region = REGIONS.find((r) => r.id === regionId)
  if (!region) return []
  return region.districtIds.map((id) => DISTRICT_BY_ID.get(id)).filter(Boolean)
}

export function coverageFromAlerts(alerts) {
  const counts = Object.fromEntries(DISTRICTS.map((row) => [row.id, 0]))
  for (const alert of alerts || []) {
    for (const item of alert.districts || []) {
      if (counts[item.id] != null) counts[item.id] += 1
    }
  }
  const districts = DISTRICTS.map((row) => ({
    id: row.id,
    en: row.en,
    mr: row.mr,
    division: row.division,
    lgd: row.lgd,
    liveAlertCount: counts[row.id],
  }))
  return {
    totalDistricts: DISTRICTS.length,
    divisions: EXPECTED_DIVISION_COUNTS,
    liveCovered: districts.filter((row) => row.liveAlertCount > 0).length,
    quiet: districts.filter((row) => row.liveAlertCount === 0).map((row) => row.id),
    excludedNeighbour: {
      state: 'Goa',
      lgd: [...GOA_LGD],
      note: 'Goa is a separate state. Maharashtra still includes Sindhudurg and Kolhapur border gaons (Sawantwadi, Dodamarg, Chandgad, Tillari).',
    },
    districts,
    regions: REGIONS.map((r) => ({ id: r.id, en: r.en, mr: r.mr, size: r.districtIds.length })),
  }
}

export const AQI_CITIES_DEFAULT = [
  'Mumbai',
  'Navi Mumbai',
  'Thane',
  'Kalyan',
  'Pune',
  'Nagpur',
  'Nashik',
  'Aurangabad',
  'Kolhapur',
  'Solapur',
  'Amravati',
  'Chandrapur',
  'Sangli',
  'Akola',
  'Jalgaon',
  'Nanded',
  'Latur',
  'Vasai',
]

export const HELPLINES = [
  { id: '112', label: '112 ERSS', detail: 'Police, fire, medical — national single number', tel: '112' },
  { id: '1070', label: '1070 DEOC', detail: 'District Emergency Operations Centre', tel: '1070' },
  { id: '11077', label: 'SEOC Mumbai', detail: 'Maharashtra State EOC 24×7', tel: '11077' },
  { id: 'seoc-mobile', label: 'SEOC mobile', detail: 'Maharashtra SDMA', tel: '+919321587143' },
  { id: '108', label: '108 ambulance', detail: 'Emergency medical transport', tel: '108' },
  { id: '1098', label: '1098 Childline', detail: 'Missing / distressed children — Mission Vatsalya', tel: '1098' },
  { id: '181', label: '181 women', detail: 'Women helpline, linked with 112', tel: '181' },
  { id: 'ndma', label: 'NDMA control', detail: 'National disaster control room', tel: '+911126701728' },
]

export const OFFICIAL_LINKS = [
  { id: 'sachet', label: 'NDMA SACHET', href: 'https://sachet.ndma.gov.in/' },
  { id: 'msdma', label: 'Maharashtra SDMA', href: 'https://sdma.maharashtra.gov.in/en/' },
  { id: 'imd', label: 'IMD Mausam', href: 'https://mausam.imd.gov.in/' },
  { id: 'floodwatch', label: 'CWC FloodWatch', href: 'https://ffs.india-water.gov.in/' },
  { id: 'incois', label: 'INCOIS tsunami', href: 'https://tsunami.incois.gov.in/TEWS/searlywarnings.jsp' },
  { id: 'aapda', label: 'Aapda Mitra', href: 'https://aapdamitra.ndma.gov.in/' },
  { id: 'vatsalya', label: 'Khoya-Paya / Mission Vatsalya', href: 'https://www.wcd.gov.in/child/child-helpline' },
  { id: 'cpcb', label: 'CPCB AQI', href: 'https://airquality.cpcb.gov.in/AQI_India/' },
]
