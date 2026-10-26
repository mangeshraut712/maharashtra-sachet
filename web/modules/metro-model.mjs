import { alertContent, matchingAlerts } from '../ui-model.js'

// Static station directory, checked against Pune Metro's project profile.
// This is district-alias mapping only: no station boundaries or train feed.
export const METRO_SOURCE = 'https://punemetrorail.org/project-profile'
export const METRO_STATIONS = Object.freeze([
  ['vanaz', 'Vanaz', 'वनाझ'],
  ['anand-nagar', 'Anand Nagar', 'आनंद नगर'],
  ['ideal-colony', 'Ideal Colony', 'आयडियल कॉलनी'],
  ['nal-stop', 'Nal Stop', 'नळ स्टॉप'],
  ['garware-college', 'Garware College', 'गरवारे कॉलेज'],
  ['deccan-gymkhana', 'Deccan Gymkhana', 'डेक्कन जिमखाना'],
  ['sambhaji-udyan', 'Chhatrapati Sambhaji Udyan', 'छत्रपती संभाजी उद्यान'],
  ['pmc', 'PMC', 'पुणे महानगरपालिका'],
  ['district-court', 'District Court', 'जिल्हा न्यायालय'],
  ['mangalwar-peth', 'Mangalwar Peth', 'मंगळवार पेठ'],
  ['pune-railway', 'Pune Railway Station', 'पुणे रेल्वे स्थानक'],
  ['ruby-hall', 'Ruby Hall Clinic', 'रुबी हॉल क्लिनिक'],
  ['bund-garden', 'Bund Garden', 'बंड गार्डन'],
  ['yerawada', 'Yerawada', 'येरवडा'],
  ['kalyani-nagar', 'Kalyani Nagar', 'कल्याणी नगर'],
  ['ramwadi', 'Ramwadi', 'रामवाडी'],
].map(([id, en, mr]) => Object.freeze({ id, en, mr, districtId: 'pune', precision: 'district-alias' })))

export function stationDistrict(stationId) {
  return METRO_STATIONS.find(station => station.id === stationId)?.districtId || null
}

export function metroAlerts(alerts, stationId, now = Date.now()) {
  const district = stationDistrict(stationId)
  return district ? matchingAlerts(alerts, { district }, [], now) : []
}

export function metroExplainHref(alert, { demo = false } = {}) {
  const content = alertContent(alert, 'en')
  const sample = demo || alert.demo === true
  const text = [
    sample ? '[DEMO / SAMPLE DATA — NOT A LIVE GOVERNMENT ALERT]' : '',
    content.headline,
    `District: ${(alert.districts || []).map(d => d.en || d.id).join(', ')}`,
    content.description,
    content.instruction,
    'Metro mapping: Pune district alias only. This does not establish an impact at any station or on train service.',
  ].filter(Boolean).join('\n').slice(0, 6000)
  return `/explain${sample ? '?demo=1' : ''}#${new URLSearchParams({ alert: text, run: '1' })}`
}
