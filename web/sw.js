const CACHE = 'mh-sachet-shell-v3'
const SHELL = [
  '/',
  '/index.html',
  '/styles.css',
  '/app.js',
  '/ui-model.js',
  '/manifest.webmanifest',
  '/icon.svg',
]
self.addEventListener('install', (event) => {
  event.waitUntil(caches.open(CACHE).then((cache) => cache.addAll(SHELL)))
})
self.addEventListener('activate', (event) => {
  event.waitUntil(
    Promise.all([
      caches
        .keys()
        .then((keys) =>
          Promise.all(
            keys
              .filter(
                (key) => /^mh-sachet-shell-v\d+$/.test(key) && key !== CACHE,
              )
              .map((key) => caches.delete(key)),
          ),
        ),
      self.clients.claim(),
    ]),
  )
})
self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url)
  if (
    event.request.method !== 'GET' ||
    url.origin !== self.location.origin ||
    url.search ||
    !SHELL.includes(url.pathname)
  )
    return
  event.respondWith(
    (async () => {
      const cache = await caches.open(CACHE)
      try {
        const response = await fetch(event.request)
        if (response.ok && response.type === 'basic') {
          try {
            await cache.put(event.request, response.clone())
          } catch {
            /* Cache quota must not break an online response. */
          }
        }
        return response
      } catch {
        return (
          (await cache.match(event.request)) ||
          new Response('Offline shell unavailable', {
            status: 503,
            headers: { 'content-type': 'text/plain' },
          })
        )
      }
    })(),
  )
})
