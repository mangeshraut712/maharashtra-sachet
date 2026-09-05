# Maharashtra SACHET Cloudflare Modernization Implementation Plan

> For the approved event release, follow `2026-09-05-civic-hub-release.md`. This earlier full-modernization plan remains a roadmap, not a statement of completed implementation.

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the in-memory Node relay with a secure, typed, Cloudflare-native civic alert application, preserve its supported contracts, deploy it, and close all critical/high findings from a live production audit.

**Architecture:** A TypeScript module Worker serves a React/Vite PWA through Static Assets, ingests official feeds from a Cron Trigger, persists validated alerts and source health in D1, and exposes versioned plus legacy-compatible APIs. Division-sharded Durable Objects deliver scoped invalidations; an optional Queue delivers Web Push without putting notification work on ingestion or request paths.

**Tech Stack:** Node.js 24 LTS, npm, TypeScript 7.0.2, React 19.2.8, Vite 8.2.2, Hono 4.13.5, Zod 4.5.4, fast-xml-parser 5.11.1, Cloudflare Workers/Static Assets/D1/Cron/Durable Objects/Queues, Vitest 4.1.11, Playwright 1.62.1, Biome 2.5.12.

## Global Constraints

- Cloudflare is the only deployment target; do not touch the paused Vercel project.
- Preserve the unofficial-relay disclaimer and never imply government or telecom authority.
- Preserve exactly 36 Maharashtra districts and exclude Goa LGD codes.
- Never disable TLS verification, execute feed HTML, log secrets, or send generated emergency instructions.
- Official alert text remains unchanged; interface translations are separate.
- D1 is durable truth; module and Durable Object memory are caches only.
- Keep the existing Node server until the new Worker and PWA meet parity.
- Production deployment follows complete local and staging verification.
- Completion requires a live production audit, remediation, redeployment, and re-audit with no unresolved critical/high findings.

---

### Task 1: Supported Toolchain and Defect Evidence

**Files:**
- Modify: `package.json`
- Modify: `package-lock.json`
- Create: `.node-version`
- Create: `tsconfig.json`
- Create: `biome.json`
- Create: `test/regression/security.test.mjs`
- Modify: `test/relay.test.mjs`

**Interfaces:**
- Consumes: current Node modules and public API behavior.
- Produces: Node 24 scripts and focused failing tests that demonstrate current defects before production code changes.

- [ ] **Step 1: Pin the Node 24 toolchain and exact compatible dependencies**

Set `.node-version` to `24.20.0`, set `engines.node` to `>=24 <25`, add `packageManager: "npm@12.0.2"`, and add scripts named `format`, `format:check`, `lint`, `typecheck`, `test:unit`, `test:worker`, `test:e2e`, `build`, `check`, and `deploy:dry-run`. Install the exact baselines from the design specification and regenerate `package-lock.json` with Node 24.

- [ ] **Step 2: Preserve the current baseline result**

Run:

```bash
npm ci
npm test
```

Expected: dependency installation succeeds on Node 24; existing deterministic tests pass; live-source outcomes are recorded separately because upstream availability is not a deterministic contract.

- [ ] **Step 3: Write focused failing regression tests**

Cover these exact behaviors:

```js
test('remote alert fields render as text and never executable markup', () => {})
test('a changed RSS does not discard individually unchanged CAP alerts', async () => {})
test('mr-IN is preferred over Hindi and Hindi is explicitly labeled as fallback', () => {})
test('invalid API limit returns 400 instead of an empty successful feed', async () => {})
test('legacy live snapshots do not replace 200 alerts with 80', async () => {})
```

Use deterministic fixtures and injected `fetch` functions; do not call public feeds from these tests.

- [ ] **Step 4: Run each reproducer and classify the evidence**

Run the targeted Node test commands and retain only failures caused by the predicted production behavior. Record `REPRODUCED`, `NOT_REPRODUCED`, or `INCONCLUSIVE` in `outputs/bug-reproducer-evidence.json` without claiming untested candidates.

