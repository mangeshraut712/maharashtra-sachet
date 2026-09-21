import { copyFile, mkdir } from 'node:fs/promises'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = join(fileURLToPath(new URL('.', import.meta.url)), '..')
const vendor = join(root, 'web', 'vendor')
const dist = join(root, 'node_modules', 'maplibre-gl', 'dist')

await mkdir(vendor, { recursive: true })
await copyFile(join(dist, 'maplibre-gl.js'), join(vendor, 'maplibre-gl.js'))
await copyFile(join(dist, 'maplibre-gl.css'), join(vendor, 'maplibre-gl.css'))
