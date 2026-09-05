import assert from 'node:assert/strict'
import test from 'node:test'
import { collectSachet } from '../server/sachet.mjs'
import { collectSnapshot, emptyState, publicSnapshot } from '../server/service.mjs'

const url = 'https://sachet.ndma.gov.in/cap_public_website/FetchXMLFile?identifier=cache-fixture'
const xml = '<alert><identifier>cache-fixture</identifier><sender>agency</sender><sent>2026-09-01T00:00:00Z</sent><status>Actual</status><scope>Public</scope><msgType>Alert</msgType><info><language>en</language><expires>2026-09-02T00:00:00Z</expires><area><areaDesc>Pune</areaDesc></area></info></alert>'
const rss = `<rss><channel><item><link>${url}</link></item></channel></rss>`
const response = (text, etag) => new Response(text, { headers: { 'content-type': 'application/xml', ...(etag ? {etag} : {}) } })

test('SACHET persists ETags, reuses cached XML for 304 and replaces changed entries', async () => {
  let calls = 0
  const fetch = async (u, options) => {
    if (new URL(u).pathname === '/') return new Response('home')
    if (u.includes('rss_')) return response(rss)
    calls++
    if (calls === 1) return response(xml, '"v1"')
    assert.equal(options.headers['if-none-match'], '"v1"')
    if (calls === 2) return new Response(null, { status: 304 })
    return response(xml.replace('<language>en</language>', '<language>en</language><headline>Changed</headline>'), '"v2"')
  }
  const collectors = [{id:'sachet', collect: options => collectSachet({...options,fetch})}]
  const first = await collectSnapshot(emptyState(), collectors)
  assert.equal(first.sources.sachet.capCache?.[url]?.etag, '"v1"')
  const second = await collectSnapshot(first, collectors)
  assert.deepEqual(second.sources.sachet.records, first.sources.sachet.records)
  const third = await collectSnapshot(second, collectors)
  assert.equal(third.sources.sachet.capCache[url].etag, '"v2"')
  assert.equal(third.sources.sachet.records[0].headlineEn, 'Changed')
  assert.equal(JSON.stringify(publicSnapshot(third)).includes('capCache'), false)
  assert.equal(calls, 3)
})

test('orphan 304 fails without unconditional retry and failed runs preserve cache', async () => {
  let requests = 0
  const fetch = async u => {
    if (new URL(u).pathname === '/') return new Response('home')
    if (u.includes('rss_')) return response(rss)
    requests++
    return new Response(null, {status:304})
  }
  await assert.rejects(collectSachet({fetch}), /304/)
  assert.equal(requests, 1)
  const cached = { [url]: {etag:'"v1"',xml} }
  const previous = {generatedAt:null,sources:{sachet:{records:[],state:'healthy',lastSuccessAt:null,lastAttemptAt:null,error:null,capCache:cached}}}
  const state = await collectSnapshot(previous,[{id:'sachet',collect:async()=>{throw Error('Upstream timeout')}}])
  assert.deepEqual(state.sources.sachet.capCache, cached)
})
