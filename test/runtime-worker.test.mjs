import test from 'node:test'
import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import { build } from 'esbuild'
import { Miniflare } from 'miniflare'

test('Worker D1 integration: startup, atomic snapshots, expired lease fencing, and persistence', async t => {
  // These fixture-only routes are bundled in memory, never in the deployed entry.
  const result = await build({ stdin: { contents: `
    import worker, {ingest, maybeScheduleRecovery} from './src/index.ts';
    import {acquireLease, saveState, readState} from './src/storage.ts';
    let recoveryRuns = 0;
    export default {async fetch(request,env,ctx) {
      const url = new URL(request.url);
      if(url.pathname === '/fixture/lease') return Response.json(await acquireLease(env.DB,url.searchParams.get('token'),Number(url.searchParams.get('now'))));
      if(url.pathname === '/fixture/save') return Response.json(await saveState(env.DB,url.searchParams.get('token'),await request.json(),Number(url.searchParams.get('now'))));
      if(url.pathname === '/fixture/state') return Response.json(await readState(env.DB));
      if(url.pathname === '/fixture/recovery') {
        const now = Date.now();
        const timestamp = new Date(now).toISOString();
        const fresh = {generatedAt:timestamp,sources:Object.fromEntries(['sachet','imd','incois','cwc','cpcb'].map(id=>[id,{state:'healthy',records:[],lastSuccessAt:timestamp,lastAttemptAt:timestamp,error:null}]))};
        const state = url.searchParams.has('fresh') ? fresh : {generatedAt:null,sources:{}};
        const scheduled = maybeScheduleRecovery({...env,ENVIRONMENT:url.searchParams.get('environment')||'production'},state,ctx,async()=>{recoveryRuns++;return {status:'completed'}});
        return Response.json({scheduled});
      }
      if(url.pathname === '/fixture/recovery-status') return Response.json({recoveryRuns});
      if(url.pathname === '/fixture/ingest') {
        const records = await request.json();
        return Response.json(await ingest(env,['sachet','imd','incois','cwc','cpcb'].map(id=>({id,collect:async()=>{
          if(id==='sachet' && url.searchParams.has('fail')) throw Object.assign(new Error('fixture-private-value'), {code:'SOURCE_BUDGET_EXCEEDED'});
          return id==='sachet'?records:[];
        }}))));
      }
      return worker.fetch(request,env,ctx);
    }};`, resolveDir: process.cwd(), loader: 'ts' }, bundle: true, write: false, format: 'esm', platform: 'browser', target: 'es2022', external: ['node:*'] })
  const mf = new Miniflare({ workers: [{ config: { name: 'relay-test', type: 'worker', compatibilityDate: '2026-09-05', compatibilityFlags: ['nodejs_compat'], manifest: { mainModule: 'index.js', modules: { 'index.js': { type: 'esm', contents: result.outputFiles[0].text } } }, env: { DB: { type: 'd1', id: 'relay-fixture' }, ENVIRONMENT: { type: 'text', value: 'test' }, CPCB_ENABLED: { type: 'text', value: 'false' } } } }] })
  t.after(() => mf.dispose())
  const db = await mf.getD1Database('DB')
  const migration = await readFile(new URL('../migrations/0001_relay.sql', import.meta.url), 'utf8')
  for (const sql of migration.split(';').map(s => s.trim()).filter(Boolean)) await db.prepare(sql).run()
  const request = (path, options) => mf.dispatchFetch(`https://example.test${path}`, options)
  assert.equal((await request('/api/health')).status, 503)
  assert.deepEqual(await (await request('/fixture/recovery')).json(), { scheduled: true })
  assert.deepEqual(await (await request('/fixture/recovery-status')).json(), { recoveryRuns: 1 })
  assert.deepEqual(await (await request('/fixture/recovery?fresh=1')).json(), { scheduled: false })
  assert.deepEqual(await (await request('/fixture/recovery?environment=test')).json(), { scheduled: false })
  assert.deepEqual(await (await request('/fixture/recovery-status')).json(), { recoveryRuns: 1 })
  const meta = await (await request('/api/v1/meta')).json()
  assert.equal(meta.districts.length, 36)
  assert.equal(await (await request('/fixture/lease?token=old&now=100')).json(), true)
  assert.equal(await (await request('/fixture/lease?token=other&now=101')).json(), false)
  assert.equal(await (await request('/fixture/lease?token=new&now=120101')).json(), true)
  const now = Date.now()
  const timestamp = new Date(now).toISOString()
  const record = { id: 'fixture', source: 'sachet', sender: 'official', status: 'Actual', scope: 'Public', msgType: 'Alert', effective: new Date(now - 1000).toISOString(), sent: new Date(now - 1000).toISOString(), expires: new Date(now + 60_000).toISOString(), districts: [{ id: 'pune' }], weaClass: 'WEATHER_ADVISORY', kind: 'rain' }
  const state = { generatedAt: timestamp, sources: Object.fromEntries(['sachet', 'imd', 'incois', 'cwc', 'cpcb'].map(source => [source, { state: 'healthy', records: source === 'sachet' ? [record] : [], lastSuccessAt: timestamp, lastAttemptAt: timestamp, error: null }])) }
  state.sources.sachet.capCache = {'https://sachet.ndma.gov.in/cap_public_website/FetchXMLFile?identifier=fixture': {etag:'"v1"',xml:'<alert />'}}
  const save = (token, snapshot, time) => request(`/fixture/save?token=${token}&now=${time}`, { method: 'POST', body: JSON.stringify(snapshot) })
  assert.equal(await (await save('old', state, 120102)).json(), false)
  assert.equal(await (await save('new', state, 120102)).json(), true)
  assert.equal((await request('/api/health')).status, 200)
  const feed = await (await request('/api/v1/alerts?district=pune')).json()
  assert.equal(feed.alerts[0].id, 'fixture')
  assert.equal((await request('/api/refresh', { method: 'POST' })).status, 405)
  assert.equal(await (await save('old', { ...state, generatedAt: 'old' }, 120103)).json(), false)
  const persisted = await (await request('/fixture/state')).json()
  assert.equal(persisted.generatedAt, timestamp)
  assert.deepEqual(persisted.sources.sachet.records, [record])
  assert.deepEqual(persisted.sources.sachet.capCache, state.sources.sachet.capCache)
  const cancellation = { ...record, id: 'cancel-fixture', msgType: 'Cancel', sent: timestamp, references: [{ sender: record.sender, identifier: record.id, sent: record.sent }] }
  for (const records of [[record, cancellation], [record]]) {
    assert.equal((await request('/fixture/ingest', { method: 'POST', body: JSON.stringify(records) })).status, 200)
    assert.equal((await (await request('/api/alerts')).json()).count, 0)
  }
  const retired = await (await request('/fixture/state')).json()
  assert.equal(retired.sources.sachet.records.length, 2)
  assert.equal((await request('/api/health')).headers.get('strict-transport-security'), 'max-age=31536000')
  await request('/fixture/ingest?fail=1', { method: 'POST', body: '[]' })
  const failedState = await (await request('/fixture/state')).json()
  assert.equal(failedState.sources.sachet.errorCode, 'request_budget')
  assert.equal(failedState.sources.sachet.records.length, 2)
  const sources = await (await request('/api/sources')).json()
  assert.equal(sources.sources.sachet.errorCode, 'request_budget')
  assert.doesNotMatch(JSON.stringify(sources), /fixture-private-value/)
})
