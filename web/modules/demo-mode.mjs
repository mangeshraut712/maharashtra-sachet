// Demo is an explicit URL choice. Never infer it from empty or failed live feeds.
export const isDemoQuery = search => new URLSearchParams(search).get('demo') === '1'

export function demoApiUrl(path, demo) {
  if (!demo || !path.startsWith('/api/')) return path
  const url = new URL(path, 'https://relay.invalid')
  url.searchParams.set('demo', '1')
  return `${url.pathname}${url.search}`
}

export const snapshotKey = demo => demo ? 'mh-sachet-demo-snapshot' : 'mh-sachet-snapshot'

export function snapshotMatchesMode(saved, demo) {
  const sample = saved?.meta?.environment === 'demo' || saved?.body?.demo === true
    || saved?.body?.alerts?.some(alert => alert.demo === true || alert.id?.startsWith('demo-'))
  return Boolean(sample) === demo
}