- [ ] **Step 5: Commit the evidence and toolchain**

```bash
git add .node-version package.json package-lock.json tsconfig.json biome.json test outputs
git commit -m "test: establish modernization baseline"
```

### Task 2: Typed Domain, Geography, and CAP Lifecycle

**Files:**
- Create: `src/domain/alert.ts`
- Create: `src/domain/schemas.ts`
- Create: `src/domain/geography.ts`
- Create: `src/domain/classification.ts`
- Create: `src/domain/cap.ts`
- Create: `src/domain/lifecycle.ts`
- Create: `test/domain/geography.test.ts`
- Create: `test/domain/classification.test.ts`
- Create: `test/domain/cap.test.ts`
- Create: `test/domain/lifecycle.test.ts`
- Modify: `test/fixtures/cap-maharashtra-nowcast.xml`
- Modify: `test/fixtures/cap-statewide.xml`
- Modify: `test/fixtures/cap-sawantwadi.xml`
- Modify: `test/fixtures/cap-goa-only.xml`
- Create: `test/fixtures/cap-update.xml`
- Create: `test/fixtures/cap-cancel.xml`
- Create: `test/fixtures/cap-marathi.xml`
- Create: `test/fixtures/cap-adversarial.xml`

**Interfaces:**
- Consumes: current district inventory, CAP fixtures, classification output, and OASIS CAP 1.2 values.
- Produces: `AlertSchema`, `NormalizedAlert`, `parseCapAlert(xml, meta)`, `classifyAlert(alert)`, `matchDistricts(text)`, and `reconcileAlert(existing, incoming, now)`.

- [ ] **Step 1: Define the public domain contract with Zod**

Create a strict `NormalizedAlert` schema containing source identity, lifecycle fields, BCP 47 content blocks, district references, polygons, provenance, presentation class, situation kind, and freshness metadata. Export the inferred TypeScript types; reject unknown enum values at the collector boundary.

- [ ] **Step 2: Port geography with invariant tests first**

Write tests for 36 unique district IDs, six division counts, English/Marathi/IMD aliases, renamed districts, border settlements, statewide text, and Goa exclusions. Port the existing table unchanged unless a failing official-data check proves a correction is required.

- [ ] **Step 3: Port classification with complete table tests**

Represent urgency, severity, and class ranks as typed records. Test every CAP category and situation kind, including `Test`, `Exercise`, rescue, CBRNE, weather, public safety, and unknown values.

- [ ] **Step 4: Implement CAP parsing from failing fixtures**

Parse all `info`, `area`, `geocode`, `polygon`, `resource`, `parameter`, and `reference` instances. Disable entity processing, reject oversized XML before parsing, filter geocodes by declared type, retain declared languages, and model Hindi fallback without labeling it Marathi.

- [ ] **Step 5: Implement lifecycle reconciliation**

Test and implement `Alert`, `Update`, `Cancel`, expiry, supersession, duplicate content hashes, out-of-order messages, and null CAP fields. A cancelled or expired alert remains historical and is excluded from the default active feed.

- [ ] **Step 6: Run and commit domain tests**

```bash
npm run test:unit -- test/domain
npm run typecheck
git add src/domain test/domain test/fixtures
git commit -m "feat: add typed CAP alert domain"
```

### Task 3: Bounded Official-Source Collectors

**Files:**
- Create: `src/collectors/types.ts`
- Create: `src/collectors/http.ts`
- Create: `src/collectors/sachet.ts`
- Create: `src/collectors/imd.ts`
- Create: `src/collectors/incois.ts`
- Create: `src/collectors/cwc.ts`
- Create: `src/collectors/cpcb.ts`
- Create: `test/collectors/http.test.ts`
- Create: `test/collectors/sachet.test.ts`
- Create: `test/collectors/imd.test.ts`
- Create: `test/collectors/incois.test.ts`
- Create: `test/collectors/cwc.test.ts`
- Create: `test/collectors/cpcb.test.ts`

