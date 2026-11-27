import { test } from 'node:test'
import assert from 'node:assert/strict'
import { collectCpcb } from '../server/cpcb.mjs'
import { classifySourceError } from '../server/service.mjs'

const jsonResponse = (payload) => new Response(JSON.stringify(payload), { headers: { 'content-type': 'application/json' } })

test('CPCB collection urlencodes the API key, stays on the allowlisted resource, and keeps only valid Maharashtra samples', async () => {
  const apiKey = 'k+1='
  let requested = null
  const fetch = async (href) => {
    requested = new URL(href)
    return jsonResponse({
      records: [
        { state: 'Maharashtra', station: 'Karve Road', pollutant_id: 'PM2.5', pollutant_avg: '78.4', last_update: '16-11-2026 08:00:00' },
        { state: 'Delhi', station: 'Karve Road', pollutant_id: 'PM2.5', pollutant_avg: '90', last_update: 'x' },
        { state: 'Maharashtra', station: 'Karve Road', pollutant_id: 'PM2.5', pollutant_avg: 'NA', last_update: 'x' },
        { state: 'Maharashtra', pollutant_id: 'PM2.5', pollutant_avg: '40', last_update: 'x' },
      ],
    })
  }
  const rows = await collectCpcb(apiKey, ['Pune'], { fetch })
  assert.equal(requested.hostname, 'api.data.gov.in')
  assert.equal(requested.pathname, '/resource/3b01bcb8-0b14-4abf-b6f2-c1bfd384ba69')
  assert.ok(requested.href.includes('api-key=k%2B1%3D'), 'API key must be URL-encoded in the upstream request')
  assert.equal(requested.searchParams.get('api-key'), apiKey)
  assert.equal(rows.length, 1, 'out-of-state, non-numeric, and station-less samples must be dropped')
  assert.equal(rows[0].id, 'cpcb-Pune-Karve Road-PM2.5-16-11-2026 08:00:00')
  assert.equal(rows[0].recordType, 'observation')
  assert.equal(rows[0].extra.concentration, 78.4)
  assert.ok(rows[0].districts.some((district) => district.id === 'pune'))
})

test('CPCB failures redact the API key and map to allowlisted diagnostic codes', async () => {
  const apiKey = 's3cr3t+key='
  await assert.rejects(
    collectCpcb(apiKey, ['Pune'], { fetch: async () => { throw new Error(`upstream failed for ${apiKey}`) } }),
    (error) => {
      assert.equal(error.message, 'CPCB upstream request failed')
      assert.ok(!error.message.includes(apiKey))
      return true
    },
  )
  await assert.rejects(
    collectCpcb(apiKey, ['Pune'], { fetch: async () => { throw new Error(`upstream failed for ${encodeURIComponent(apiKey)}`) } }),
    (error) => {
      assert.equal(error.message, 'CPCB upstream request failed')
      assert.ok(!error.message.includes(apiKey))
      assert.ok(!error.message.includes(encodeURIComponent(apiKey)))
      return true
    },
  )
  await assert.rejects(
    collectCpcb(apiKey, ['Pune'], { fetch: async () => new Response('{"records":[', { headers: { 'content-type': 'application/json' } }) }),
    (error) => {
      assert.equal(error.name, 'SyntaxError')
      assert.equal(error.message, 'Unsupported CPCB schema')
      assert.equal(classifySourceError(error), 'schema_invalid')
      return true
    },
  )
  await assert.rejects(
    collectCpcb(apiKey, ['Pune'], { fetch: async () => jsonResponse({ records: 'nope' }) }),
    (error) => {
      assert.equal(error.message, 'Unsupported CPCB schema')
      assert.equal(classifySourceError(error), 'schema_invalid')
      return true
    },
  )
  await assert.rejects(
    collectCpcb(apiKey, ['Pune'], { fetch: async () => new Response('down', { status: 503, headers: { 'content-type': 'text/plain' } }) }),
    (error) => {
      assert.equal(error.message, 'CPCB HTTP 503')
      assert.equal(classifySourceError(error), 'http_error')
      return true
    },
  )
  await assert.rejects(
    collectCpcb(apiKey, ['Pune'], { fetch: async () => { throw new Error('socket hang up') } }),
    (error) => {
      assert.equal(error.message, 'socket hang up')
      assert.equal(classifySourceError(error), 'unavailable')
      return true
    },
  )
})

test('CPCB rejects oversized city lists before any upstream request', async () => {
  let requests = 0
  await assert.rejects(
    collectCpcb('key', new Array(37).fill('Pune'), {
      fetch: async () => {
        requests += 1
        return jsonResponse({ records: [] })
      },
    }),
    /Invalid CPCB city list/,
  )
  assert.equal(requests, 0)
})
