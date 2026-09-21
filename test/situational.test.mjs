import test from 'node:test'
import assert from 'node:assert/strict'
import { assertAllowedUrl } from '../server/http.mjs'
import { fetchMaharashtraQuakes, fetchMaharashtraFires, resetSituationalCache, buildSituationalSnapshot } from '../server/situational.mjs'

function isUsgsEarthquakeQuery(value) {
  const url = assertAllowedUrl(String(value))
  return url.hostname === 'earthquake.usgs.gov'
}

test.beforeEach(() => resetSituationalCache())

test('USGS quakes are clipped to Maharashtra bbox', async () => {
  const geo = {
    features: [
      { geometry: { coordinates: [73.8, 18.5] } },
      { geometry: { coordinates: [68, 18] } },
    ],
  }
  const data = await fetchMaharashtraQuakes({
    fetch: async () => new Response(JSON.stringify(geo), { headers: { 'content-type': 'application/json' } }),
  })
  assert.equal(data.features.length, 1)
})

test('FIRMS without key reports disabled without network', async () => {
  const result = await fetchMaharashtraFires({ mapKey: '' })
  assert.equal(result.status, 'disabled')
})

test('substring USGS host in path does not match hostname allowlist', () => {
  assert.throws(
    () => isUsgsEarthquakeQuery('https://evil.example/earthquake.usgs.gov/fdsnws/event/1/query'),
    /Upstream URL not allowed/,
  )
})

test('buildSituationalSnapshot caches successful proxy payload', async () => {
  const fetch = async (url) => {
    if (isUsgsEarthquakeQuery(url)) {
      return new Response(JSON.stringify({ features: [{ geometry: { coordinates: [76, 19] } }] }), {
        headers: { 'content-type': 'application/json' },
      })
    }
    throw new Error('unexpected fetch')
  }
  const first = await buildSituationalSnapshot({ enabled: true, firmsKey: '', fetch, now: 1_000 })
  const second = await buildSituationalSnapshot({ enabled: true, firmsKey: '', fetch: async () => { throw new Error('should cache') }, now: 2_000 })
  assert.equal(first.quakes.features.length, 1)
  assert.equal(second.quakes.features.length, 1)
})
