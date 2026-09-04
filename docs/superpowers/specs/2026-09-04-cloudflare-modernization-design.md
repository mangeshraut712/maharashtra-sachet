# Maharashtra SACHET Cloudflare Modernization Design

**Date:** 2026-09-04  
**Status:** Approved architecture; implementation requires a separate reviewed plan  
**Target:** Cloudflare Workers with Static Assets, D1, Cron Triggers, and narrowly scoped Durable Objects  
**Repository:** `mangeshraut712/maharashtra-sachet`

## 1. Goal

Rebuild Maharashtra SACHET as a secure, typed, Cloudflare-native civic alert relay while preserving the product's core promise: accurately relay official public alerts for all 36 Maharashtra districts without presenting the project as a government system or implying that it can originate cell broadcasts.

The migration must combine three outcomes:

1. Prove and fix correctness, security, and reliability defects in the existing relay.
2. Replace the current in-memory Node.js application with a modern TypeScript full-stack architecture on Cloudflare.
3. Deliver a materially better bilingual, accessible, installable, and observable public-facing product.

## 2. Product Principles

- **Official content remains authoritative.** The application may normalize, classify, filter, and translate interface labels, but it must not use generative AI to rewrite official alert instructions, severity, certainty, geography, or expiry.
- **Accuracy beats novelty.** New libraries and platform features are adopted only when they improve correctness, security, accessibility, maintainability, or verified user experience.
- **No government impersonation.** Every primary view states that the project is unofficial and links to the originating agency.
- **No alert origination.** The application never exposes a control that implies it can send CAP, cell broadcast, WEA, ERSS, or government alerts.
- **Failure is visible.** A broken or stale source is reported as degraded; it is never silently represented as “no alerts.”
- **The list is primary; the map is progressive enhancement.** Users must be able to find and understand alerts without WebGL, map tiles, location permission, sound, or notification permission.
- **Maharashtra-only geography is invariant.** Goa remains excluded while Maharashtra border settlements and all 36 districts remain represented.

## 3. Scope

### 3.1 Included

- CAP 1.2 lifecycle-aware parsing and validation.
- SACHET, IMD, INCOIS, CWC, and optional CPCB ingestion.
- Persistent source state, alert snapshots, history, deduplication, expiry, updates, and cancellations.
- Versioned public API with compatibility routes for the current API.
- React/Vite bilingual PWA served with the Worker as Cloudflare Static Assets.
- District, region, source, class, situation, freshness, and active/expired filters.
- Accessible alert cards, source-health reporting, map polygons, offline last-known data, and install support.
- Opt-in foreground alerts, hibernating WebSocket updates for scoped feeds, and opt-in Web Push.
- Strict input/output validation, security headers, bounded upstream fetches, and dependency scanning.
- Automated unit, contract, integration, end-to-end, accessibility, offline, and deployment checks.
- Cloudflare staging and production configurations, observability, rollback instructions, and GitHub Actions.
- A post-deployment production website audit, remediation pass, redeployment when needed, and evidence-backed final re-audit.

### 3.2 Excluded

- Sending government CAP messages, telecom cell broadcasts, SMS, WhatsApp, ERSS dispatches, or sirens.
- Scraping authenticated/private government systems or bypassing TLS failures.
- User accounts, precise-location tracking, background geofencing, advertising, analytics profiles, or sale of notification endpoints.
- AI-generated summaries or translations of official emergency instructions.
- A native iOS or Android application.
- Replacing official agency websites or claiming guaranteed delivery.

## 4. Verified 2026 Technology Baseline

Versions below were checked against the public npm registry or the official Node.js release index on 2026-09-04. The implementation will lock exact versions and accept upgrades only after the full verification matrix passes.

