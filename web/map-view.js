import { alertsToMapGeoJSON, mapFitBounds, REGION } from './map-model.js'
import { bboxPolygonCoordinates } from './modules/geo.mjs'

const STYLE_URL = 'https://demotiles.maplibre.org/style.json'

let map = null
let mapReady = false
let mapFailed = false
let pendingUpdate = null
let pendingSituational = null
let observer = null
let mapLibrePromise = null

export function resolveMapLibreModule(mod) {
  const api = mod?.default && typeof mod.default.Map === 'function' ? mod.default : mod
  if (!api || typeof api.Map !== 'function') return null
  return api
}

function loadMapLibre() {
  if (mapFailed) return Promise.resolve(null)
  if (!mapLibrePromise) {
    // Dynamic import keeps MapLibre off the app.js module graph so a vendor/CSP
    // failure cannot prevent the alert bulletin from rendering.
    mapLibrePromise = import('/vendor/maplibre-gl.mjs')
      .then((mod) => {
        const api = resolveMapLibreModule(mod)
        if (!api) {
          mapFailed = true
          return null
        }
        if (typeof api.setWorkerUrl === 'function') {
          api.setWorkerUrl('/vendor/maplibre-gl-worker.mjs')
        }
        return api
      })
      .catch(() => {
        mapFailed = true
        return null
      })
  }
  return mapLibrePromise
}

function regionBbox(bbox) {
  return bbox && Number.isFinite(bbox.west) ? bbox : REGION.bbox
}

function ensureMap(container, maplibregl, bbox) {
  if (map) return map
  const box = regionBbox(bbox)
  map = new maplibregl.Map({
    container,
    style: STYLE_URL,
    bounds: mapFitBounds(box),
    fitBoundsOptions: { padding: 24, maxZoom: 8 },
    attributionControl: { compact: true },
    dragRotate: false,
    pitchWithRotate: false,
    touchPitch: false,
    keyboard: false,
  })
  map.on('load', () => {
    mapReady = true
    map.addSource('region-bbox', {
      type: 'geojson',
      data: {
        type: 'Feature',
        properties: {},
        geometry: {
          type: 'Polygon',
          coordinates: bboxPolygonCoordinates(box),
        },
      },
    })
    map.addLayer({
      id: 'region-bbox-line',
      type: 'line',
      source: 'region-bbox',
      paint: { 'line-color': '#8d775b', 'line-width': 1, 'line-dasharray': [2, 2] },
    })
    map.addSource('cap-polygons', { type: 'geojson', data: { type: 'FeatureCollection', features: [] } })
    map.addLayer({
      id: 'cap-polygons-fill',
      type: 'fill',
      source: 'cap-polygons',
      paint: { 'fill-color': '#a44b13', 'fill-opacity': 0.25 },
    })
    map.addLayer({
      id: 'cap-polygons-outline',
      type: 'line',
      source: 'cap-polygons',
      paint: { 'line-color': '#7a3410', 'line-width': 2 },
    })
    map.addSource('alert-districts', { type: 'geojson', data: { type: 'FeatureCollection', features: [] } })
    map.addLayer({
      id: 'alert-districts-circle',
      type: 'circle',
      source: 'alert-districts',
      paint: {
        'circle-radius': 7,
        'circle-color': '#254563',
        'circle-stroke-color': '#fff',
        'circle-stroke-width': 1.5,
      },
    })
    map.addSource('situational-quakes', { type: 'geojson', data: { type: 'FeatureCollection', features: [] } })
    map.addLayer({
      id: 'situational-quakes-circle',
      type: 'circle',
      source: 'situational-quakes',
      paint: {
        'circle-radius': 5,
        'circle-color': '#6b4c9a',
        'circle-stroke-color': '#fff',
        'circle-stroke-width': 1,
      },
      layout: { visibility: 'none' },
    })
    map.addSource('situational-fires', { type: 'geojson', data: { type: 'FeatureCollection', features: [] } })
    map.addLayer({
      id: 'situational-fires-circle',
      type: 'circle',
      source: 'situational-fires',
      paint: {
        'circle-radius': 4,
        'circle-color': '#c45c26',
        'circle-opacity': 0.75,
      },
      layout: { visibility: 'none' },
    })
    if (pendingUpdate) {
      applyData(pendingUpdate)
      pendingUpdate = null
    }
    if (pendingSituational) {
      applySituational(pendingSituational)
      pendingSituational = null
    }
  })
  map.on('error', () => {
    /* Tile/style errors must not surface as page errors that fail the bulletin. */
  })
  return map
}

function applySituational({ snapshot, showQuakes, showFires }) {
  if (!mapReady || !map) return
  const quakeSource = map.getSource('situational-quakes')
  const fireSource = map.getSource('situational-fires')
  if (quakeSource) quakeSource.setData(snapshot?.quakes || { type: 'FeatureCollection', features: [] })
  if (fireSource) fireSource.setData(snapshot?.fires || { type: 'FeatureCollection', features: [] })
  if (map.getLayer('situational-quakes-circle')) {
    map.setLayoutProperty('situational-quakes-circle', 'visibility', showQuakes ? 'visible' : 'none')
  }
  if (map.getLayer('situational-fires-circle')) {
    map.setLayoutProperty('situational-fires-circle', 'visibility', showFires ? 'visible' : 'none')
  }
}

export function updateSituationalMap({ snapshot, showQuakes, showFires, bbox }) {
  const container = document.getElementById('alertMap')
  if (!container || mapFailed) return
  void (async () => {
    try {
      const maplibregl = await loadMapLibre()
      if (!maplibregl) return
      ensureMap(container, maplibregl, bbox)
      const payload = { snapshot, showQuakes, showFires }
      if (!mapReady) pendingSituational = payload
      else applySituational(payload)
    } catch {
      mapFailed = true
    }
  })()
}

function applyData({ alerts, selectedDistrictId, centroids }) {
  if (!mapReady || !map) return
  const { polygons, districts } = alertsToMapGeoJSON(alerts, centroids || REGION.districtCentroids)
  const polygonSource = map.getSource('cap-polygons')
  const districtSource = map.getSource('alert-districts')
  if (polygonSource) polygonSource.setData(polygons)
  if (districtSource) {
    const features = selectedDistrictId
      ? districts.features.filter((f) => f.properties.districtId === selectedDistrictId)
      : districts.features
    districtSource.setData({ type: 'FeatureCollection', features })
  }
}

async function loadAndUpdate({ container, alerts, selectedDistrictId, bbox, centroids }) {
  if (!container || mapFailed) return
  const payload = { alerts, selectedDistrictId, centroids }
  try {
    const maplibregl = await loadMapLibre()
    if (!maplibregl) return
    ensureMap(container, maplibregl, bbox)
    if (!mapReady) pendingUpdate = payload
    else applyData(payload)
  } catch {
    mapFailed = true
  }
}

export function updateAlertMap({ container, alerts, selectedDistrictId }) {
  if (!container) return
  void loadAndUpdate({ container, alerts, selectedDistrictId })
}

export function bindLazyMap(container, getMapInput) {
  if (!container || observer) return
  observer = new IntersectionObserver(
    (entries) => {
      for (const entry of entries) {
        if (!entry.isIntersecting) continue
        updateAlertMap({ container, ...getMapInput() })
      }
    },
    { rootMargin: '120px' },
  )
  observer.observe(container)
}

export function refreshMap(getMapInput) {
  const container = document.getElementById('alertMap')
  if (!container) return
  updateAlertMap({ container, ...getMapInput() })
}
