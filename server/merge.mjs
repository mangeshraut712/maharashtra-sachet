import { sortKey } from './wea.mjs'

export function mergeAlerts(groups) {
  const byId = new Map()
  for (const list of groups) {
    for (const a of list) {
      if (!a?.id) continue
      if (!byId.has(a.id)) byId.set(a.id, a)
    }
  }
  return [...byId.values()].sort((a, b) => sortKey(b) - sortKey(a))
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