**Interfaces:**
- Consumes: domain parsers/schemas and injected `fetch`.
- Produces: `collectSource(context): Promise<CollectorResult>` where the result kind is `changed`, `unchanged`, `empty`, `degraded`, or `misconfigured`.

- [ ] **Step 1: Test the fetch boundary before implementing it**

Cover allowlisted hosts, final redirect host, TLS failure, abort deadline, response byte limit, accepted content types, 304 validators, bounded public errors, and secret redaction.

- [ ] **Step 2: Implement the shared fetch boundary**

Use injected standard `fetch`, `AbortSignal.timeout`, streaming byte accounting, and source-specific allowlists. Never use Node `https`, `rejectUnauthorized`, or an unbounded `response.text()`.

- [ ] **Step 3: Port collectors one source at a time**

For each source, add fixture tests for success, unchanged, legitimate empty, malformed, timeout, and wrong geography. SACHET keeps unchanged CAP entries when the RSS changes; INCOIS reports strict-TLS failures as degraded; CPCB never exposes its key in URLs stored or logged.

- [ ] **Step 4: Verify all collector contracts**

```bash
npm run test:unit -- test/collectors
npm run typecheck
npm run lint
```

- [ ] **Step 5: Commit collectors**

```bash
git add src/collectors test/collectors
git commit -m "feat: add bounded alert collectors"
```

### Task 4: D1 Persistence and Idempotent Ingestion

**Files:**
- Create: `migrations/0001_initial.sql`
- Create: `src/storage/alerts.ts`
- Create: `src/storage/sources.ts`
- Create: `src/storage/subscriptions.ts`
- Create: `src/ingestion/run.ts`
- Create: `test/worker/storage.test.ts`
- Create: `test/worker/ingestion.test.ts`
- Create: `wrangler.jsonc`
- Create: `worker-configuration.d.ts`

**Interfaces:**
- Consumes: `CollectorResult`, `NormalizedAlert`, a Wrangler-generated `Env`, and D1 bindings.
- Produces: `runIngestion(env, now, fetcher)`, active/history queries, source health, and durable conditional-request state.

- [ ] **Step 1: Write the D1 schema and migration tests**

Create parameterized tables and indexes for `alerts`, `alert_districts`, `source_state`, and `push_subscriptions`. Enforce unique `(source, external_id)` identity and indexed active/expiry/class/district queries.

- [ ] **Step 2: Write failing idempotency and outage tests**

Prove that duplicate scheduled runs create no duplicate change event, older runs cannot replace newer content, partial source failure preserves valid data, a legitimate validated empty feed can clear a source, and malformed empty content cannot.

- [ ] **Step 3: Implement repositories and ingestion orchestration**

Run collectors concurrently with `Promise.allSettled`, reconcile each source independently, commit bounded batches, update source health, and return an `IngestionSummary` containing only public codes and counts.

- [ ] **Step 4: Configure and type Cloudflare bindings**

Use `wrangler.jsonc` with compatibility date `2026-09-04`, module syntax, Static Assets, production/staging D1 declarations, Cron Trigger, Durable Object migration, queues, and observability. Generate `worker-configuration.d.ts` with Wrangler rather than hand-writing bindings.

- [ ] **Step 5: Verify and commit persistence**

```bash
npm run test:worker -- test/worker/storage.test.ts test/worker/ingestion.test.ts
npx wrangler types --check
git add migrations src/storage src/ingestion test/worker wrangler.jsonc worker-configuration.d.ts
git commit -m "feat: persist alert ingestion in D1"
```

### Task 5: Versioned Worker API and Legacy Compatibility

**Files:**
- Create: `src/api/errors.ts`
- Create: `src/api/schemas.ts`
- Create: `src/api/routes.ts`
- Create: `src/api/legacy.ts`
- Create: `src/security/headers.ts`
- Create: `src/worker.ts`
- Create: `test/worker/api.test.ts`
- Create: `test/worker/security.test.ts`

