import test from 'node:test'
import assert from 'node:assert/strict'
import { parseCapAlert, collectSachet } from '../server/sachet.mjs'
import { mergeAlerts } from '../server/merge.mjs'
import { classifyWea, situationKind } from '../server/wea.mjs'
import { fetchText, fetchTextRelaxedTls } from '../server/http.mjs'
import { collectImdNowcast } from '../server/imd.mjs'
import { collectIncois } from '../server/incois.mjs'
import { collectCpcb } from '../server/cpcb.mjs'
import { collectCwc } from '../server/cwc.mjs'

const originalFetch = globalThis.fetch
test.beforeEach(() => { globalThis.fetch = async () => { throw Error('Unexpected network: use invocation fetch') } })
test.afterEach(() => { globalThis.fetch = originalFetch })

const now = Date.parse('2026-09-05T12:00:00Z')
const base = { id: 'one', source: 'sachet', sender: 'agency', status: 'Actual', scope: 'Public', msgType: 'Alert', sent: '2026-09-05T10:00:00Z', expires: '2026-09-05T15:00:00Z' }
const cap = (infos, fields = '') => `<alert><identifier>one</identifier><sender>agency</sender><sent>2026-09-05T10:00:00Z</sent><status>Actual</status><scope>Public</scope><msgType>Update</msgType>${fields}${infos}</alert>`
const info = (language, headline, area = '') => `<info><language>${language}</language><headline>${headline}</headline><event>Notice</event><category>Safety</category>${area}</info>`

