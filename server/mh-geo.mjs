/**
 * Maharashtra-oriented re-exports. Forks should edit `web/region.json` and
 * keep this file as a thin adapter, or import the region pack directly.
 */
import region from '../web/region.json' with { type: 'json' }
import { inBbox } from '../web/modules/geo.mjs'

export const REGION = region
export const MH_BBOX = Object.freeze({ ...region.bbox })
export const DISTRICT_CENTROIDS = Object.freeze({ ...region.districtCentroids })

export function inRegionBbox(lon, lat, bbox = MH_BBOX) {
  return inBbox(lon, lat, bbox)
}

export function inMaharashtraBbox(lon, lat) {
  return inRegionBbox(lon, lat, MH_BBOX)
}
