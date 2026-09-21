import test from 'node:test'
import assert from 'node:assert/strict'
import { alertsToMapGeoJSON, capPolygonsToGeoJSON } from '../web/map-model.js'

test('CAP lat,lon rings convert to GeoJSON lon,lat polygons', () => {
  const geo = capPolygonsToGeoJSON([[[18, 73], [19, 73], [19, 74], [18, 73]]], { alertId: 'a1' })
  assert.equal(geo.features.length, 1)
  assert.deepEqual(geo.features[0].geometry.coordinates[0][0], [73, 18])
})

test('alertsToMapGeoJSON merges polygons and district centroids', () => {
  const { polygons, districts } = alertsToMapGeoJSON([
    {
      id: 'one',
      headlineEn: 'Rain',
      polygons: [[[18, 73], [19, 73], [19, 74], [18, 73]]],
      districts: [{ id: 'pune', en: 'Pune' }, { id: 'satara', en: 'Satara' }],
    },
  ])
  assert.equal(polygons.features.length, 1)
  assert.equal(districts.features.length, 2)
  assert.equal(districts.features[0].properties.geometrySource, 'district-centroid')
})
