/** Browser/Node adapter: generic map model plus this deployment's region pack. */
import region from './region.json' with { type: 'json' }
import { mapFitBounds as fit } from './modules/geo.mjs'
import { alertsToMapGeoJSON as featuresFromAlerts, capPolygonsToGeoJSON } from './modules/map-model.mjs'

export const REGION = region
export const MH_BBOX = region.bbox
export const DISTRICT_CENTROIDS = region.districtCentroids

export { capPolygonsToGeoJSON }

export function alertsToMapGeoJSON(alerts, centroids = DISTRICT_CENTROIDS) {
  return featuresFromAlerts(alerts, centroids)
}

export function mapFitBounds(bbox = MH_BBOX) {
  return fit(bbox)
}