test('CAP retains actual Marathi and labels Hindi separately', () => {
  const alert = parseCapAlert(cap(info('hi-IN', 'Hindi') + info('mr-IN', 'Marathi') + info('en-IN', 'English')))
  assert.equal(alert.headlineMr, 'Marathi')
  assert.equal(alert.headlineHi, 'Hindi')
  assert.equal(parseCapAlert(cap(info('hi-IN', 'Hindi'))).headlineMr, '')
})
test('CAP language defaults to English and requires a real language tag prefix', () => {
  assert.equal(parseCapAlert(cap('<info><headline>English default</headline></info>')).headlineEn,'English default')
  assert.equal(parseCapAlert(cap(info('mr-IN','Tagged Marathi'))).headlineMr,'Tagged Marathi')
  assert.equal(parseCapAlert(cap(info('mrfoo','Other language'))).headlineMr,'')
})
test('unknown geocode systems cannot become LGD districts', () => {
  const area = '<area><areaDesc>Unspecified</areaDesc><geocode><valueName>Unknown</valueName><value>490</value></geocode></area>'
  const alert = parseCapAlert(cap(info('en', 'Notice', area)))
  assert.deepEqual(alert.districts, [])
  assert.deepEqual(alert.lgdCodes, [])
})
test('CAP parses inline area polygons and references', () => {
  const alert = parseCapAlert(cap(info('en', 'Notice', '<area><areaDesc>Pune</areaDesc><polygon>18,73 19,73 19,74 18,73</polygon></area>'), '<references>agency,old,2026-09-05T09:00:00Z</references>'))
  assert.deepEqual(alert.polygons, [[[18,73],[19,73],[19,74],[18,73]]])
  assert.deepEqual(alert.references, [{ sender: 'agency', identifier: 'old', sent: '2026-09-05T09:00:00Z' }])
})
test('source identities stay independent and expiry/status/scope are enforced', () => {
  const rows = [base, { ...base, source: 'imd' }, { ...base, id:'expired', expires: '2026-09-05T11:00:00Z' }, { ...base, id:'test', status:'Test' }, { ...base, id:'private', scope:'Private' }, { ...base, id:'observation', recordType:'observation' }]
  assert.deepEqual(mergeAlerts([rows], {now}).map(x => x.source), ['sachet','imd'])
})
test('CAP Update/Cancel retire referenced messages even when cancellation has no geography', () => {
  const update = { ...base, id:'two', msgType:'Update', references:[{sender:'agency',identifier:'one',sent:base.sent}] }
  assert.deepEqual(mergeAlerts([[base, update]], {now}).map(x=>x.id), ['two'])
  const cancel = { ...base, id:'three', msgType:'Cancel', references:[{sender:'agency',identifier:'two',sent:base.sent}] }
  assert.deepEqual(mergeAlerts([[base,update,cancel]], {now}), [])
  assert.equal(mergeAlerts([[base, { ...cancel, references:[{sender:'other',identifier:'one',sent:base.sent}] }]], {now}).length, 1)
})
test('keywords and generic Rescue do not invent official emergency classes', () => {
  assert.equal(classifyWea({category:'Rescue',event:'Flood rescue'}), 'PUBLIC_SAFETY')
  assert.equal(classifyWea({category:'Security',severity:'Severe',event:'War preparedness'}), 'PUBLIC_SAFETY')
  assert.equal(classifyWea({category:'Met',event:'rain warning',severity:'Moderate',urgency:'Immediate'}), 'WEATHER_ADVISORY')
})
test('civic situation categories classify explicitly', () => {
  for (const [event, expected] of [['Road closure','transport'],['Water supply interruption','water'],['Power outage','power'],['Bridge collapse','infrastructure'],['Administrative notice','administration'],['Crop pest advisory','agriculture']]) assert.equal(situationKind({event}), expected)
})
test('upstream requests reject unsafe URLs before network I/O', async () => {
  for (const url of ['http://sachet.ndma.gov.in/', 'https://example.com/', 'https://sachet.ndma.gov.in.evil.test/', 'https://sachet.ndma.gov.in:444/']) {
    await assert.rejects(fetchText(url, {fetch:()=>{throw Error('network must not run')}}), /not allowed/)
  }
})
test('upstream rejects hostile redirect, large body, unexpected content and timeout', async () => {
  const url = 'https://mausam.imd.gov.in/imd_latest/contents/dist_nowcast_rss.php'
  await assert.rejects(fetchText(url, {fetch:async()=>new Response('', {status:302,headers:{location:'https://example.com/'}})}), /not allowed/)
  await assert.rejects(fetchText(url, {maxBytes:4,fetch:async()=>new Response('12345')}), /too large/)
  await assert.rejects(fetchText(url, {expectedContentTypes:['application/xml'],fetch:async()=>new Response('<html/>',{headers:{'content-type':'text/html'}})}), /content type/)
  await assert.rejects(fetchText(url, {timeoutMs:5,fetch:async(_url,{signal})=>new Promise((_,reject)=>signal.addEventListener('abort',()=>reject(signal.reason)))}), /timeout/i)
})
test('unavailable CWC and unconfigured CPCB are errors rather than empty success', async () => {
  await assert.rejects(collectCwc(), /unsupported|unavailable/i)
  await assert.rejects(collectCpcb('', ['Mumbai']), /configured/i)
})
test('INCOIS quake catalog preserves observations without tsunami instructions', async () => {
  const rows = [{EVID:'e1', MAGNITUDE:8, REGIONNAME:'Arabian Sea', LATITUDE:18,LONGITUDE:68,ORIGINTIME:'2026-09-05T10:00:00Z'}]
  const alerts = await collectIncois({fetch:async()=>new Response(JSON.stringify({datasets:rows}),{headers:{'content-type':'application/json'}})})
  assert.equal(alerts[0].recordType, 'observation')
  assert.equal(alerts[0].urgency, 'Unknown')
  assert.equal(alerts[0].severity, 'Unknown')
  assert.doesNotMatch(alerts[0].event, /tsunami/)
  assert.deepEqual(alerts[0].districts, [])
  assert.deepEqual(mergeAlerts([alerts], {now}), [])
})
test('CPCB pollutant averages remain concentrations, not AQI or warnings', async () => {
  const records = [{pollutant_id:'PM2.5',pollutant_avg:'450',station:'Pune station',last_update:'05-09-2026 10:00:00'}]
  const alerts = await collectCpcb('test-key',['Pune'],{fetch:async()=>new Response(JSON.stringify({records}),{headers:{'content-type':'application/json'}})})
  assert.equal(alerts[0].recordType,'observation')
  assert.equal(alerts[0].severity,'Unknown')
  assert.doesNotMatch(alerts[0].headlineEn,/severe|AQI/i)
})
test('SACHET sessions are scoped per invocation and child snapshots are fetched fully', async () => {
  let homes = 0
  const seen = []
  const mockFetch = async (url, options) => {
    const path = new URL(url).pathname
    if(path === '/') return new Response('',{headers:{'set-cookie':`sid=${++homes}; Secure`}})
    seen.push(options.headers)
    if(path.endsWith('.xml')) return new Response('<rss><channel><item><link>https://sachet.ndma.gov.in/cap_public_website/FetchXMLFile?identifier=one</link></item></channel></rss>',{headers:{'content-type':'application/xml',etag:'rss-v1'}})
    return new Response(cap(info('en','Pune advisory')),{headers:{'content-type':'application/xml',etag:'cap-v1'}})
  }
  assert.equal((await collectSachet({fetch:mockFetch})).alerts.length,1)
  assert.equal((await collectSachet({fetch:mockFetch})).alerts.length,1)
  assert.equal(homes,2)
  assert.equal(seen[0].cookie,'sid=1')
  assert.equal(seen[2].cookie,'sid=2')
  assert.ok(seen.every(h=>!h['if-none-match']))
})

