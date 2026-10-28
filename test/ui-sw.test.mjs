import test from 'node:test'
import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import vm from 'node:vm'

const code = await readFile(new URL('../web/sw.js', import.meta.url), 'utf8')
function runtime({
  fetchImpl = async () => new Response('online'),
  put = async () => {},
  match = async () => new Response('offline'),
} = {}) {
  const handlers = {}
  const deleted = []
  const cached = []
  const cache = {
    addAll: async (urls) => cached.push(...urls),
    put,
    match,
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
        'mh-sachet-shell-v6',
        'mh-sachet-shell-v7',
        'mh-sachet-shell-v8',
        'mh-sachet-shell-v9',
        'mh-sachet-shell-v10',
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
  assert.deepEqual(deleted, ['mh-sachet-shell-v1', 'mh-sachet-shell-v3', 'mh-sachet-shell-v4', 'mh-sachet-shell-v5', 'mh-sachet-shell-v6', 'mh-sachet-shell-v7', 'mh-sachet-shell-v8', 'mh-sachet-shell-v9', 'mh-sachet-shell-v10'])
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
  let arbitraryQueryIntercepted = false
  handlers.fetch({
    request: { url: 'https://relay.test/?demo=1&preview=1', method: 'GET', mode: 'navigate' },
    respondWith: () => {
      arbitraryQueryIntercepted = true
    },
  })
  assert.equal(arbitraryQueryIntercepted, false)
  let vendorQueryIntercepted = false
  handlers.fetch({
    request: { url: 'https://relay.test/vendor/maplibre-gl.mjs?demo=1', method: 'GET', mode: 'navigate' },
    respondWith: () => {
      vendorQueryIntercepted = true
    },
  })
  assert.equal(vendorQueryIntercepted, false)
})
test('service worker serves the exact explicit-demo shell navigation from cache when offline', async () => {
  const matches = []
  const { handlers } = runtime({
    fetchImpl: async () => {
      throw new Error('offline')
    },
    match: async (request) => {
      const url = typeof request === 'string' ? request : request.url
      matches.push(url)
      return url === 'https://relay.test/' ? new Response('cached demo shell') : undefined
    },
  })
  let pending
  handlers.fetch({
    request: { url: 'https://relay.test/?demo=1', method: 'GET', mode: 'navigate' },
    respondWith: (promise) => {
      pending = promise
    },
  })
  assert.ok(pending)
  assert.equal(await (await pending).text(), 'cached demo shell')
  assert.deepEqual(matches, ['https://relay.test/?demo=1', 'https://relay.test/'])
})
test('install precache omits the map library until a map view requests it', async () => {
  const { handlers, cached } = runtime()
  let work
  handlers.install({ waitUntil: (promise) => { work = promise } })
  await work
  assert.equal(cached.some((url) => String(url).includes('maplibre')), false)
  assert.ok(cached.includes('/app.js'))
  assert.ok(cached.includes('/styles.css'))
  assert.ok(cached.includes('/explain.html'))
  assert.ok(cached.includes('/explain.js'))
  assert.ok(cached.includes('/phone-alerts.html'))
})
test('vendor map assets join the shell cache once requested', () => {
  const { handlers } = runtime()
  let intercepted = false
  handlers.fetch({
    request: { url: 'https://relay.test/vendor/maplibre-gl.mjs', method: 'GET' },
    respondWith: () => { intercepted = true },
  })
  assert.equal(intercepted, true)
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
