/**
 * Optional MapLibre helpers. CAP polygons stay authoritative; centroids are
 * orientation only. Pass a region pack (bbox + districtCentroids) so forks
 * are not tied to Maharashtra.
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
 * @param {Array<{ id: string, polygons?: number[][][], districts?: Array<{ id: string, en?: string }>, headlineEn?: string, weaClass?: string }>} alerts
 * @param {Record<string, [number, number]>} centroids lon,lat by district id
 */
export function alertsToMapGeoJSON(alerts, centroids = {}) {
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
      const coord = centroids[district.id]
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
