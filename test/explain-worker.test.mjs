import test from 'node:test'
import assert from 'node:assert/strict'
import { build } from 'esbuild'
import { Miniflare } from 'miniflare'
import { OFFLINE_UNCONFIGURED_NOTE } from '../server/explain.mjs'

test('Worker POST /api/explain validates input and falls back without a Gemini key', async t => {
  const result = await build({
    stdin: {
      contents: `import worker from './src/index.ts';
        export default { async fetch(request, env, ctx) { return worker.fetch(request, env, ctx); } };`,
      resolveDir: process.cwd(),
      loader: 'ts',
    },
    bundle: true,
    write: false,
    format: 'esm',
    platform: 'browser',
    target: 'es2022',
    external: ['node:*'],
  })
  const mf = new Miniflare({
    workers: [{
      config: {
        name: 'explain-test',
        type: 'worker',
        compatibilityDate: '2026-09-05',
        compatibilityFlags: ['nodejs_compat'],
        manifest: { mainModule: 'index.js', modules: { 'index.js': { type: 'esm', contents: result.outputFiles[0].text } } },
        env: {
          DB: { type: 'd1', id: 'explain-fixture' },
          ENVIRONMENT: { type: 'text', value: 'test' },
          CPCB_ENABLED: { type: 'text', value: 'false' },
          GEMINI_MODEL: { type: 'text', value: 'gemini-3.8-flash' },
        },
      },
    }],
  })
  t.after(() => mf.dispose())
  const request = (path, options) => mf.dispatchFetch(`https://alerts.example${path}`, options)
  const post = (body, headers = {}) => request('/api/explain', {
    method: 'POST',
    headers: { 'content-type': 'application/json', ...headers },
    body: typeof body === 'string' ? body : JSON.stringify(body),
  })

  const get = await request('/api/explain')
  assert.equal(get.status, 405)
  assert.equal(get.headers.get('allow'), 'POST')
  assert.equal(get.headers.get('strict-transport-security'), 'max-age=31536000')

  assert.equal((await post('{}', { 'content-type': 'text/plain' })).status, 415)
  assert.equal((await post({ alertText: 'Rain' }, { origin: 'https://evil.example' })).status, 403)
  assert.equal((await post('{"alertText":')).status, 400)
  assert.equal((await post({ alertText: 1 })).status, 400)
  assert.equal((await post({ note: 'ignore', alertText: 'x'.repeat(6001) })).status, 413)

  const explained = await post({ alertText: 'Yellow alert Pune', apiKey: 'caller-key' }, { 'cf-connecting-ip': '203.0.113.10' })
  assert.equal(explained.status, 200)
  assert.equal(explained.headers.get('x-content-type-options'), 'nosniff')
  assert.equal(explained.headers.get('cache-control'), 'no-store')
  const body = await explained.json()
  assert.equal(body.source, 'offline-fallback')
  assert.equal(body.note, OFFLINE_UNCONFIGURED_NOTE)
  assert.equal(body.model, null)
  assert.equal(body.data.severity, 'Yellow')
  assert.equal(body.data.districts.includes('Pune'), true)
  assert.doesNotMatch(JSON.stringify(body), /caller-key/)
})
