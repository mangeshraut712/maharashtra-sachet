import test from 'node:test'
import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import vm from 'node:vm'

const code = await readFile(new URL('../web/sw.js', import.meta.url), 'utf8')
function runtime({
  fetchImpl = async () => new Response('online'),
  put = async () => {},
} = {}) {
  const handlers = {}
  const deleted = []
  const cached = []
  const cache = {
    addAll: async (urls) => cached.push(...urls),
    put,
    match: async () => new Response('offline'),
  }
  vm.runInNewContext(code, {
    self: {
      location: { origin: 'https://relay.test' },
      addEventListener: (name, fn) => {
        handlers[name] = fn
      },
      clients: { claim: async () => {} },
    },
    URL,
    Response,
    fetch: fetchImpl,
    caches: {
      keys: async () => [
        'another-app',
        'mh-sachet-shell-v1',
        'mh-sachet-shell-v3',
        'mh-sachet-shell-v4',
        'mh-sachet-shell-v5',
        'mh-sachet-user-data',
      ],
      delete: async (key) => deleted.push(key),
      open: async () => cache,
    },
  })
  return { handlers, deleted, cached }
}
test('service worker activation removes only superseded shell caches owned by this app', async () => {
  const { handlers, deleted } = runtime()
  let work
  handlers.activate({
    waitUntil: (promise) => {
      work = promise
    },
  })
  await work
  assert.deepEqual(deleted, ['mh-sachet-shell-v1', 'mh-sachet-shell-v3', 'mh-sachet-shell-v4', 'mh-sachet-shell-v5'])
})
test('service worker leaves APIs, foreign origins and arbitrary same-origin paths untouched', () => {
  const { handlers } = runtime()
  for (const url of [
    'https://relay.test/api/alerts',
    'https://foreign.test/app.js',
    'https://relay.test/private',
    'https://relay.test/app.js?token=test',
  ]) {
    let intercepted = false
    handlers.fetch({
      request: { url, method: 'GET' },
      respondWith: () => {
        intercepted = true
      },
    })
    assert.equal(intercepted, false, url)
  }
})
test('network errors serve the cached shell while cache write errors preserve online responses', async () => {
  for (const offline of [true, false]) {
    const response = new Response('online')
    Object.defineProperty(response, 'type', { value: 'basic' })
    const { handlers } = runtime({
      fetchImpl: async () => {
        if (offline) throw new Error('offline')
        return response
      },
      put: async () => {
        throw new Error('quota')
      },
    })
    let pending
    handlers.fetch({
      request: { url: 'https://relay.test/app.js', method: 'GET' },
      respondWith: (promise) => {
        pending = promise
      },
    })
    assert.equal(await (await pending).text(), offline ? 'offline' : 'online')
  }
})