| Area | Baseline |
| --- | --- |
| Local/CI runtime | Node.js 24 LTS; latest observed `24.20.0` |
| Language | TypeScript `7.0.2`, strict mode |
| UI | React and React DOM `19.2.8` |
| Build/runtime integration | Vite `8.2.2`, `@cloudflare/vite-plugin` `1.54.4` |
| Worker API router | Hono `4.13.5` |
| Runtime schemas | Zod `4.5.4`, `@hono/zod-validator` `0.9.1` |
| XML | `fast-xml-parser` `5.11.1`, with entity processing disabled and byte limits enforced before parsing |
| Map | MapLibre GL JS `6.7.0`, lazy-loaded with a non-map fallback |
| PWA | `vite-plugin-pwa` `1.3.0` with an explicit service worker policy |
| Cloudflare CLI | Wrangler `4.129.0` |
| Worker tests | Vitest `4.1.11`, `@cloudflare/vitest-pool-workers` `0.22.0` |
| Browser tests | Playwright `1.62.1`, `@axe-core/playwright` `4.13.0` |
| UI tests | Testing Library React `16.3.3`, MSW `2.15.0` |
| Formatting/linting | Biome `2.5.12` plus TypeScript compiler checks |

The Worker uses a compatibility date equal to the implementation date and enables `nodejs_compat` only for dependencies that require it. Wrangler-generated binding types are authoritative; the project does not maintain a handwritten `Env` interface.

## 5. Architecture

### 5.1 Deployment Unit

The first production release is one Cloudflare Worker named `maharashtra-sachet` with:

- a module Worker entry point;
- versioned static frontend assets;
- an `ASSETS` binding;
- a production D1 database named `maharashtra-sachet-db`;
- a scheduled handler that performs ingestion once per minute;
- an `AlertHub` Durable Object binding for filtered live updates;
- an `alert-delivery` Queue and `alert-delivery-dlq` for Web Push delivery;
- Cloudflare Workers Logs and sampled traces;
- non-secret configuration in `wrangler.jsonc`; and
- secrets stored only through Cloudflare secret bindings.

Staging uses a separate Worker, D1 database, Durable Object namespace, queues, secrets, and `workers.dev` URL. Production data is never copied into local or staging environments.

### 5.2 Major Modules

The implementation is divided by responsibility:

- `src/domain/`: CAP types, normalized alert schemas, classification, geography, lifecycle reconciliation, and sorting.
- `src/collectors/`: one allowlisted, independently testable collector per official source.
- `src/storage/`: D1 repositories and migrations; no route or collector embeds SQL.
- `src/ingestion/`: concurrent source orchestration, source-health updates, reconciliation, and notification-event creation.
- `src/api/`: Hono routes, request validation, caching, response schemas, and compatibility adapters.
- `src/realtime/`: `AlertHub` Durable Object and WebSocket envelopes.
- `src/push/`: subscription validation, delivery queue messages, VAPID delivery, and expired-endpoint cleanup.
- `src/worker.ts`: small composition root containing `fetch`, `scheduled`, and `queue` handlers.
- `web/src/`: React application organized around alerts, filters, coverage, map, sources, settings, and offline state.
- `test/fixtures/`: immutable sanitized CAP and source fixtures, including malformed and adversarial inputs.

No module-level mutable request or alert state is permitted in the Worker.

## 6. Data Model

### 6.1 `alerts`

The `alerts` table stores the durable normalized record:

- `source` and `external_id` form the unique source identity.
- CAP lifecycle fields include `status`, `message_type`, `references_json`, and `incidents_json`.
- Time fields include `sent_at`, `effective_at`, `onset_at`, `expires_at`, `first_seen_at`, `last_seen_at`, and `ended_at`.
- Indexed classification fields include `severity`, `urgency`, `certainty`, `wea_class`, `situation_kind`, and `is_active`.
- `normalized_json` retains the complete validated public API representation.
- `content_hash` detects meaningful updates without relying only on ETags.
- `supersedes_source` and `supersedes_external_id` connect update/cancel messages to prior alerts.

Expired, cancelled, and superseded alerts remain queryable as history but do not appear in the default active feed.

### 6.2 `source_state`

One row per source stores:

- ETag and Last-Modified validators;
- last attempt, success, content change, and non-empty result timestamps;
- current status: `healthy`, `degraded`, `stale`, `disabled`, or `misconfigured`;
- consecutive failures and the latest bounded error code/summary;
- current item count and last response duration; and
- an explicit freshness threshold per source.

An upstream failure never deletes the previous valid snapshot. A successful empty response replaces prior state only when the source contract allows a legitimate empty feed and the response passes schema validation.

### 6.3 Geography