**Interfaces:**
- Consumes: storage repositories, ingestion summary, generated bindings, and Hono.
- Produces: `/api/v1/*`, compatible `/api/*`, module `fetch`, `scheduled`, and `queue` handlers.

- [ ] **Step 1: Write route contract tests**

Test all documented routes, valid filters, cursor pagination, finite limits, `400`, `404`, `405` with `Allow`, ETags, cache controls, read-only CORS, mutation origin restrictions, body limits, and redacted error envelopes.

- [ ] **Step 2: Implement API v1**

Use Hono and Zod validators. Return stable `{ data, meta, error }` envelopes, request IDs, deployment metadata, source freshness, and no raw exceptions or upstream content.

- [ ] **Step 3: Implement compatibility adapters**

Match the existing shape for `/api/health`, `/api/meta`, `/api/alerts`, `/api/coverage`, and SSE `/api/alerts/live`. Send invalidation or complete replacement semantics explicitly so a stream update cannot silently drop alerts.

- [ ] **Step 4: Apply security headers and Static Assets routing**

Serve self-hosted bundles, set a strict CSP, content-type protection, referrer policy, permissions policy, framing protection, and safe cross-origin policies. Run the Worker first only for API paths and security-header coverage required by the config.

- [ ] **Step 5: Verify and commit API**

```bash
npm run test:worker -- test/worker/api.test.ts test/worker/security.test.ts
npm run typecheck
npx wrangler deploy --dry-run
git add src/api src/security src/worker.ts test/worker wrangler.jsonc
git commit -m "feat: add versioned Cloudflare Worker API"
```

### Task 6: Accessible React PWA

**Files:**
- Create: `index.html`
- Create: `vite.config.ts`
- Create: `web/src/main.tsx`
- Create: `web/src/App.tsx`
- Create: `web/src/api/client.ts`
- Create: `web/src/i18n/catalog.ts`
- Create: `web/src/state/preferences.ts`
- Create: `web/src/components/AlertCard.tsx`
- Create: `web/src/components/AlertFilters.tsx`
- Create: `web/src/components/CoverageGrid.tsx`
- Create: `web/src/components/AlertMap.tsx`
- Create: `web/src/components/SourceStatus.tsx`
- Create: `web/src/components/OfflineNotice.tsx`
- Create: `web/src/styles/app.css`
- Create: `web/public/manifest.webmanifest`
- Create: `web/public/icons/icon-192.png`
- Create: `web/public/icons/icon-512.png`
- Create: `web/public/icons/maskable-512.png`
- Create: `test/ui/App.test.tsx`
- Create: `test/ui/AlertCard.test.tsx`
- Create: `test/ui/CoverageGrid.test.tsx`
- Create: `test/ui/OfflineNotice.test.tsx`

**Interfaces:**
- Consumes: API v1 schemas and browser capabilities.
- Produces: responsive bilingual application, locally stored preferences, progressive map, offline shell, and safe text-only rendering of official content.

- [ ] **Step 1: Write component tests for critical states**

Cover alert ordering, remote HTML rendered as text, English/Marathi/fallback labels, active/expired state, filters, 36-district coverage, source degraded/stale state, offline snapshot timestamp, unsupported Notification/WebGL/WebSocket, and sound off by default.

- [ ] **Step 2: Build semantic views and routing**

Implement Active Alerts, District Coverage, Map, and Sources/Preparedness views with landmarks, headings, direct filter URLs, visible focus, color-independent severity, and non-map equivalents.

- [ ] **Step 3: Implement progressive map and offline behavior**

Lazy-load MapLibre only when the map view opens and WebGL2 is supported. Configure a bundled raster style with required attribution. Cache versioned same-origin assets and successful public GET snapshots; display timestamped stale/offline state and never cache error or mutation responses.

- [ ] **Step 4: Implement foreground permissions safely**

Notification and speech/sound capabilities are feature-detected through `window`; permissions are requested only from user gestures; sound defaults off and respects reduced motion/sensory settings.

- [ ] **Step 5: Verify and commit the PWA**

