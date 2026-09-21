# Architecture

This document describes how the **unofficial** Maharashtra civic relay moves public data from agencies to the browser. It is not a cell-broadcast originator. **CAP from the issuer is the sole authority.** In danger call **112**.

Related: [API](API.md) · [Operations](OPERATIONS.md) · [Coverage](COVERAGE.md) · [Source research](SOURCE_RESEARCH.md) · [WEA / IPAWS research](WEA-IPAWS-RESEARCH.md) · [Forking](FORKING.md)

## Pipeline

```text
Public agency feeds
        │
        ▼
Collectors (bounded HTTP, schema, ETag where required)
        │
        ▼
Merge + CAP lifecycle (Actual/Public, Update/Cancel, expiry)
        │
        ▼
D1 last-good snapshots (per source) + generation lease
        │
        ▼
Public GET JSON API  (/api/health, /alerts, /sources, /meta, …)
        │
        ▼
Web client: poll 60s / 15s stale · bulletin list
        └── MapLibre (when present): same snapshots, CAP polygons on a map
```

Nothing in this path sends Wireless Emergency Alerts, C-DOT cell broadcast, or IPAWS messages.

## Sources

Collectors live under `server/` and are registered in `sourceCollectors()` (`server/service.mjs`).

| Id | Role | Default |
| --- | --- | --- |
| `sachet` | NDMA SACHET CAP for Maharashtra (`rss_maharashtra.xml`), session + ETag cache per NDMA consumer rules | Enabled |
| `imd` | IMD district nowcast RSS; titles mapped to districts | Enabled |
| `incois` | INCOIS catalog observations filtered to a west-coast/Arabian Sea window; not a synthetic tsunami watch | Enabled |
| `cwc` | Direct CWC adapter | **Disabled** until a verified public schema exists; CWC CAP may still arrive via SACHET |
| `cpcb` | data.gov.in station pollutant observations | **Disabled** (`CPCB_ENABLED=false`); not AQI |

Failed collections keep the previous records and surface `degraded` / `stale` / allowlisted `errorCode` values. `healthy` with `count: 0` is a successful empty contract, not safety.

## Collectors

- Timeouts, response-size caps, content-type checks, no TLS bypass (`server/http.mjs`).
- XML parsers disable entity expansion; CAP polygons and geocodes (LGD district codes) are validated.
- SACHET persists `{etag, xml}` in the source snapshot so `304` reuses cached CAP.
- Per-source JSON in D1 is bounded (`MAX_SOURCE_BYTES`, 900 000). Hitting the cap **fails closed**; do not drop Cancel records to make health green.

Local Node (`server/index.mjs`) polls collectors on an interval (`POLL_MS`, default 60 s). Cloudflare Workers run the same `collectSnapshot` from a one-minute cron and from bounded recovery on stale API reads (`src/index.ts`).

## Merge and lifecycle

`retainLifecycle` keeps Cancel/Update rows if a later successful fetch omits the retirement message.

`mergeAlerts` (`server/merge.mjs`):

- Identity is `source:id` (not a bare identifier across issuers).
- Newer `sent` wins for the same key.
- Update/Cancel retire referenced alerts only when **sender** and **sent** match the CAP `<references>` tuple.
- Public bulletin rows are `status=Actual`, `scope=Public`, `msgType` Alert or Update, not `observation`, effective/sent in the past, not expired, not retired.

`publicSnapshot` then classifies each source (`healthy` / `degraded` / `stale` / `disabled` / `misconfigured` / `uninitialized`) and builds stats. Observations (for example CPCB concentrations) stay out of the active alert list.

## D1

Schema: [migrations/0001_relay.sql](../migrations/0001_relay.sql).

| Table | Purpose |
| --- | --- |
| `source_snapshots` | One JSON payload per source id (records, health, optional `capCache`) |
| `relay_state` | Single row: `generated_at`, ingestion `lease_token` / `lease_until` |

Writes use a **token-owned 120-second lease** (`src/storage.ts`). Only the holder may persist; a stale writer cannot overwrite a newer generation. Staging and production use **separate** databases (IDs in `wrangler.jsonc` belong to this deployment; forks must create their own).

## Public GET API

`handleApi` in `server/service.mjs` is shared by the Worker and the local Node server.

- Methods: GET and HEAD. Mutations return **405**. `/api/v1/...` aliases `/api/...`.
- `Cache-Control: no-store` on JSON so caches cannot hide expiry.
- Routes: [docs/API.md](API.md). `/api/alerts/live` is **410** with polling guidance (no truncated stream).
- Pagination uses `limit` / `offset` / `snapshot`; a generation change returns **409**—clients restart at offset 0.
- Production/staging may `waitUntil` recovery ingest when data is uninitialized or older than five minutes; the **current** response is still the snapshot just read (60 s attempt cooldown + lease).

There is no public refresh, write, citizen-report, or Web Push subscription endpoint.

## Web

`web/` is static assets (`wrangler.jsonc` `assets`). `web/app.js`:

- Loads `/api/meta` and paginated `/api/alerts`.
- Polls about **60 s** when healthy/degraded and **15 s** when stale, error, or uninitialized (`/api/meta.delivery`).
- Optional foreground `Notification` while the tab is open; closing the page stops polling.
- May cache the last public snapshot in `localStorage` for labelled offline/stale display.

**MapLibre** (open work on the map PR, not required on `main` at the time of this doc): a map view consumes the **same** GET snapshots. Official CAP polygons are drawn when present; district centroids are approximate navigation only. Bulletin text, issuer links, and CAP `areaDesc` remain authoritative. The list UI must still work without WebGL.

**Situational layers** and **Jev shadow triage** (stacked PRs, flags off): optional overlays or ops-only pipelines. They must not be enabled by default, must not look like CAP, and must not be ingested as official alerts.

## Runtimes

| Path | Role |
| --- | --- |
| `src/index.ts` | Worker `fetch` + `scheduled` ingest |
| `server/index.mjs` | Local HTTP server + in-memory snapshots |
| `demo/server.mjs` | Fixture demo (`npm run demo`); labelled fake alerts |

## Trust boundaries

- Upstream: public HTTP(S) only; treat XML/JSON as untrusted.
- Persistence: last-good official records, not user PII ([PRIVACY.md](PRIVACY.md)).
- Browser: no GPS requirement; CSP and security headers in `SECURITY_HEADERS`.
- Operators: Worker logs are outcome/source/error **category** only.