Districts, divisions, aliases, LGD codes, and supported regions remain source-controlled domain data. Alert-to-district relationships are stored in `alert_districts` with indexes on `district_id` and `alert_key`.

The following invariants are checked in tests and at migration time:

- exactly 36 unique Maharashtra district IDs;
- six revenue divisions with the expected counts;
- no Goa district or Goa LGD code;
- retained aliases for renamed districts and border settlements; and
- every district resolves from English, Marathi, and supported IMD names.

### 6.4 Push Subscriptions

`push_subscriptions` stores only the minimum Web Push fields required for delivery, a SHA-256 endpoint hash, chosen district/class filters, creation/last-success timestamps, and a hashed deletion token. It stores no name, email, precise location, advertising identifier, or account profile.

Expired endpoints are deleted after HTTP 404/410 delivery responses. Users can remove their subscription from the same browser using the deletion token. Subscription creation is rate-limited and body-size limited.

## 7. Ingestion and CAP Semantics

### 7.1 Scheduled Flow

Every minute the scheduled handler:

1. starts one structured ingestion run identifier;
2. reads persisted conditional-request state;
3. fetches enabled sources concurrently with independent timeouts;
4. validates status, final hostname, content type, response size, and source schema;
5. parses and normalizes valid items;
6. reconciles CAP `Alert`, `Update`, and `Cancel` messages and expires old records;
7. commits alerts, districts, and source health in bounded D1 batches;
8. creates change events only for new or materially changed active alerts;
9. publishes division-scoped WebSocket updates; and
10. enqueues Web Push jobs only for matching opted-in subscriptions.

The handler is idempotent for the same upstream content. Concurrent or retried scheduled runs cannot regress a newer source snapshot.

### 7.2 Upstream Fetch Policy

- All upstream hostnames and paths are source-controlled allowlists.
- TLS certificate verification is mandatory. INCOIS becomes `degraded` if its endpoint cannot establish valid TLS.
- Redirects are followed only when the final hostname remains allowlisted.
- Each request uses an abort deadline and a maximum response size before XML/JSON parsing.
- XML entity processing is disabled.
- Response content types and minimum structures are checked before parsing.
- SACHET cookies exist only within the ingestion invocation; cookie values are never logged or returned.
- CPCB API keys are Worker secrets and are never included in errors, logs, fixtures, client responses, or source URLs stored in D1.
- Collectors return discriminated results: `changed`, `unchanged`, `empty`, `degraded`, or `misconfigured`.

### 7.3 Language Rules

CAP `info` blocks are retained by their declared BCP 47 language. Marathi preference order is `mr`, then an explicitly labeled Hindi `hi` fallback, then English. Hindi content is never labeled as Marathi.

Interface translations are maintained separately from official alert content. When the selected language is unavailable, the UI labels the fallback language instead of silently pretending it is translated.

## 8. Public API

### 8.1 Versioned Routes

- `GET /api/v1/health`: Worker, database, last ingestion, and deployment identity; returns degraded status when required sources are stale.
- `GET /api/v1/meta`: districts, divisions, regions, classification labels, helplines, official links, and supported locales.
- `GET /api/v1/alerts`: cursor-paginated alerts with validated filters.
- `GET /api/v1/alerts/:source/:externalId`: one normalized alert plus lifecycle references.
- `GET /api/v1/coverage`: all 36 districts with active counts and source freshness.
- `GET /api/v1/sources`: per-source health, freshness, and last-success information without sensitive errors.
- `GET /api/v1/live`: WebSocket upgrade for one division or district-scoped feed.
- `POST /api/v1/push/subscriptions`: create or replace an opt-in subscription.
- `DELETE /api/v1/push/subscriptions/:endpointHash`: remove a subscription using its deletion token.

### 8.2 Compatibility Routes

Current `GET /api/health`, `/api/meta`, `/api/alerts`, `/api/coverage`, and `/api/alerts/live` remain during one documented compatibility window. They are implemented as adapters over the new domain/API layer. The legacy live route remains SSE and never truncates the client's current feed without an explicit snapshot-replace envelope.

### 8.3 API Contracts

