import test from 'node:test'
import assert from 'node:assert/strict'
import { existsSync } from 'node:fs'
import { readFile } from 'node:fs/promises'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { resolveMapLibreModule } from '../web/map-view.js'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')
const vendor = join(root, 'web', 'vendor')

test('vendored MapLibre ESM chunks resolve relative imports', async () => {
  const entry = join(vendor, 'maplibre-gl.mjs')
  assert.equal(existsSync(entry), true)
  const source = await readFile(entry, 'utf8')
  const specs = [...source.matchAll(/from\s*['"]([^'"]+)['"]/g)].map((match) => match[1])
  assert.ok(specs.includes('./maplibre-gl-shared.mjs'))
  for (const spec of specs) {
    if (spec.startsWith('./') || spec.startsWith('../')) {
      assert.equal(existsSync(join(vendor, spec)), true, spec)
    }
  }
  assert.equal(existsSync(join(vendor, 'maplibre-gl-worker.mjs')), true)
})

test('MapLibre v6 namespace export is used when default is missing', () => {
  class Map {}
  class NavigationControl {}
  assert.equal(resolveMapLibreModule({ default: undefined, Map, NavigationControl })?.Map, Map)
  assert.equal(resolveMapLibreModule({ default: { Map, NavigationControl } })?.Map, Map)
  assert.equal(resolveMapLibreModule({ default: {} }), null)
})
