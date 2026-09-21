/** Pure map helpers for the static UI (tested in Node). */

export const MH_BBOX = Object.freeze({
  west: 72.62,
  south: 15.6,
  east: 80.88,
  north: 22.03,
})

/** @type {Record<string, [number, number]>} lon, lat */
export const DISTRICT_CENTROIDS = {
  ahilyanagar: [74.75, 19.09],
  akola: [77, 20.7],
  amravati: [77.75, 20.93],
  beed: [75.76, 18.99],
  bhandara: [79.66, 21.17],
  buldhana: [76.18, 20.53],
  chandrapur: [79.3, 19.96],
  'chhatrapati-sambhajinagar': [75.34, 19.88],
  dharashiv: [76.04, 18.19],
  dhule: [74.77, 20.9],
  gadchiroli: [80, 20.18],
  gondia: [80.2, 21.45],
  hingoli: [77.15, 19.72],
  jalgaon: [75.56, 21.01],
  jalna: [75.88, 19.84],
  kolhapur: [74.24, 16.7],
  latur: [76.58, 18.41],
  'mumbai-city': [72.83, 18.97],
  'mumbai-suburban': [72.85, 19.18],
  nagpur: [79.09, 21.15],
  nanded: [77.32, 19.15],
  nandurbar: [74.24, 21.37],
  nashik: [73.79, 20],
  palghar: [72.77, 19.7],
  parbhani: [76.78, 19.27],
  pune: [73.86, 18.52],
  raigad: [73.18, 18.25],
  ratnagiri: [73.31, 17],
  sangli: [74.57, 16.85],
  satara: [74.02, 17.68],
  sindhudurg: [73.82, 16.17],
  solapur: [75.91, 17.66],
  thane: [72.97, 19.2],
  wardha: [78.6, 20.75],
  washim: [77.13, 20.11],
  yavatmal: [78.13, 20.39],
}

/**
 * CAP polygons are rings of [lat, lon]; GeoJSON uses [lon, lat].
 * @param {number[][][]} polygons
 */
export function capPolygonsToGeoJSON(polygons, properties = {}) {
  const features = []
  for (const ring of polygons || []) {
    if (!Array.isArray(ring) || ring.length < 3) continue
    const coords = ring.map((pair) => {
      const lat = pair[0]
      const lon = pair[1]
      if (!Number.isFinite(lat) || !Number.isFinite(lon)) return null
      return [lon, lat]
    })
    if (coords.some((c) => !c)) continue
    const closed =
      coords[0][0] === coords[coords.length - 1][0] &&
      coords[0][1] === coords[coords.length - 1][1]
        ? coords
        : [...coords, coords[0]]
    features.push({
      type: 'Feature',
      properties: { ...properties, geometrySource: 'cap-polygon' },
      geometry: { type: 'Polygon', coordinates: [closed] },
    })
  }
  return { type: 'FeatureCollection', features }
}

/**
 * @param {Array<{ id: string, polygons?: number[][][], districts?: Array<{ id: string }>, headlineEn?: string, weaClass?: string }>} alerts
 */
export function alertsToMapGeoJSON(alerts) {
  const polygonFeatures = []
  const districtFeatures = []
  const seenDistricts = new Set()

  for (const alert of alerts) {
    const label = alert.headlineEn || alert.id || 'Alert'
    if (alert.polygons?.length) {
      const collection = capPolygonsToGeoJSON(alert.polygons, {
        alertId: alert.id,
        label,
        weaClass: alert.weaClass || '',
      })
      polygonFeatures.push(...collection.features)
    }
    for (const district of alert.districts || []) {
      if (!district?.id || seenDistricts.has(district.id)) continue
      const coord = DISTRICT_CENTROIDS[district.id]
      if (!coord) continue
      seenDistricts.add(district.id)
      districtFeatures.push({
        type: 'Feature',
        properties: {
          districtId: district.id,
          label: district.en || district.id,
          geometrySource: 'district-centroid',
        },
        geometry: { type: 'Point', coordinates: coord },
      })
    }
  }

  return {
    polygons: { type: 'FeatureCollection', features: polygonFeatures },
    districts: { type: 'FeatureCollection', features: districtFeatures },
  }
}

export function mapFitBounds() {
  return [
    [MH_BBOX.west, MH_BBOX.south],
    [MH_BBOX.east, MH_BBOX.north],
  ]
}