```bash
npm run test:unit -- test/ui
npm run build
npm run typecheck
npm run lint
git add index.html vite.config.ts web test/ui
git commit -m "feat: rebuild accessible alert PWA"
```

### Task 7: Division-Scoped Live Updates and Web Push

**Files:**
- Create: `src/realtime/alert-hub.ts`
- Create: `src/realtime/envelope.ts`
- Create: `src/push/subscriptions.ts`
- Create: `src/push/delivery.ts`
- Create: `web/src/features/live.ts`
- Create: `web/src/features/push.ts`
- Create: `test/worker/realtime.test.ts`
- Create: `test/worker/push.test.ts`

**Interfaces:**
- Consumes: ingestion change events, division mapping, push repositories, VAPID bindings, and Queue batches.
- Produces: hibernating division WebSockets, small invalidation envelopes, opt-in subscription lifecycle, and retryable queue delivery.

- [ ] **Step 1: Test sharding and hibernation lifecycle**

Prove that district subscriptions resolve to one of six division hubs, statewide changes fan out to six hubs, invalid scopes are rejected, attachments survive hibernation, and no global singleton receives all clients.

- [ ] **Step 2: Implement `AlertHub`**

Extend `DurableObject<Env>`, use the Hibernation WebSocket API, serialize only filter metadata, broadcast invalidation envelopes, and persist no canonical alert data in memory.

- [ ] **Step 3: Test Web Push privacy and delivery**

Cover strict subscription schemas, body/rate limits, hashed deletion tokens, VAPID-missing disabled state, filter matching, queue retry, 404/410 cleanup, bounded payloads, and DLQ-compatible terminal failures.

- [ ] **Step 4: Implement opt-in push and client fallback**

Store only minimum subscription fields; request permission from a user gesture; delete through the local deletion token; fall back to minute conditional HTTP refresh when WebSocket or Push APIs are unavailable.

- [ ] **Step 5: Verify and commit live features**

```bash
npm run test:worker -- test/worker/realtime.test.ts test/worker/push.test.ts
npm run test:unit -- test/ui
npm run typecheck
git add src/realtime src/push web/src/features test/worker test/ui wrangler.jsonc
git commit -m "feat: add scoped live and push alerts"
```

### Task 8: End-to-End, Accessibility, CI, and Documentation

**Files:**
- Create: `playwright.config.ts`
- Create: `test/e2e/alerts.spec.ts`
- Create: `test/e2e/accessibility.spec.ts`
- Create: `test/e2e/offline.spec.ts`
- Create: `.github/workflows/ci.yml`
- Create: `.github/workflows/codeql.yml`
- Create: `.github/dependabot.yml`
- Create: `docs/architecture.md`
- Create: `docs/api.md`
- Create: `docs/privacy.md`
- Create: `docs/runbook.md`
- Modify: `README.md`
- Modify: `.env.example`
- Modify: `.gitignore`

**Interfaces:**
- Consumes: complete Worker/PWA and deterministic fixture seed.
- Produces: browser evidence, CI gates, operational documentation, and accurate contributor/deployment commands.

- [ ] **Step 1: Build deterministic browser fixtures**

Seed local D1 with active, expired, cancelled, multilingual, polygon, degraded-source, and adversarial-text alerts. Never require a government endpoint for browser CI.

- [ ] **Step 2: Add cross-browser end-to-end tests**

Run Chromium, Firefox, and WebKit across desktop and mobile viewports. Verify all primary views, filters, direct URLs, Marathi, helplines, map fallback, offline reload, notification denial, WebSocket failure, service-worker update, and console/network cleanliness.

- [ ] **Step 3: Add accessibility gates**

Run axe on each primary view and test keyboard order, focus visibility, 200% zoom, reduced motion, status announcements, target sizes, and severity without color.

- [ ] **Step 4: Add CI and security automation**

Use Node 24, `npm ci`, Biome, TypeScript, all deterministic tests, production build, Wrangler types check, Wrangler dry run, CodeQL, and npm audit. Live-source smoke runs separately and reports source outages without invalidating deterministic correctness.

