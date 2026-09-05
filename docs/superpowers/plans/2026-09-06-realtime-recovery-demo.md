# Near-Realtime Recovery and Lifecycle Demo Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add bounded stale-source recovery, a local-only interactive lifecycle demo, and a read-only deployed generation observer.

**Architecture:** Cloudflare Cron remains the primary ingestion path. API reads may schedule recovery through the existing D1 lease only after a 60-second attempt cooldown. A separate Node demo runner owns fixtures and demo controls; a standalone observer proves deployed generation advancement without writing external state.

**Tech Stack:** Node.js 24, ECMAScript modules, TypeScript 7, Cloudflare Workers/D1/Cron, native Node test runner, Playwright Chromium.

## Global Constraints

- Official public-source data is the only production/staging alert input.
- Demo data binds to loopback and must carry a bilingual fixture label.
- No demo endpoint or fixture may be reachable from the Cloudflare Worker.
- Cron ingestion cadence remains one minute; no sub-second delivery claim.
- Recovery retries must respect both the D1 lease and a 60-second last-attempt cooldown.
- Last-good data, source-health disclosure, CAP lifecycle rules, strict TLS, bounded fetches, Marathi labels, and district precision disclosures remain unchanged.

---

### Task 1: Bound request-triggered recovery

**Files:**
- Modify: `server/service.mjs`
- Modify: `src/index.ts`
- Modify: `test/runtime.test.mjs`
- Modify: `test/runtime-worker.test.mjs`

**Interfaces:**
- Consumes: persisted `RelayState.sources[*].lastAttemptAt`, `STALE_MS`, existing `ingest(env)` lease.
- Produces: `snapshotNeedsIngest(state, now, cooldownMs = 60_000): boolean`.

- [x] **Step 1: Write cooldown failures**

Add assertions proving a stale snapshot needs recovery after 60 seconds but does not when its latest enabled-source attempt is 59,999 ms old; disabled/misconfigured sources cannot force recovery.

- [x] **Step 2: Run the focused tests and confirm the recent-attempt case fails**

Run `node --test test/runtime.test.mjs`. Expected failure: `snapshotNeedsIngest` returns `true` for a recent failed attempt.

- [x] **Step 3: Implement the cooldown**

Compute enabled sources, find their newest finite `lastAttemptAt`, return false inside the cooldown, then evaluate uninitialized/stale success timestamps. Keep `ctx.waitUntil(ingest(env))` and D1 lease fencing.

- [x] **Step 4: Verify recovery behavior**

Run `node --test test/runtime.test.mjs test/runtime-worker.test.mjs` and `npm run typecheck`. Expected: all pass; the request response remains immediate and only one lease owner writes.

### Task 2: Isolate and control the lifecycle demo

**Files:**
- Create: `demo/server.mjs`
- Modify: `server/index.mjs`
- Modify: `test/browser-server.mjs`
- Create: `test/demo.test.mjs`
- Modify: `package.json`

**Interfaces:**
- Consumes: `createRelay`, `createRelayServer`, public alert schema.
- Produces: `createDemoRelay(now)`, `startDemoServer({ port = 8799 })`, Node-only `POST /__demo/advance` and `/__demo/reset`.

- [x] **Step 1: Write demo lifecycle failures**

Start a demo server on an ephemeral port. Assert meta environment `demo`, initial count 2, first advance replaces the water Alert with an Update, second advance leaves only the road alert, reset restores two. Assert a normal server rejects `/__demo/advance`.

- [x] **Step 2: Run the test and confirm missing demo controls**

Run `node --test test/demo.test.mjs`. Expected failure: the demo module/control contract is absent.

- [x] **Step 3: Implement the demo runner**

Move reusable fixture construction into `demo/server.mjs`; inject an optional Node-only control handler into `createRelayServer`; keep the Worker entry untouched. Update `npm run demo` and make `test/browser-server.mjs` a thin runner.

- [x] **Step 4: Verify Node isolation**

Run `node --test test/demo.test.mjs test/runtime.test.mjs` and search the Worker bundle for `__demo`/fixture headlines. Expected: tests pass and the dry-run Worker bundle contains neither demo control paths nor fixture messages.

### Task 3: Expose labelled browser demo controls

