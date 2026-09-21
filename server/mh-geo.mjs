/**
 * Maharashtra map helpers — approximate district points for UX only.
 * Not official boundaries; CAP polygons remain authoritative where present.
 */

/** @type {{ west: number, south: number, east: number, north: number }} */
export const MH_BBOX = Object.freeze({
  west: 72.62,
  south: 15.6,
  east: 80.88,
  north: 22.03,
})

/** Representative [longitude, latitude] per district id (hq-ish, rounded). */
export const DISTRICT_CENTROIDS = Object.freeze({
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
})

export function inMaharashtraBbox(lon, lat) {
  return (
    Number.isFinite(lon) &&
    Number.isFinite(lat) &&
    lon >= MH_BBOX.west &&
    lon <= MH_BBOX.east &&
    lat >= MH_BBOX.south &&
    lat <= MH_BBOX.north
  )
}
