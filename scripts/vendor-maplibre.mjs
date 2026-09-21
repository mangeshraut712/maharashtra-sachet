import { copyFile, mkdir } from 'node:fs/promises'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = join(fileURLToPath(new URL('.', import.meta.url)), '..')
const vendor = join(root, 'web', 'vendor')
const dist = join(root, 'node_modules', 'maplibre-gl', 'dist')

await mkdir(vendor, { recursive: true })
for (const file of [
  'maplibre-gl.css',
  'maplibre-gl.mjs',
  'maplibre-gl-shared.mjs',
  'maplibre-gl-worker.mjs',
]) {
  await copyFile(join(dist, file), join(vendor, file))
}
