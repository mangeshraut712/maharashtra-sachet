import { DISTRICTS } from './districts.mjs'

export const LOCALITY_COVERAGE = Object.freeze({
  level: 'district-with-place-aliases',
  completeVillageDirectory: false,
  completeWardDirectory: false,
  directoryUrl: 'https://lgdirectory.gov.in/',
  note: 'Place names resolve to a district, not a verified village, ward or municipal boundary. A district match does not mean the whole district is affected. Read the official affected-area text.',
  noteMr: 'ठिकाणाचे नाव जिल्ह्याशी जोडले जाते; गाव, प्रभाग किंवा पालिकेची अचूक सीमा पडताळलेली नाही. संपूर्ण जिल्हा बाधित आहे असा अर्थ नाही. अधिकृत बाधित क्षेत्राचा मजकूर वाचा.',
})

const normalize = value => String(value ?? '').normalize('NFKC').toLocaleLowerCase('en-IN').replace(/[^\p{L}\p{M}\p{N}]+/gu, ' ').trim()

// These are search hints inherited from the relay, not an LGD village registry.
export const LOCALITIES = Object.freeze(DISTRICTS.flatMap(district => {
  const names = [...new Set([district.en, district.mr, ...district.aliases, ...district.places])]
  return names.map((name, index) => Object.freeze({
    id: `${district.id}:${index}`,
    name,
    districtId: district.id,
    districtEn: district.en,
    districtMr: district.mr,
    precision: 'district-alias',
  }))
}))

const searchIndex = LOCALITIES.map(place => ({ place, key: normalize(place.name) }))

export function searchLocalities(query, limit = 20) {
  if (typeof query !== 'string' || query.length > 80) return []
  const key = normalize(query)
  if (key.length < 2) return []
  const take = Number.isInteger(limit) ? Math.max(1, Math.min(limit, 20)) : 20
  return searchIndex
    .filter(row => row.key.includes(key))
    .sort((a, b) => (a.key === key ? 0 : a.key.startsWith(key) ? 1 : 2) - (b.key === key ? 0 : b.key.startsWith(key) ? 1 : 2) || a.key.localeCompare(b.key))
    .slice(0, take)
    .map(row => row.place)
}

const service = (id, en, mr, coverage, sourceIds, officialUrl, note, noteMr) => Object.freeze({ id, en, mr, coverage, sourceIds, officialUrl, note, noteMr })

