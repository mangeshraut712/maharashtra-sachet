import test from 'node:test'
import assert from 'node:assert/strict'
import { inBbox, clipPointFeatures } from '../web/modules/geo.mjs'
import { alertsToMapGeoJSON } from '../web/modules/map-model.mjs'
import { fetchQuakesInBbox, resetSituationalCache } from '../server/situational.mjs'
import { handleApi, emptyState } from '../server/service.mjs'

test('bbox clipping is pack-agnostic', () => {
  const bbox = { west: 0, south: 0, east: 2, north: 2 }
  assert.equal(inBbox(1, 1, bbox), true)
  assert.equal(inBbox(73, 18, bbox), false)
  const clipped = clipPointFeatures(
    [{ geometry: { coordinates: [1, 1] } }, { geometry: { coordinates: [73, 18] } }],
    bbox,
  )
  assert.equal(clipped.length, 1)
})

test('map features use caller centroids, not a hardcoded state', () => {
  const { districts } = alertsToMapGeoJSON(
    [{ id: 'x', headlineEn: 'Test', districts: [{ id: 'alpha', en: 'Alpha' }] }],
    { alpha: [10, 20] },
  )
  assert.equal(districts.features.length, 1)
  assert.deepEqual(districts.features[0].geometry.coordinates, [10, 20])
})

test('USGS query uses the supplied bbox', async () => {
  resetSituationalCache()
  const bbox = { west: 10, south: 20, east: 11, north: 21 }
  let requested = ''
  const data = await fetchQuakesInBbox({
    bbox,
    fetch: async (url) => {
      requested = String(url)
      return new Response(
        JSON.stringify({
          features: [
            { geometry: { coordinates: [10.5, 20.5] } },
            { geometry: { coordinates: [73.8, 18.5] } },
          ],
        }),
        { headers: { 'content-type': 'application/json' } },
      )
    },
  })
  assert.match(requested, /minlatitude=20/)
  assert.match(requested, /minlongitude=10/)
  assert.equal(data.features.length, 1)
})

test('meta describes optional map/Jev/situational modules and the region pack', async () => {
  const meta = await (await handleApi(new Request('http://localhost/api/meta'), emptyState())).json()
  assert.equal(meta.unofficial, true)
  assert.equal(meta.region.id, 'in-mh')
  assert.equal(meta.delivery.webPush, 'unavailable')
  assert.equal(meta.features.situationalLayers.defaultOn, false)
  assert.equal(meta.features.jevShadow.defaultOn, false)
  assert.equal(meta.features.mapLibre.optional, true)
})