- [ ] **Step 5: Align documentation and commit**

```bash
npm run check
npm run test:e2e
npm run deploy:dry-run
git add .github README.md .env.example .gitignore docs playwright.config.ts test/e2e
git commit -m "chore: add release verification gates"
```

### Task 9: Cloudflare Staging and Production Deployment

**Files:**
- Modify: `wrangler.jsonc`
- Create: `docs/deployment-evidence.md`

**Interfaces:**
- Consumes: authenticated Wrangler session, verified build, D1 migrations, queues, Durable Object migration, and optional CPCB/VAPID secrets.
- Produces: staged and production Cloudflare URLs, deployment version IDs, migration evidence, and tested rollback command.

- [ ] **Step 1: Inspect authentication and existing resources without mutation**

Run `npx wrangler whoami`, list Workers/D1/queues, and resolve exact resource names before creation. Stop if the account or target names conflict with existing unrelated resources.

- [ ] **Step 2: Run the full local release gate**

```bash
npm ci
npm run check
npm run test:e2e
npm run deploy:dry-run
npm audit --audit-level=high
```

Expected: every deterministic check succeeds and the dry-run bundle reports no configuration or binding error.

- [ ] **Step 3: Provision and deploy staging**

Create only the named staging D1/queues/bindings, apply migrations, deploy with `--env staging`, run scheduled ingestion manually, and execute the complete browser/API/security smoke matrix against the staging URL.

- [ ] **Step 4: Deploy production after staging passes**

Provision named production resources, apply migrations, configure available secrets interactively without logging values, deploy the verified commit, record version ID and URL, invoke one scheduled run, and verify source health before announcing availability.

- [ ] **Step 5: Verify rollback and commit evidence**

Record the exact prior/current version IDs and a non-destructive rollback procedure in `docs/deployment-evidence.md`. Do not roll back a healthy deployment solely to demonstrate the command.

### Task 10: Live Production Audit, Remediation, and Final Re-Audit

**Files:**
- Create: `docs/audits/2026-09-04-production-audit.md`
- Modify: only files required by confirmed findings.

**Interfaces:**
- Consumes: deployed production URL, browser automation, HTTP/TLS checks, Cloudflare logs, and the specification verification matrix.
- Produces: dated evidence for each production check and no unresolved critical/high finding.

- [ ] **Step 1: Audit transport, API, and runtime**

Capture DNS/TLS/redirect/status/cache/compression/security headers, API health and malformed requests, source freshness, ingest provenance, browser console/network errors, Worker exceptions, queue/DLQ state, and sampled logs.

- [ ] **Step 2: Audit the complete browser matrix**

Run desktop/mobile, English/Marathi, filters, details, coverage, source health, helplines, official links, map and fallback, offline/PWA update, notification denial, foreground sound, WebSocket fallback, push when configured, keyboard, focus, zoom, reduced motion, axe, and Core Web Vitals.

- [ ] **Step 3: Write the first production audit report**

For each matrix item record expected behavior, exact command/browser action, observed result, severity, screenshot/log reference, and whether the outcome is verified, blocked by an upstream dependency, skipped with reason, or failed.

- [ ] **Step 4: Reproduce and fix confirmed findings**

For every in-scope finding, add a failing local/staging test, apply the smallest causal fix, run targeted and full verification, redeploy the same verified commit lineage, and capture the live re-test.

- [ ] **Step 5: Close the release gate**

Run the full matrix again. The final report must contain zero unresolved critical/high findings and explicitly list all medium/low residual risks, unavailable integrations, upstream outages, and skipped checks.

- [ ] **Step 6: Commit final evidence and report parity**

```bash
git add docs/audits docs/deployment-evidence.md
git commit -m "docs: record production verification"
git status --short --branch
git rev-parse HEAD
git rev-parse origin/main
```

Report the exact local commit, remote commit, deployment version, production URL, verified checks, skips, and residual risks. Push only after the complete repository status and commit set have been reviewed.
