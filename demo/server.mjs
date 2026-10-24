import { resolve } from 'node:path'
import { pathToFileURL } from 'node:url'
import { createDemoRelay } from './fixtures.mjs'
export { createDemoRelay } from './fixtures.mjs'
import { createRelayServer } from '../server/index.mjs'
import { jsonResponse } from '../server/service.mjs'

export function createDemoServer({ now = () => Date.now(), webRoot } = {}) {
  const relay = createDemoRelay(now)
  const controlHandler = async request => {
    const path = new URL(request.url).pathname
    if (!path.startsWith('/__demo/')) return null
    if (request.method !== 'POST') return jsonResponse(405, { error: 'Method not allowed' }, { allow: 'POST' })
    const result = path === '/__demo/advance' ? relay.advance() : path === '/__demo/reset' ? relay.reset() : null
    return result ? jsonResponse(200, { demo: true, step: result.step }) : jsonResponse(404, { error: 'Not found' })
  }
  return createRelayServer({ relay, webRoot, environment: 'demo', controlHandler, now })
}

export function startDemoServer({ port = Number(process.env.PORT || 8799) } = {}) {
  const server = createDemoServer()
  server.listen(port, '127.0.0.1', () => console.log(`LABELLED DEMO http://127.0.0.1:${port}`))
  return server
}

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) startDemoServer()