- Query parameters are schema-validated; invalid enum values, cursors, and limits return structured `400` responses.
- Limits are finite integers with a documented maximum.
- Public GET routes use explicit cache controls, ETags, and CORS `*` without credentials.
- Mutation routes allow only the deployed application origins and reject oversized or incorrectly typed bodies.
- Every response has a stable JSON envelope with `data`, `meta`, and `error` fields.
- Errors expose a request ID and public code, not raw upstream bodies, stack traces, keys, cookies, or subscription endpoints.

## 9. Real-Time and Notification Behavior

- The default all-state dashboard uses conditional HTTP refresh once per minute. It does not require a globally shared Durable Object.
- Selecting a district or revenue division may establish one hibernating WebSocket to the corresponding division `AlertHub`.
- There is no all-state global singleton Durable Object. Statewide changes are fanned out to the six division hubs.
- WebSocket messages contain small invalidation/change envelopes; clients refetch canonical API data instead of trusting a full pushed snapshot.
- Foreground sound is off by default, requires an explicit user gesture, respects reduced-motion/sensory preferences, and is never the only warning signal.
- Web Push is opt-in, filterable, reversible, and disabled when VAPID secrets are absent.
- Push payloads contain source, class, district summary, headline, alert ID, and a link to the application. They never claim guaranteed delivery.

## 10. Frontend Experience

### 10.1 Information Architecture

The application has four primary views:

1. **Active alerts:** prioritized cards, filters, freshness, and clear empty/degraded states.
2. **District coverage:** all 36 districts grouped by division, with active counts and direct filter links.
3. **Map:** lazy-loaded polygons and district context, paired with an equivalent text list.
4. **Source status and preparedness:** official source health, last successful refresh, helplines, disclaimers, and official links.

Settings include English/Marathi interface selection, saved districts, foreground sound, push subscription, reduced-data mode, and install instructions.

### 10.2 Alert Card

Each alert card shows, in this order:

- unofficial relay label and mapped presentation class;
- official event headline with explicit source language;
- severity, urgency, certainty, active/expired status, sent/effective/expiry time;
- affected districts and area description;
- official description and instruction without HTML execution;
- source freshness and direct official-source link; and
- context-appropriate emergency helplines.

The WEA-like class is clearly described as a UI mapping, not an Indian government or telecom classification.

### 10.3 Accessibility and Resilience

- WCAG 2.2 AA is the acceptance target.
- Semantic headings, landmarks, form labels, status regions, keyboard navigation, visible focus, target sizing, and contrast are verified.
- Severity is never communicated by color alone.
- Dynamic updates do not steal focus or repeatedly announce the entire feed.
- Marathi typography and wrapping are tested at 320 CSS pixels and 200% zoom.
- The alert list remains usable when maps, tiles, notifications, service workers, WebSockets, or WebGL are unavailable.
- The service worker caches only versioned same-origin assets and the latest successful public GET responses. It never caches mutation responses, opaque third-party scripts, or error pages as valid alert data.
- Offline mode displays the cached snapshot timestamp and a prominent stale/offline warning.

## 11. Security Design

- Remote feed content is inserted through React text rendering; no alert field reaches `innerHTML`, raw HTML, executable URLs, style attributes, or map popup HTML.
- Content Security Policy uses self-hosted scripts/styles, blocks objects and framing, limits connections to the application API and approved tile host, and avoids `unsafe-eval`.
- Additional headers include `X-Content-Type-Options`, `Referrer-Policy`, `Permissions-Policy`, frame protection through CSP, and an appropriate cross-origin policy set.
- External links use HTTPS and safe opener isolation.
- Only declared HTTP methods are accepted; other methods return `405` with `Allow`.
- Request bodies, query strings, WebSocket scopes, push subscriptions, XML/JSON bodies, and log fields have explicit bounds.
- D1 statements are parameterized through repository methods.
- Secrets exist only in Worker bindings. Local examples contain names, never values.
- Push deletion tokens use Web Crypto and constant-time comparison where secret material is compared.
- Dependency review, lockfile integrity, CodeQL, secret scanning, and a production-bundle audit run in CI.

## 12. Observability and Operations

