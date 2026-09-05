import assert from 'node:assert/strict'
import test from 'node:test'
import { DISTRICTS, DISTRICT_BY_LGD } from '../server/districts.mjs'

const catalog = await import('../server/coverage-catalog.mjs').catch(() => ({}))

test('LGD identity never silently aliases a different Census code system', () => {
  assert.equal(DISTRICT_BY_LGD.size, DISTRICTS.length)
  assert.equal(DISTRICT_BY_LGD.has('521'), false)
  assert.equal(DISTRICT_BY_LGD.has('517'), false)
})

test('place lookup preserves ambiguity and never invents village precision', () => {
  assert.equal(typeof catalog.searchLocalities, 'function')
  const matches = catalog.searchLocalities('Navi Mumbai')
  assert.deepEqual(matches.map(x => x.districtId).sort(), ['raigad', 'thane'])
  assert.ok(matches.every(x => x.precision === 'district-alias'))
  assert.equal(catalog.searchLocalities('Panaji').length, 0)
  assert.equal(catalog.searchLocalities('x'.repeat(81)).length, 0)
  assert.equal(catalog.searchLocalities('').length, 0)
})

test('every district and Maharashtra border place is discoverable', () => {
  assert.equal(typeof catalog.searchLocalities, 'function')
  for (const district of DISTRICTS) {
    for (const query of [district.en, district.mr]) {
      assert.ok(catalog.searchLocalities(query).some(x => x.districtId === district.id), query)
    }
  }
  for (const [query, id] of [['Sawantwadi', 'sindhudurg'], ['Chandgad', 'kolhapur'], ['Navapur', 'nandurbar'], ['Sironcha', 'gadchiroli']]) {
    assert.ok(catalog.searchLocalities(query).some(x => x.districtId === id), query)
  }
})

test('non-weather services declare coverage gaps instead of implying live feeds', () => {
  assert.ok(Array.isArray(catalog.SERVICE_CATEGORIES))
  for (const id of ['transport', 'water', 'power', 'health', 'fire', 'chemical', 'admin', 'agriculture']) {
    const service = catalog.SERVICE_CATEGORIES.find(x => x.id === id)
    assert.ok(service, id)
    assert.ok(service.mr)
    assert.match(service.officialUrl, /^https:\/\//)
    assert.ok(service.note.length > 20)
    assert.ok(['public-feed', 'official-directory', 'source-dependent'].includes(service.coverage))
  }
  assert.equal(catalog.LOCALITY_COVERAGE.completeVillageDirectory, false)
  assert.equal(catalog.LOCALITY_COVERAGE.completeWardDirectory, false)
})
