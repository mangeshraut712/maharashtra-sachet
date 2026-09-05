import { sortKey } from './wea.mjs'

export function mergeAlerts(groups, { now = Date.now(), includeInactive = false } = {}) {
  const byId = new Map()
  for (const list of groups) {
    for (const a of list) {
      if (!a?.id) continue
      const key = `${a.source || 'unknown'}:${a.id}`
      const previous = byId.get(key)
      if (!previous || Date.parse(a.sent) > Date.parse(previous.sent)) byId.set(key, a)
    }
  }
  const retired = new Set()
  for (const a of byId.values()) {
    if (a.status !== 'Actual' || a.scope !== 'Public' || !['Update','Cancel'].includes(a.msgType) || !(Date.parse(a.sent) <= now)) continue
    for (const ref of a.references || []) {
      const key = `${a.source}:${ref.identifier}`
      const original = byId.get(key)
      if (original && a.sender === ref.sender && original.sender === ref.sender && Date.parse(original.sent) === Date.parse(ref.sent) && Date.parse(a.sent) >= Date.parse(original.sent)) retired.add(key)
    }
  }
  const rows = [...byId.entries()].map(([key,a]) => {
    const expires = Date.parse(a.expires)
    const effective = Date.parse(a.effective || a.sent)
    const active = !retired.has(key) && a.status === 'Actual' && a.scope === 'Public' && ['Alert','Update'].includes(a.msgType) && a.recordType !== 'observation' && Date.parse(a.sent) <= now && Number.isFinite(effective) && effective <= now && (!a.expires || (Number.isFinite(expires) && expires > now))
    return { ...a, active }
  })
  return rows.filter(a => includeInactive || a.active).sort((a,b)=>sortKey(b)-sortKey(a))
}

export function snapshotStats(alerts) {
  const byClass = {}
  const byKind = {}
  for (const a of alerts) {
    byClass[a.weaClass] = (byClass[a.weaClass] || 0) + 1
    byKind[a.kind] = (byKind[a.kind] || 0) + 1
  }
  const districtIds = new Set()
  for (const a of alerts) {
    for (const d of a.districts || []) districtIds.add(d.id)
  }
  return {
    total: alerts.length,
    byClass,
    byKind,
    districtsCovered: districtIds.size,
  }
}
