# Maharashtra Civic Alerts

An independent English/Marathi civic information hub for Maharashtra. Read official public alerts, find your district through place-name search, inspect source freshness, and reach official services for weather, fire, industry, health, transport, water, electricity, infrastructure, administration and agriculture.

**This is not a government website or an emergency dispatch service.** It cannot originate government alerts, cell broadcasts or US Wireless Emergency Alerts. In immediate danger, contact emergency services and follow the issuing agency. No relayed alerts does not mean an area is safe.

## What this release provides

- All 36 Maharashtra districts, regional filters and English/Marathi district search.
- Place aliases, including border locations, with ambiguous district choices preserved. Exact village/ward boundary coverage is **not verified**.
- Official NDMA SACHET CAP and IMD nowcast ingestion, with explicit unavailable/stale states.
- CAP updates, cancellations, expiry, public/actual status, source-qualified identities and original language labels.
- Twelve service areas with official directory links and honest coverage gaps. Directory links do not imply live feeds.
- A responsive, accessible alert list, source status, locally saved preferences and labelled offline snapshots.
- Optional notifications for new relevant urgent alerts while the page is open. Background Web Push is not implemented in this release.
- A Cloudflare Worker with Static Assets, D1 persistence, scheduled ingestion, separate staging/production databases and a local Node server.

## Source limitations

| Source | Treatment |
| --- | --- |
| NDMA SACHET | Public CAP relay; incomplete or invalid fetches preserve previous data and report degradation |
| IMD | Public district nowcasts; no invented severity, urgency or Marathi translation |
| INCOIS | Earthquake observations are not promoted to tsunami warnings; strict TLS failure is reported |
| CWC | Direct adapter disabled until its public schema is verified; follow the official FloodWatch link |
| CPCB | Optional station observations; pollutant concentration is not presented as AQI or an emergency warning |
| Municipal, power, transport, health and rural services | Official directories; comprehensive live locality feeds are not connected |

See [source research](docs/SOURCE_RESEARCH.md) for provenance and [coverage policy](docs/COVERAGE.md) for precision limits.

## Run locally

Use Node.js 24 LTS (the tested patch is recorded in `.node-version`) and npm.

```sh
npm ci
npm start
# http://127.0.0.1:8787
```

The Node host polls live public sources. For deterministic browser fixtures, use `npm run test:e2e`; fixture records never enter the production Worker.

Optional CPCB credentials must be supplied as a process environment variable `DATA_GOV_IN_API_KEY` or a Cloudflare secret. No credentials are required for the default SACHET/IMD relay. The Node host does not automatically load `.env` files. See [operations](docs/OPERATIONS.md).

## Verify

```sh
npm test                  # offline core/API/D1 tests; live tests skipped explicitly
npm run types             # regenerate Cloudflare binding and runtime types
npm run typecheck
npm run build             # local Worker packaging, no external deployment
npx playwright install --no-shell chromium
npm run test:e2e           # desktop/mobile, Marathi, accessibility, offline and injection checks
npm audit
npm run test:live          # opt-in government network checks; may fail on upstream outages
```

Results and limitations are in [the dated verification report](docs/VERIFICATION-2026-09-05.md). A passing offline suite does not establish that government feeds or every locality are currently covered.

## Cloudflare

```sh
npx wrangler d1 migrations apply maharashtra-sachet-local --local
npm run dev:worker
```

Follow the staging-first commands in [operations](docs/OPERATIONS.md). Cloudflare credentials use Wrangler's authenticated session; never put tokens in source files. D1 retains last-good source data and cancellation records. A scheduled run cannot overwrite a newer run after losing its lease.

## API and documentation

- [API reference](docs/API.md)
- [Architecture and approved release scope](docs/superpowers/specs/2026-09-05-civic-hub-release.md)
- [Release checklist](docs/superpowers/plans/2026-09-05-civic-hub-release.md)
- [Privacy](docs/PRIVACY.md)
- [Operations and rollback](docs/OPERATIONS.md)
- [Event submission draft and demo](docs/SUBMISSION.md)
- [Security reporting](SECURITY.md)
- [WEA/IPAWS research and Maharashtra-to-India roadmap](docs/WEA-IPAWS-RESEARCH.md)
- [Maharashtra public-service design refresh](docs/DESIGN-2026-09-05.md)

The September 4 modernization design is a longer-term roadmap. This release keeps a small vanilla frontend; React, background push, a complete official locality registry and WebSocket infrastructure are not claimed as complete.

## Contributing

Use deterministic fixtures for new adapters. Prove upstream schema, attribution, time semantics, location precision, permitted public access and failure behaviour. Add an offline regression test before changing alert semantics. Do not add unverified incident generation, personal reports, automated emergency translation, or a send-to-all-phones control.

The software is MIT licensed. Government content remains attributed to its source and is subject to the source's terms; the software license does not relicense that content.
