import { XMLParser } from 'fast-xml-parser'
import { matchImdDistrictTitle } from './districts.mjs'
import { fetchText } from './http.mjs'
import { classifyWea, situationKind } from './wea.mjs'

const parser = new XMLParser({ ignoreAttributes: false, removeNSPrefix: true })
const IMD_RSS = 'https://mausam.imd.gov.in/imd_latest/contents/dist_nowcast_rss.php'

function asArray(value) {
  if (value == null) return []
  return Array.isArray(value) ? value : [value]
}

export function xmlText(value) {
  if (value == null) return ''
  if (typeof value === 'string' || typeof value === 'number') return String(value)
  if (Array.isArray(value)) return value.map(xmlText).join(' ')
  if (typeof value === 'object') {
    if (typeof value['#text'] === 'string') return value['#text']
    if (typeof value['#cdata'] === 'string') return value['#cdata']
  }
  return ''
}

export async function collectImdNowcast() {
  const res = await fetchText(IMD_RSS, { accept: 'application/xml,text/xml,*/*' })
  if (!res.ok) throw new Error(`IMD RSS HTTP ${res.status}`)
  const feed = parser.parse(res.text)
  const items = asArray(feed.rss?.channel?.item)
  const alerts = []
  for (const item of items) {
    const title = xmlText(item.title)
    const desc = xmlText(item.description) || xmlText(item['dc:description'])
    const districts = matchImdDistrictTitle(title)
    if (districts.length === 0) continue
    const body = {
      id: `imd-${item.guid || title}`,
      source: 'imd',
      official: true,
      sender: 'IMD',
      sent: item.pubDate || item.sent,
      status: 'Actual',
      msgType: 'Alert',
      category: 'Met',
      event: 'District nowcast',
      urgency: /warning|red|orange/i.test(`${title} ${desc}`) ? 'Immediate' : 'Expected',
      severity: /red/i.test(`${title} ${desc}`) ? 'Severe' : 'Moderate',
      certainty: 'Likely',
      headlineEn: title,
      headlineMr: title,
      description: desc,
      instruction: 'Follow IMD and SDMA guidance. Call 112 in an emergency.',
      districts: districts.map((d) => ({ id: d.id, en: d.en, mr: d.mr, lgd: d.lgd })),
      capUrl: item.link,
      author: 'IMD',
    }
    body.weaClass = classifyWea(body)
    body.kind = situationKind({ ...body, headlineEn: `${title} ${desc}` })
    alerts.push(body)
  }
  return alerts
}
