import { matchDistricts } from './districts.mjs'
import { fetchText } from './http.mjs'

const RESOURCE = '3b01bcb8-0b14-4abf-b6f2-c1bfd384ba69'

function redactCpcbError(error, apiKey) {
  const secret = String(apiKey || '')
  let message = String(error?.message || 'CPCB upstream request failed')
  if (secret) {
    message = message.split(secret).join('[redacted]')
    try { message = message.split(encodeURIComponent(secret)).join('[redacted]') } catch { /* key was not encodable */ }
  }
  if (error?.name === 'SyntaxError' || message.includes('[redacted]') || /api-key|api_key/i.test(message)) {
    const safe = new Error(error?.name === 'SyntaxError' ? 'Unsupported CPCB schema' : 'CPCB upstream request failed')
    safe.name = error?.name === 'SyntaxError' ? 'SyntaxError' : 'Error'
    return safe
  }
  const safe = new Error(message.slice(0, 160))
  if (error?.code) safe.code = error.code
  safe.name = error?.name || 'Error'
  return safe
}

export async function collectCpcb(apiKey, cities = [], options = {}) {
  if (!apiKey) { const error = new Error('CPCB API key is not configured'); error.code = 'SOURCE_MISCONFIGURED'; throw error }
  if (!Array.isArray(cities) || cities.length > 36) throw new Error('Invalid CPCB city list')
  const deadline = AbortSignal.timeout(25_000)
  const signal = options.signal ? AbortSignal.any([options.signal,deadline]) : deadline
  const observations = []
  for (const city of cities) {
    const url = `https://api.data.gov.in/resource/${RESOURCE}?api-key=${encodeURIComponent(apiKey)}&format=json&limit=50&filters[city]=${encodeURIComponent(city)}`
    let res
    try { res = await fetchText(url, { ...options, signal, expectedContentTypes:['application/json'] }) }
    catch (error) { throw redactCpcbError(error, apiKey) }
    if (!res.ok) throw new Error(`CPCB HTTP ${res.status}`)
    let json
    try { json = JSON.parse(res.text) }
    catch (error) { throw redactCpcbError(error, apiKey) }
    if (!Array.isArray(json.records)) throw new Error('Unsupported CPCB schema')
    for (const sample of json.records) {
      if (sample.state && !/^maharashtra$/i.test(sample.state)) continue
      const raw = sample.pollutant_avg
      if (raw == null || String(raw).trim() === '' || !Number.isFinite(Number(raw))) continue
      const pollutant = String(sample.pollutant_id || '')
      if (!pollutant || !sample.station) continue
      observations.push({
        id:`cpcb-${city}-${sample.station}-${pollutant}-${sample.last_update || ''}`,
        source:'cpcb', official:true, recordType:'observation', sender:'CPCB', author:'CPCB via data.gov.in',
        warningDisabledReason:'Pollutant concentration is not an AQI value or an official public warning.',
        sent:sample.last_update, status:'Actual', scope:'Public', msgType:'Alert', category:'Env', event:'Air pollutant observation',
        urgency:'Unknown', severity:'Unknown', certainty:'Observed', language:'en',
        headlineEn:`${city}: ${pollutant} average ${raw}`, headlineMr:'',
        description:`${sample.station}: ${pollutant} average ${raw}. Unit and averaging period must be checked at the source.`, instruction:'',
        districts:matchDistricts(city).map(({id,en,mr,lgd})=>({id,en,mr,lgd})),
        capUrl:'https://airquality.cpcb.gov.in/AQI_India/', weaClass:'PUBLIC_SAFETY', kind:'air',
        extra:{pollutant, concentration:Number(raw), station:sample.station},
      })
    }
  }
  return observations
}