export const SERVICE_CATEGORIES = Object.freeze([
  service('weather', 'Weather & natural hazards', 'हवामान व नैसर्गिक आपत्ती', 'public-feed', ['sachet', 'imd'], 'https://sachet.ndma.gov.in/', 'Public CAP and IMD alerts when available. Coverage and freshness depend on the issuing agency.', 'उपलब्ध असताना CAP व IMD सूचना. व्याप्ती व ताजेपणा संबंधित संस्थेवर अवलंबून आहेत.'),
  service('fire', 'Fire & rescue', 'आग व बचाव', 'source-dependent', ['sachet'], 'https://sdma.maharashtra.gov.in/en/', 'Shown when published in official CAP. No complete local fire incident feed is connected.', 'अधिकृत CAP मध्ये प्रकाशित झाल्यास दाखवले जाते. सर्व स्थानिक आगींची थेट माहिती जोडलेली नाही.'),
  service('chemical', 'Industrial & chemical hazards', 'औद्योगिक व रासायनिक धोके', 'source-dependent', ['sachet'], 'https://sdma.maharashtra.gov.in/en/', 'Official CAP notices only. An industrial location or keyword alone does not establish an emergency.', 'फक्त अधिकृत CAP सूचना. औद्योगिक ठिकाण किंवा शब्दावरून आणीबाणी ठरवली जात नाही.'),
  service('health', 'Public health', 'सार्वजनिक आरोग्य', 'official-directory', ['sachet'], 'https://phd.maharashtra.gov.in/en/', 'Official health guidance and CAP where issued. No live outbreak surveillance or patient data is connected.', 'अधिकृत आरोग्य मार्गदर्शन व प्रकाशित CAP सूचना. रोगनिगराणी किंवा रुग्णांची माहिती जोडलेली नाही.'),
  service('transport', 'Roads & public transport', 'रस्ते व सार्वजनिक वाहतूक', 'official-directory', [], 'https://transports.maharashtra.gov.in/en/', 'Open official transport services. Statewide live traffic, railway and road-closure feeds are not connected.', 'अधिकृत वाहतूक सेवा पाहा. राज्यभरातील वाहतूक, रेल्वे व रस्तेबंदीची थेट माहिती जोडलेली नाही.'),
  service('water', 'Water & sanitation', 'पाणी व स्वच्छता', 'official-directory', [], 'https://mahadma.maharashtra.gov.in/en/faq/', 'Water supply and sanitation are local-body services. Check the relevant municipality or gram panchayat; no statewide outage feed is connected.', 'पाणी व स्वच्छतेसाठी संबंधित पालिका किंवा ग्रामपंचायतीची माहिती तपासा. राज्यभरातील पाणीबंदीची थेट माहिती जोडलेली नाही.'),
  service('power', 'Electricity disruptions', 'वीजपुरवठा खंडित', 'official-directory', [], 'https://www.mahadiscom.in/en/consumer/consumer-portal-sitemap/', 'MSEDCL publishes consumer outage information. This relay does not have a verified statewide live outage integration.', 'महावितरण ग्राहकांसाठी वीजबंदी माहिती प्रकाशित करते. या संकेतस्थळाला पडताळलेली राज्यव्यापी थेट जोडणी नाही.'),
  service('infrastructure', 'Buildings & infrastructure', 'इमारती व पायाभूत सुविधा', 'source-dependent', ['sachet'], 'https://urban.maharashtra.gov.in/', 'Official CAP where issued and links to urban authorities. Building, bridge and utility incidents are not comprehensively monitored.', 'प्रकाशित CAP व नगरविकास विभागाचे दुवे. सर्व इमारत, पूल व सेवा घटनांचे निरीक्षण होत नाही.'),
  service('admin', 'Local administration & civic notices', 'स्थानिक प्रशासन व नागरी सूचना', 'official-directory', [], 'https://urban.maharashtra.gov.in/', 'Municipal and administrative sources are directories, not automatically verified live notices for every ward.', 'पालिका व प्रशासनाचे अधिकृत दुवे; प्रत्येक प्रभागातील सर्व थेट सूचना पडताळलेल्या नाहीत.'),
  service('agriculture', 'Agriculture & rural advisories', 'शेती व ग्रामीण सल्ला', 'official-directory', [], 'https://agri.maharashtra.gov.in/', 'Official agriculture services and advisories. Village-level crop, pest and livestock alerts need separately verified sources.', 'अधिकृत कृषी सेवा व सल्ला. गावनिहाय पीक, कीड व पशुधन सूचनांसाठी स्वतंत्र पडताळलेले स्रोत आवश्यक आहेत.'),
  service('safety', 'Public safety & missing persons', 'सार्वजनिक सुरक्षा व बेपत्ता व्यक्ती', 'source-dependent', ['sachet'], 'https://sachet.ndma.gov.in/', 'Only attributed official notices. No community accusations, private missing-person records, or automatic AMBER designation.', 'फक्त स्रोतासह अधिकृत सूचना. अप्रमाणित आरोप, खासगी माहिती किंवा स्वयंचलित AMBER वर्गीकरण नाही.'),
  service('air', 'Air quality & environment', 'हवेची गुणवत्ता व पर्यावरण', 'official-directory', ['cpcb'], 'https://airquality.cpcb.gov.in/AQI_India/', 'Check CPCB for official AQI. A pollutant concentration must not be presented as a calculated AQI.', 'अधिकृत AQI साठी CPCB पाहा. प्रदूषकाची एकाग्रता ही गणना केलेला AQI म्हणून दाखवली जात नाही.'),
])
