/** Bounding-box helpers shared by the Worker, Node relay, and static map. */

export function inBbox(lon, lat, bbox) {
  return (
    Number.isFinite(lon) &&
    Number.isFinite(lat) &&
    bbox &&
    lon >= bbox.west &&
    lon <= bbox.east &&
    lat >= bbox.south &&
    lat <= bbox.north
  )
}

export function mapFitBounds(bbox) {
  return [
    [bbox.west, bbox.south],
    [bbox.east, bbox.north],
  ]
}

export function bboxPolygonCoordinates(bbox) {
  return [[
    [bbox.west, bbox.south],
    [bbox.east, bbox.south],
    [bbox.east, bbox.north],
    [bbox.west, bbox.north],
    [bbox.west, bbox.south],
  ]]
}

export function firmsAreaParam(bbox) {
  return `${bbox.west},${bbox.south},${bbox.east},${bbox.north}`
}

export function clipPointFeatures(features, bbox) {
  return (features || []).filter((feature) => {
    const [lon, lat] = feature?.geometry?.coordinates || []
    return inBbox(lon, lat, bbox)
  })
}