- Structured log events include request/ingestion ID, source, outcome, duration, count, and bounded public error code.
- Raw alert descriptions, API keys, cookies, push endpoints, and request bodies are not logged.
- Source health and last-success timestamps are available from the API and a human-readable UI.
- Staging logs use full sampling; production starts with conservative log and trace sampling.
- Health distinguishes application availability from data freshness.
- Deployment metadata contains Git commit SHA and build time.
- The runbook covers source outage, malformed feed, D1 migration failure, queue backlog, push-delivery failure, rollback, and disabling an individual collector.

## 13. Testing Strategy

### 13.1 Required Layers

- **Characterization tests:** freeze current supported API and district behavior before migration.
- **Regression tests:** prove suspected defects before applying production fixes, including feed-content injection, SACHET conditional-fetch state loss, language fallback, CAP polygon placement, invalid limits, overlapping ingestion, and live-feed truncation.
- **Domain tests:** CAP lifecycle, time/expiry, classification, geography, sorting, deduplication, and null handling.
- **Collector contract tests:** mocked HTTP responses for success, 304, empty, malformed, oversized, timeout, redirect, wrong content type, TLS failure, and rate limiting.
- **Worker integration tests:** routes, D1 migrations, scheduled runs, Durable Objects, queue consumers, cache headers, CORS, and security headers inside the Workers runtime.
- **Component tests:** filters, cards, language fallback, freshness, offline/degraded states, and safe remote text rendering.
- **End-to-end tests:** desktop and mobile Chromium, Firefox, and WebKit; keyboard-only use; Marathi; offline reload; notification denial; WebSocket failure; map failure; install shell; and API error recovery.
- **Accessibility tests:** automated axe checks plus documented manual keyboard, focus, zoom, screen-reader landmark, and color-independent severity checks.
- **Live-source smoke:** isolated, non-blocking scheduled checks that never make the deterministic CI suite depend on government endpoint uptime.

### 13.2 Verification Commands

The final implementation exposes canonical scripts for:

- format check;
- lint;
- TypeScript typecheck;
- unit/component tests;
- Workers integration tests;
- production build;
- Playwright end-to-end and accessibility tests;
- Wrangler binding-type check;
- Wrangler deployment dry run; and
- dependency/security audit.

No aggregate green script is accepted unless each underlying command's output and exit code are visible in CI.

## 14. Migration Sequence

### Phase 1: Prove Current Behavior and Defects

Install the supported Node.js 24 toolchain, run the existing suite, separate deterministic tests from live-source checks, add characterization coverage, and reproduce the highest-risk candidates. No production fix is applied until its regression test fails for the expected reason.

### Phase 2: Domain and Collector Core

Introduce strict TypeScript schemas and port district, classification, CAP, and collector logic behind compatibility tests. Fix proven parsing, lifecycle, sanitization, timeout, and state-retention defects without changing the public response contract.

### Phase 3: Cloudflare Runtime and Persistence

Add the Worker composition root, D1 migrations/repositories, scheduled ingestion, API v1, source health, Static Assets, Wrangler-generated types, and staging configuration. Verify local scheduled events, D1 persistence, API compatibility, and a deployment dry run.

### Phase 4: Product Frontend

Replace the vanilla DOM application with the typed React PWA. Implement the accessible information architecture, bilingual content handling, responsive layouts, saved districts, source health, offline snapshot, and progressively enhanced map.

### Phase 5: Live Updates and Push

Add division-sharded hibernating WebSockets, opt-in Web Push, delivery queues, DLQ handling, endpoint cleanup, notification settings, and privacy documentation. These features stay disabled until their secrets and production origin are configured.

### Phase 6: CI, Security, Operations, and Release

Add GitHub Actions, CodeQL, dependency updates, full verification, staging deployment, browser smoke checks, production runbook, and release documentation. Production deployment occurs only after an explicit deployment authorization and a successful staging review.

### Phase 7: Production Website Audit and Stabilization

After the verified production deployment, audit the live Cloudflare URL rather than assuming local or staging evidence proves production behavior. The production audit covers:

