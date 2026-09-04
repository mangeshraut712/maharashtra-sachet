/** 36 Maharashtra districts. `lgd` is the Local Government Directory district code. */
export const DISTRICTS = [
  { lgd: '466', census2011: '522', id: 'ahilyanagar', en: 'Ahilyanagar', mr: 'अहिल्यानगर', aliases: ['ahmednagar'], division: 'Nashik' },
  { lgd: '467', census2011: '501', id: 'akola', en: 'Akola', mr: 'अकोला', aliases: [], division: 'Amravati' },
  { lgd: '468', census2011: '503', id: 'amravati', en: 'Amravati', mr: 'अमरावती', aliases: [], division: 'Amravati' },
  { lgd: '470', census2011: '523', id: 'beed', en: 'Beed', mr: 'बीड', aliases: [], division: 'Chhatrapati Sambhajinagar' },
  { lgd: '471', census2011: '506', id: 'bhandara', en: 'Bhandara', mr: 'भंडारा', aliases: [], division: 'Nagpur' },
  { lgd: '472', census2011: '500', id: 'buldhana', en: 'Buldhana', mr: 'बुलढाणा', aliases: ['buldana'], division: 'Amravati' },
  { lgd: '473', census2011: '509', id: 'chandrapur', en: 'Chandrapur', mr: 'चंद्रपूर', aliases: [], division: 'Nagpur' },
  { lgd: '469', census2011: '515', id: 'chhatrapati-sambhajinagar', en: 'Chhatrapati Sambhajinagar', mr: 'छत्रपती संभाजीनगर', aliases: ['aurangabad'], division: 'Chhatrapati Sambhajinagar' },
  { lgd: '488', census2011: '525', id: 'dharashiv', en: 'Dharashiv', mr: 'धाराशिव', aliases: ['osmanabad'], division: 'Chhatrapati Sambhajinagar' },
  { lgd: '474', census2011: '498', id: 'dhule', en: 'Dhule', mr: 'धुळे', aliases: [], division: 'Nashik' },
  { lgd: '475', census2011: '508', id: 'gadchiroli', en: 'Gadchiroli', mr: 'गडचिरोली', aliases: [], division: 'Nagpur' },
  { lgd: '476', census2011: '507', id: 'gondia', en: 'Gondia', mr: 'गोंदिया', aliases: ['gondiya'], division: 'Nagpur' },
  { lgd: '477', census2011: '512', id: 'hingoli', en: 'Hingoli', mr: 'हिंगोली', aliases: [], division: 'Chhatrapati Sambhajinagar' },
  { lgd: '478', census2011: '499', id: 'jalgaon', en: 'Jalgaon', mr: 'जळगाव', aliases: [], division: 'Nashik' },
  { lgd: '479', census2011: '514', id: 'jalna', en: 'Jalna', mr: 'जालना', aliases: [], division: 'Chhatrapati Sambhajinagar' },
  { lgd: '480', census2011: '530', id: 'kolhapur', en: 'Kolhapur', mr: 'कोल्हापूर', aliases: [], division: 'Pune' },
  { lgd: '481', census2011: '524', id: 'latur', en: 'Latur', mr: 'लातूर', aliases: [], division: 'Chhatrapati Sambhajinagar' },
  { lgd: '482', census2011: '519', id: 'mumbai-city', en: 'Mumbai City', mr: 'मुंबई शहर', aliases: ['mumbai'], division: 'Konkan' },
  { lgd: '483', census2011: '518', id: 'mumbai-suburban', en: 'Mumbai Suburban', mr: 'मुंबई उपनगर', aliases: [], division: 'Konkan' },
  { lgd: '484', census2011: '505', id: 'nagpur', en: 'Nagpur', mr: 'नागपूर', aliases: [], division: 'Nagpur' },
  { lgd: '485', census2011: '511', id: 'nanded', en: 'Nanded', mr: 'नांदेड', aliases: [], division: 'Chhatrapati Sambhajinagar' },
  { lgd: '486', census2011: '497', id: 'nandurbar', en: 'Nandurbar', mr: 'नंदुरबार', aliases: [], division: 'Nashik' },
  { lgd: '487', census2011: '516', id: 'nashik', en: 'Nashik', mr: 'नाशिक', aliases: ['nasik'], division: 'Nashik' },
  { lgd: '665', census2011: '', id: 'palghar', en: 'Palghar', mr: 'पालघर', aliases: [], division: 'Konkan' },
  { lgd: '489', census2011: '513', id: 'parbhani', en: 'Parbhani', mr: 'परभणी', aliases: [], division: 'Chhatrapati Sambhajinagar' },
  { lgd: '490', census2011: '521', id: 'pune', en: 'Pune', mr: 'पुणे', aliases: [], division: 'Pune' },
  { lgd: '491', census2011: '520', id: 'raigad', en: 'Raigad', mr: 'रायगड', aliases: ['raigarh'], division: 'Konkan' },
  { lgd: '492', census2011: '528', id: 'ratnagiri', en: 'Ratnagiri', mr: 'रत्नागिरी', aliases: [], division: 'Konkan' },
  { lgd: '493', census2011: '531', id: 'sangli', en: 'Sangli', mr: 'सांगली', aliases: [], division: 'Pune' },
  { lgd: '494', census2011: '527', id: 'satara', en: 'Satara', mr: 'सातारा', aliases: [], division: 'Pune' },
  { lgd: '495', census2011: '529', id: 'sindhudurg', en: 'Sindhudurg', mr: 'सिंधुदुर्ग', aliases: [], division: 'Konkan' },
  { lgd: '496', census2011: '526', id: 'solapur', en: 'Solapur', mr: 'सोलापूर', aliases: [], division: 'Pune' },
  { lgd: '497', census2011: '517', id: 'thane', en: 'Thane', mr: 'ठाणे', aliases: [], division: 'Konkan' },
  { lgd: '498', census2011: '504', id: 'wardha', en: 'Wardha', mr: 'वर्धा', aliases: [], division: 'Nagpur' },
  { lgd: '499', census2011: '502', id: 'washim', en: 'Washim', mr: 'वाशिम', aliases: [], division: 'Amravati' },
  { lgd: '500', census2011: '510', id: 'yavatmal', en: 'Yavatmal', mr: 'यवतमाळ', aliases: [], division: 'Nagpur' },
]

export const DISTRICT_BY_ID = new Map(DISTRICTS.map((d) => [d.id, d]))

/** Prefer LGD. Census 2011 is a fallback only when the code is not already an LGD id. */
export const DISTRICT_BY_LGD = (() => {
  const map = new Map()
  const lgdIds = new Set(DISTRICTS.map((d) => String(d.lgd)))
  for (const d of DISTRICTS) map.set(String(d.lgd), d)
  for (const d of DISTRICTS) {
    const census = String(d.census2011 || '')
    if (census && census !== '000' && !lgdIds.has(census)) map.set(census, d)
  }
  return map
})()

export function matchDistricts(text) {
  const hay = String(text || '').toLowerCase()
  const hits = []
  for (const d of DISTRICTS) {
    const needles = [d.en, d.mr, ...d.aliases].map((s) => s.toLowerCase())
    if (needles.some((n) => n && hay.includes(n))) hits.push(d)
  }
  return hits
}

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