**Files:**
- Modify: `web/index.html`
- Modify: `web/app.js`
- Modify: `web/ui-model.js`
- Modify: `web/sw.js`
- Modify: `test/browser/civic-hub.spec.mjs`
- Modify: `test/browser/deployed.spec.mjs`
- Modify: `test/ui-model.test.mjs`
- Modify: `test/ui-sw.test.mjs`

**Interfaces:**
- Consumes: `/api/meta.environment`, demo control JSON responses, `nextPollMs(mode)`.
- Produces: visible `#demoBanner`, `#demoAdvance`, `#demoReset`; no controls outside demo mode.

- [x] **Step 1: Add failing browser assertions**

Assert demo controls are visible locally, first advance changes the Pune headline/instruction, second advance removes that alert, and reset restores it. Assert deployed environments hide controls and return non-success for the control URL.

- [x] **Step 2: Run focused Playwright and observe the missing controls**

Run `npm run test:e2e -- --grep "demo lifecycle"`. Expected failure: advance/reset controls are absent.

- [x] **Step 3: Implement the controls and polling schedule**

Render controls only for `environment === "demo"`; POST the local control, then call `refresh()`. Use 60 seconds for healthy/degraded and 15 seconds for stale/loading/error/offline. Bump only this app's shell cache version.

- [x] **Step 4: Verify browser safety and accessibility**

Run `npm run test:e2e` and `node --test test/ui-model.test.mjs test/ui-sw.test.mjs`. Expected: desktop/mobile, English/Marathi, offline, injection, permissions, pagination, deployed isolation, and lifecycle tests pass.

### Task 4: Verify deployed generation advancement

**Files:**
- Create: `scripts/verify-realtime.mjs`
- Create: `test/realtime.test.mjs`
- Modify: `package.json`
- Modify: `docs/HOW-TO.md`
- Modify: `docs/OPERATIONS.md`

**Interfaces:**
- Consumes: `GET ${LIVE_URL}/api/health`.
- Produces: `observeGenerations({ fetch, url, intervalMs, timeoutMs, now, wait })` and `npm run verify:realtime`.

- [x] **Step 1: Write observer failures and success**

Use injected responses to cover two advancing timestamps, repeated timestamp timeout, invalid timestamp, HTTP 503 and time regression.

- [x] **Step 2: Run the test and confirm the observer is missing**

Run `node --test test/realtime.test.mjs`. Expected failure: `scripts/verify-realtime.mjs` cannot be imported.

- [x] **Step 3: Implement the bounded observer**

Poll read-only health, require two unique non-regressing timestamps, print JSON observations, and exit nonzero on failure. Default to production, 5-second polling and a 90-second timeout.

- [x] **Step 4: Verify locally and against staging**

Run `node --test test/realtime.test.mjs` and `LIVE_URL=https://maharashtra-sachet-staging.mangeshraut712.workers.dev npm run verify:realtime`. Expected: deterministic tests pass; staging either proves advancement or produces a truthful bounded failure.

### Task 5: Release verification and deployment

**Files:**
- Modify: `README.md`
- Create: `docs/REALTIME-DEMO-VERIFICATION-2026-09-06.md`
- Modify: `docs/README.md`

**Interfaces:**
- Consumes: all prior tasks and deployment evidence.
- Produces: reproducible demo/live commands, verification matrix, recorded limitations.

- [x] **Step 1: Run the complete local gate**

Run `npm run types`, `npm run typecheck`, `npm test`, `npm run build`, `npm audit`, `npm run test:e2e`, and `git diff --check`. Expected: zero failures; live checks reported separately.

- [x] **Step 2: Inspect the demo visually**

Open `http://127.0.0.1:8799`, verify bilingual fixture label and lifecycle controls at desktop/mobile widths, and capture screenshots under `output/playwright/`.

- [x] **Step 3: Deploy and verify staging**

Run `npm run deploy:staging`, the deployed Playwright suite, API method/filter checks, and the generation observer. Stop before production if any critical/high result remains.

- [x] **Step 4: Deploy and verify production**

Run `npm run deploy:production`, then production Playwright, `/api/health`, `/api/sources`, Marunji search, invalid-input checks and generation observation. Record version ID and actual source states.

- [ ] **Step 5: Commit and push reviewed changes**

Stage only reviewed files, commit with an imperative subject under 72 characters, push `main`, then confirm local HEAD, `origin/main`, GitHub default-branch head and CI conclusion match.