- DNS, TLS, redirects, canonical URL, HTTP status, caching, compression, and security headers;
- `/api/v1/health`, source freshness, current ingestion state, compatibility routes, malformed requests, and public error redaction;
- desktop and mobile layouts, English and Marathi, filters, alert details, coverage, source status, helplines, map fallback, and external official-source links;
- keyboard navigation, visible focus, 200% zoom, automated accessibility checks, contrast, target sizing, reduced motion, and screen-reader landmarks/status behavior;
- service-worker installation and update behavior, offline reload, stale-data disclosure, manifest validity, notification denial, opt-in foreground alerts, WebSocket fallback, and Web Push when production VAPID secrets are configured;
- Core Web Vitals and supporting loading/runtime measurements on the deployed build, including cold and repeat navigation;
- browser console errors, failed network requests, Cloudflare Worker exceptions, ingestion failures, queue/DLQ state, and sampled production logs; and
- provenance checks confirming that displayed live alerts preserve official text, source attribution, time, geography, severity, expiry, and lifecycle state.

Findings are recorded in a dated repository audit report with severity, reproduction evidence, affected URL/viewport, fix, and re-test result. Critical and high-severity findings block completion. Confirmed in-scope findings are fixed, verified locally and in staging, redeployed, and re-audited in production. Environmental or upstream-source limitations are documented explicitly rather than marked as passed.

The old Node server remains available until Phases 1-4 meet API and user-flow parity. Removal happens in its own reviewed change after rollback evidence exists. The migration is not complete until Phase 7 has produced a clean final audit or an explicit list of accepted residual limitations.

## 15. Success Criteria

The modernization is complete only when all of the following are true:

1. Deterministic tests prove and then verify fixes for every accepted high-confidence defect.
2. All 36 districts, expected division counts, renamed districts, supported aliases, and Goa exclusions pass invariant tests.
3. CAP `Alert`, `Update`, `Cancel`, expiry, multilingual `info`, geocode, polygon, and null cases pass fixture-based conformance tests.
4. Upstream failures preserve the last valid snapshot and surface degraded/stale source status.
5. No collector disables TLS, performs an unbounded body read, follows an unapproved redirect, or logs secret material.
6. Remote feed fields cannot create executable DOM, script, URL, or map-popup content.
7. API v1 and compatibility routes pass schema, pagination, validation, caching, CORS, security-header, and error-redaction checks.
8. Scheduled ingestion is idempotent, overlap-safe, retry-safe, and persistent across Worker isolates.
9. The frontend passes supported desktop/mobile browser flows, offline recovery, Marathi rendering, and WCAG 2.2 AA automated checks plus the documented manual checklist.
10. The application remains useful without WebGL, WebSockets, Push API, notification permission, sound, or an available tile server.
11. Cloudflare binding types, D1 migrations, Worker startup profile, production build, and Wrangler dry run pass in CI.
12. Staging displays current source health, correct commit metadata, all security headers, and successful end-to-end smoke evidence.
13. The README, architecture notes, API documentation, privacy notice, source-attribution policy, incident runbook, and deployment instructions match the verified implementation.
14. Production is deployed only after explicit authorization, and rollback to the prior version is documented and tested.
15. The deployed production website passes the Phase 7 audit with no unresolved critical or high-severity findings.
16. Every confirmed production finding has red-to-green local or staging evidence plus a successful live production re-test after redeployment.
17. The final dated audit report distinguishes verified behavior, unavailable external integrations, upstream outages, skipped checks, and accepted residual risks.

## 16. Known Constraints and Decisions

- Cloudflare Cron provides minute-level, not sub-minute, scheduled ingestion; the user-facing freshness target is therefore one minute plus upstream response time.
- D1 is the source of durable truth. Worker and Durable Object memory are caches only.
- A source with invalid TLS is reported unavailable; certificate verification is never bypassed.
- MapLibre requires WebGL2. The primary list and coverage views remain complete without it.
- Web Push delivery is best effort and browser/platform dependent. Official cell broadcast and agency channels remain the primary warning path.
- The existing US WEA visual analogy is retained only as a clearly labeled presentation mapping.
- The project will not chase prerelease frameworks or replace stable dependencies merely to increase version numbers.

## 17. Release Gate

Before production deployment, the implementation must provide a verification matrix containing the exact command or browser check, initial result, applied fix, final result, and evidence for every area in this specification. Any item not verified is reported as remaining work; it is not inferred from unrelated green checks.

After production deployment, the same evidence standard applies to the live website audit. Deployment success, HTTP 200, green CI, or one browser smoke test cannot independently satisfy the release gate. Completion requires the dated production audit report and its final re-audit results.
