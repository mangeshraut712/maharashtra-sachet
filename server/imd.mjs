import { XMLParser, XMLValidator } from 'fast-xml-parser'
import { safeOfficialUrl } from '../web/ui-model.js'
import { matchImdDistrictTitle } from './districts.mjs'
import { fetchText } from './http.mjs'
import { classifyWea, situationKind } from './wea.mjs'

const parser = new XMLParser({ ignoreAttributes: false, removeNSPrefix: true, processEntities:false })
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

export async function collectImdNowcast(options = {}) {
  const res = await fetchText(IMD_RSS, { ...options, accept: 'application/xml,text/xml,application/rss+xml', expectedContentTypes:['application/xml','text/xml','application/rss+xml'] })
  if (!res.ok) throw new Error(`IMD RSS HTTP ${res.status}`)
  if (/<!DOCTYPE|<!ENTITY/i.test(res.text) || XMLValidator.validate(res.text) !== true) throw new Error('Invalid IMD XML')
  const feed = parser.parse(res.text)
  if (!feed.rss?.channel) throw new Error('Invalid IMD RSS schema')
  const items = asArray(feed.rss?.channel?.item)
  const alerts = []
  for (const item of items) {
    const title = xmlText(item.title)
    const desc = xmlText(item.description) || xmlText(item['dc:description'])
    const districts = matchImdDistrictTitle(title)
    if (districts.length === 0) continue
    const guid = xmlText(item.guid)
    const link = safeOfficialUrl(xmlText(item.link))
    const body = {
      id: `imd-${guid || title}`,
      source: 'imd',
      official: true,
      sender: 'IMD',
      sent: xmlText(item.pubDate) || xmlText(item.sent),
      status: 'Actual',
      scope: 'Public',
      msgType: 'Alert',
      category: 'Met',
      event: 'District nowcast',
      urgency: 'Unknown',
      severity: 'Unknown',
      certainty: 'Unknown',
      headlineEn: title,
      headlineMr: '',
      language: 'en',
      description: desc,
      instruction: '',
      districts: districts.map((d) => ({ id: d.id, en: d.en, mr: d.mr, lgd: d.lgd })),
      ...(link ? { capUrl: link } : {}),
      author: 'IMD',
    }
    body.weaClass = classifyWea(body)
    body.kind = situationKind({ ...body, headlineEn: `${title} ${desc}` })
    alerts.push(body)
  }
  return alerts
}
