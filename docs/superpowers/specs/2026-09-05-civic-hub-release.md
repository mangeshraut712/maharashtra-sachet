# Maharashtra civic hub: event release scope

Approved by the user in this task on 2026-09-05. This scoped release extends the 2026-09-04 design. It does not claim that every phase of that longer modernization is complete.

## Product

A fast English/Marathi public information hub for Maharashtra: official emergency alerts, discoverable district/place coverage, non-weather service directories, and visible source freshness. Users can discover their district, read the issuing agency's affected-area description and instructions, and find the relevant official service.

## Release architecture decision

Keep the existing small, buildless ESM frontend for the event release, with safe DOM rendering and no mandatory third-party map dependency. A TypeScript Cloudflare Worker serves assets and the API; D1 retains source snapshots and lifecycle messages; Cron refreshes enabled sources. The Node entry point remains a local development and verification host. Shared domain functions keep both runtimes consistent.

This incremental approach prioritizes verified alert semantics and usability over the earlier proposed React/Vite rewrite. React, WebSocket Durable Objects, background Web Push/Queues and a comprehensive geographic registry remain later modernization phases. The current release uses bounded conditional HTTP polling and opt-in foreground notifications. No UI advertises unavailable push delivery.

## Content and coverage

- Preserve the 36-district inventory and both English and Marathi district search.
- Resolve inherited place aliases to districts, retaining multiple choices for ambiguous names. Never label these aliases a verified village registry or assign invented village LGD identifiers.
- Maharashtra border settlements remain discoverable; neighboring states are not silently included as Maharashtra districts. Read the issuing agency's actual polygons/text before interpreting impact.
- Support non-weather categories: fire/rescue, industrial/chemical, health, transport, water/sanitation, electricity, infrastructure, administration, agriculture and public safety.
- For a category lacking an integrated public feed, show an official directory and an explicit coverage gap. No synthetic live notices, community accusations or private missing-person data.
- Preserve CAP status, scope, sender, language, severity, urgency, certainty, times, polygons and lifecycle references. Separate observations from actionable issued warnings.
- A geological event's magnitude does not authorize a tsunami warning. A pollutant concentration does not equal an AQI. Rescue is not inherently AMBER; keywords do not establish national-emergency authority.
- Unknown/stale/failed sources never produce an “all clear” assurance.

## Security and privacy

Bounded HTTPS requests to approved source paths; validate redirects before following; keep TLS verification enabled. Disable XML entity processing. Render source content as text and restrict source-link schemes/hosts. No user login, stored precise coordinates, analytics profiling, or external report submission. Save preferences and optional last-known public snapshots locally. Cached information has an explicit age warning.

## Acceptance

1. Offline tests cover expiry, CAP updates/cancellations, source-qualified identity, multilingual fallback, safe HTTP, geography and civic categories.
2. Both Node and Worker APIs validate inputs, expose source health and preserve last good snapshots through outages.
3. D1 persistence and out-of-order write protection pass in the Workers emulator.
4. Browser checks cover English/Marathi, narrow/wide viewports, keyboard/focus, accessibility, service directories, filtering, offline/error state, source content injection and notification denial.
5. Build, type checking, dependency audit and Worker dry run pass.
6. Isolated staging is deployed and checked before production; production gets a separate live check with real source status and measured performance.
7. Documentation reports measured results, disabled sources and remaining coverage honestly.

## Release limitations

This is an unofficial civic relay, not an emergency dispatch or cell-broadcast originator. No guaranteed completeness, immediate delivery, ground-truth incident verification or government equivalence. Missing event submission instructions must be supplied by organizers before a final submission is sent.