test('body read deadline also applies after response headers arrive', async () => {
  const fetch = async () => new Response(new ReadableStream({ async start(controller) { await new Promise(resolve=>setTimeout(resolve,40)); try { controller.enqueue(new TextEncoder().encode('late')); controller.close() } catch {} } }))
  await assert.rejects(fetchText('https://sachet.ndma.gov.in/',{fetch, timeoutMs:5}), /timeout/i)
})
test('invalid CAP structure, entity declarations, and bad dates are rejected', () => {
  for (const xml of ['<alert><identifier>broken</alert>', '<!DOCTYPE alert [<!ENTITY secret "boom">]><alert/>', '<alert><identifier>x</identifier></alert>',cap(info('en','Notice')).replace('2026-09-05T10:00:00Z','not-a-date')]) assert.throws(()=>parseCapAlert(xml), /invalid/i)
})
test('future-dated lifecycle messages cannot retire current alerts', () => {
  const cancel = {...base,id:'cancel',msgType:'Cancel',sent:'2026-09-06T10:00:00Z',references:[{sender:base.sender,identifier:base.id,sent:base.sent}]}
  assert.equal(mergeAlerts([[base,cancel]],{now}).length,1)
})
test('future sent timestamps cannot be backdated into active alerts by effective', () => {
  assert.deepEqual(mergeAlerts([[{...base,sent:'2026-09-06T10:00:00Z',effective:base.sent}]],{now}),[])
})
test('a lifecycle sender cannot cancel another issuer even with exact references', () => {
  const cancel={...base,id:'cancel',sender:'other-agency',msgType:'Cancel',references:[{sender:base.sender,identifier:base.id,sent:base.sent}]}
  assert.equal(mergeAlerts([[base,cancel]],{now}).length,1)
})
test('CAP language blocks with different hazard semantics or affected districts fail closed',()=>{
  const en=info('en','Notice','<area><areaDesc>Pune</areaDesc></area>').replace('</info>','<severity>Moderate</severity></info>')
  const mr=info('mr','Notice','<area><areaDesc>Thane</areaDesc></area>').replace('</info>','<severity>Severe</severity></info>')
  assert.throws(()=>parseCapAlert(cap(en+mr)),/inconsistent/i)
  assert.throws(()=>parseCapAlert(cap(info('en','Notice','<area><areaDesc>Pune</areaDesc></area>')+info('mr','Notice','<area><areaDesc>Thane</areaDesc></area>'))),/inconsistent/i)
})
test('CAP does not lose expiry when only a secondary language supplies it',()=>{
  const xml=cap(info('en','Notice')+info('mr','सूचना').replace('</info>','<expires>2026-09-05T11:00:00Z</expires></info>'))
  const alert=parseCapAlert(xml)
  assert.equal(alert.expires,'2026-09-05T11:00:00Z')
  assert.deepEqual(mergeAlerts([[alert]],{now}),[])
})
test('SACHET budget counts all requests and polygon failures cannot become healthy partial data',async()=>{
  let calls=0
  const fetch=async(url)=>{calls++;if(new URL(url).pathname==='/')return new Response('');if(String(url).includes('rss_'))return new Response('<rss><channel><item><link>https://sachet.ndma.gov.in/cap_public_website/FetchXMLFile?identifier=x</link></item></channel></rss>',{headers:{'content-type':'application/xml'}});return new Response(cap(info('en','Pune notice')),{headers:{'content-type':'application/xml'}})}
  await assert.rejects(collectSachet({fetch,maxRequests:2}),/budget/i)
  assert.equal(calls,2)
  const polygonFetch=async(url)=>{
    if(String(url).includes('polygon.xml'))return new Response('failed',{status:503})
    if(String(url).includes('FetchXMLFile'))return new Response(cap(info('en','Pune').replace('</info>','<parameter><valueName>polygon</valueName><value>https://sachet.ndma.gov.in/cap_public_website/polygon.xml</value></parameter></info>')),{headers:{'content-type':'application/xml'}})
    return fetch(url)
  }
  await assert.rejects(collectSachet({fetch:polygonFetch}),/polygon.*503/i)
})
test('SACHET keeps expired and cancelled CAP lifecycle without dereferencing historical polygons',async()=>{
  const seen=[]
  const fetch=async(url)=>{
    const path=new URL(url).pathname;seen.push(path)
    if(path==='/')return new Response('')
    if(path.includes('rss_'))return new Response('<rss><channel><item><link>https://sachet.ndma.gov.in/cap_public_website/FetchXMLFile?identifier=expired</link></item><item><link>https://sachet.ndma.gov.in/cap_public_website/FetchXMLFile?identifier=cancel</link></item></channel></rss>',{headers:{'content-type':'application/xml'}})
    if(path.includes('polygon'))throw new Error('historical polygon must not be requested')
    const detail=info('en','Pune notice').replace('</info>','<expires>2026-09-05T11:00:00Z</expires><parameter><valueName>polygon</valueName><value>https://sachet.ndma.gov.in/cap_public_website/polygon.xml</value></parameter></info>')
    let xml=cap(detail)
    if(String(url).includes('identifier=cancel'))xml=xml.replace('<msgType>Update</msgType>','<msgType>Cancel</msgType>').replace('<identifier>one</identifier>','<identifier>cancel</identifier>')
    return new Response(xml,{headers:{'content-type':'application/xml'}})
  }
  const result=await collectSachet({fetch,now})
  assert.equal(result.alerts.length,2)
  assert.ok(result.alerts.every(a=>a.geometryStatus==='not_requested_inactive'))
  assert.ok(result.alerts.every(a=>a.polygonUrl))
  assert.equal(seen.length,4)
  assert.equal(result.alerts[1].msgType,'Cancel')
})
test('active external geometry fails if even one polygon ring is malformed',async()=>{
  const fetch=async(url)=>{
    const path=new URL(url).pathname
    if(path==='/')return new Response('')
    if(path.includes('rss_'))return new Response('<rss><channel><item><link>https://sachet.ndma.gov.in/cap_public_website/FetchXMLFile?identifier=active</link></item></channel></rss>',{headers:{'content-type':'application/xml'}})
    if(path.includes('polygon'))return new Response('<alert><polygon>18,73 19,73 19,74 18,73</polygon><polygon>18,73 invalid 19,74 18,73</polygon></alert>',{headers:{'content-type':'application/xml'}})
    return new Response(cap(info('en','Pune notice').replace('</info>','<parameter><valueName>polygon</valueName><value>https://sachet.ndma.gov.in/cap_public_website/polygon.xml</value></parameter></info>')),{headers:{'content-type':'application/xml'}})
  }
  await assert.rejects(collectSachet({fetch,now}),/polygon/i)
})
test('missing-child keywords remain public safety rather than assigning AMBER status',()=>{
  assert.equal(classifyWea({category:'Rescue',event:'Missing child'}),'PUBLIC_SAFETY')
})
test('TLS errors remain errors, redirects are bounded, and normal allowlisted requests succeed', async () => {
  const url='https://sachet.ndma.gov.in/'
  await assert.rejects(fetchTextRelaxedTls(url,{fetch:async()=>{throw Error('certificate rejected')}}), /certificate rejected/)
  let count=0
  await assert.rejects(fetchText(url,{fetch:async()=>{count++;return new Response('',{status:302,headers:{location:url}})}}), /redirects/)
  assert.equal(count,4)
  assert.equal((await fetchText(url,{fetch:async()=>new Response('ok')})).text,'ok')
})
test('IMD preserves official text without inventing severity or Marathi', async () => {
  const fetch=async()=>new Response('<rss><channel><item><title>PUNE</title><description>Red warning: take shelter</description><pubDate>Sat, 05 Sep 2026 10:00:00 GMT</pubDate></item></channel></rss>',{headers:{'content-type':'application/xml'}})
  const rows=await collectImdNowcast({fetch})
  assert.equal(rows[0].severity,'Unknown')
  assert.equal(rows[0].urgency,'Unknown')
  assert.equal(rows[0].description,'Red warning: take shelter')
  assert.equal(rows[0].headlineMr,'')
})
test('malformed or partial upstream feeds fail visibly rather than replacing snapshots',async()=>{
  await assert.rejects(collectImdNowcast({fetch:async()=>new Response('<html/>',{headers:{'content-type':'application/xml'}})}),/schema/)
  await assert.rejects(collectIncois({fetch:async()=>new Response('{}',{headers:{'content-type':'application/json'}})}),/schema/)
  let count=0
  const fetch=async()=>{count++;if(count===1)return new Response('');if(count===2)return new Response('<rss><channel><item><link>https://sachet.ndma.gov.in/cap_public_website/FetchXMLFile?identifier=x</link></item></channel></rss>',{headers:{'content-type':'application/xml'}});return new Response('failed',{status:503})}
  await assert.rejects(collectSachet({fetch}),/HTTP 503/)
})
