# Source research and coverage contract

Research date: 2026-09-05. A readable official webpage establishes a directory source, not a stable machine-readable alert feed or permission to republish arbitrary personal records.

See [the expanded WEA/IPAWS research](WEA-IPAWS-RESEARCH.md) for current US terminology, India's May 2026 CBS launch and NDMA's mandatory ETag cache contract. Those later retrieved official documents supersede the preliminary access limitations below.

| Area | Official evidence | Release treatment |
| --- | --- | --- |
| Multi-hazard alerts | [NDMA SACHET](https://sachet.ndma.gov.in/) and [Maharashtra SDMA FAQ](https://sdma.maharashtra.gov.in/en/faqs/) | Public CAP relay; health and freshness remain visible |
| Weather | [IMD](https://mausam.imd.gov.in/) | Existing public nowcast adapter, bounded fetching and source attribution |
| Fire, chemical, infrastructure, biological hazards | [SDMA responsibilities](https://sdma.maharashtra.gov.in/en/faqs/) | CAP when actually issued; no inferred universal incident feed |
| Health | [Public Health Department](https://phd.maharashtra.gov.in/en/) | Official directory; no patient/outbreak surveillance integration |
| Transport | [Transport Department](https://transports.maharashtra.gov.in/en/) | Official directory; not live traffic, rail or road-closure coverage |
| Power | [MSEDCL consumer sitemap](https://www.mahadiscom.in/en/consumer/consumer-portal-sitemap/) | Directory includes outage-information entry; live statewide adapter not verified |
| Water, sanitation and municipal services | [Directorate of Municipal Administration FAQ](https://mahadma.maharashtra.gov.in/en/faq/) | Local-body responsibility; directory with explicit feed gap |
| Administration | [Urban Development Department](https://urban.maharashtra.gov.in/) | Official service discovery, not automatically verified ward notices |
| Rural/agriculture | [Agriculture department](https://agri.maharashtra.gov.in/) | Official directory, not complete crop/pest/livestock reporting |
| Locations | [Local Government Directory](https://lgdirectory.gov.in/) | Authoritative registry candidate for a later versioned import; current inherited aliases only |
| AQI | [CPCB](https://airquality.cpcb.gov.in/AQI_India/) | Do not relabel station pollutant concentration as AQI |

## Location precision

LGD distinguishes districts, subdistricts, villages, local bodies and wards. A municipality is not always a single district and a similarly named locality may exist in multiple districts. Current autocomplete returns all matching district-alias candidates with an explicit precision field. It is not a complete LGD village or ward export. No fictitious IDs or blanket claim of village completeness is permitted.

## US comparison

[FEMA IPAWS](https://www.fema.gov/emergency-managers/practitioners/integrated-public-alert-warning-system) is the architectural reference, not a service this application is authorized to originate through. [FEMA Tip 38](https://www.fema.gov/sites/default/files/documents/fema_ipaws-tip-38-it-vs-ps.pdf) distinguishes public-safety information, such as water advisories and emergency-phone outages, from imminent threats. [FEMA's WEA capabilities guidance](https://www.fema.gov/sites/default/files/documents/fema_ipaws-guidance-wea-versions-provider-links.pdf) describes handset/version-dependent geofencing and message capabilities.

Those FEMA documents were indexed by the search provider; direct retrieval returned HTTP 403 during this audit. Do not characterize that as a live API integration or fresh standards-conformance certification. The implementation borrows clear provenance, affected-area targeting, severity/urgency/certainty, lifecycle updates/cancellations, accessibility and multiple delivery fallbacks. It does not emulate broadcast authority, government branding, or delivery guarantees.

## Event

[Codex Build House Pune](https://luma.com/sq2mmwfm) describes a one-day builder event and a community-solution-friendly remit. The inspected public page does not provide a submission endpoint, time cutoff, judging rubric or rules on pre-existing code. Those remain organizer questions. Preserve prior git history and describe event-day improvements honestly.

## Initial source/code findings

- `http.mjs` disabled TLS certificate verification for INCOIS and lacked response-size bounds.
- CAP Hindi text was used in the Marathi headline slot.
- Raw upstream text reached `innerHTML` and map popup HTML.
- A magnitude threshold could promote an earthquake observation into a tsunami-watch/imminent presentation.
- CPCB pollutant averages were passed directly to AQI thresholds without an AQI calculation contract.
- Merge identity used only an external ID and did not reconcile expiry/cancellation.
- CWC failures returned a successful empty array; health reported unconditional success.
- UI live snapshots shrank a 200-item initial list to 80 entries.

These are code observations at the baseline. Dated verification records state which have regression evidence and which have been fixed.
