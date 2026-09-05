# Near-Realtime Recovery and Lifecycle Demo Design

**Date:** 2026-09-06  
**Status:** Approved in conversation  
**Scope:** Complete the existing uncommitted recovery/demo draft without changing alert authority or source semantics

## Goal

Make the Maharashtra civic alert hub recover promptly when scheduled ingestion is late, demonstrate alert lifecycle behavior safely, and provide evidence that a deployed environment is producing new generations.

## Product contract

“Realtime” means near-realtime relay of official source updates: Cloudflare scheduled ingestion runs once per minute, and browsers refresh the resulting snapshots. The product does not claim sub-second delivery, government cell broadcast, guaranteed receipt, or awareness of incidents absent from connected sources.

Production and staging contain only collector output from configured official public sources. Demonstration records remain on a loopback-only Node server and are visibly labelled as fixtures. No demo route, control, or fixture is included in the Cloudflare Worker entry point.

## Production recovery

Cloudflare Cron remains the canonical writer. When a production or staging API read finds uninitialized or stale enabled sources, the Worker may schedule one background ingestion through `ExecutionContext.waitUntil()`. A D1 lease still provides overlap protection.

Recovery eligibility must also use `lastAttemptAt`: if any enabled source was attempted during the previous 60 seconds, the request returns current state without scheduling another recovery. This limits public-request amplification when upstream systems stay unavailable. Disabled and misconfigured sources do not force recovery.

The browser polls every 60 seconds for healthy or degraded snapshots and every 15 seconds for uninitialized, stale, loading, error, or offline states. Faster client polling does not bypass the server cooldown.

## Local lifecycle demo

`npm run demo` starts a loopback server on port 8799 with `environment: demo`. The page shows an unmissable bilingual fixture banner. The initial state has a Pune/Marunji water-service fixture and a Sindhudurg road fixture.

Two demo-only POST controls exist in the Node server only:

- `POST /__demo/advance` advances the Pune fixture through Alert → Update → Cancel while leaving the road fixture active.
- `POST /__demo/reset` restores the initial two-alert state.

The browser shows controls only when `/api/meta` declares `environment: demo`. Production and staging return `404` for these paths. The demo server refreshes its source-health timestamp without changing official-source code so a long-running presentation does not falsely become stale.

## Deployed generation observer

`npm run verify:realtime` reads `/api/health` from `LIVE_URL` (production by default) at a bounded interval. It succeeds only after observing two distinct, non-regressing `generatedAt` values within 90 seconds. It prints timestamps and health states but never triggers ingestion or writes cloud state.

## Error handling

- A recovery ingestion failure leaves last-good D1 data intact and source health degraded/stale.
- The request that schedules recovery returns immediately with the current snapshot.
- Demo controls validate method and path and return structured JSON.
- The observer fails for missing/invalid timestamps, time regression, HTTP/network errors, or no generation advance before the deadline.
- All fixture text remains visibly labelled and is never sent through production notification or deployment paths.

## Verification

- Unit tests cover recovery cooldown, uninitialized state, disabled sources, recent failed attempts, and generation ordering.
- Node integration tests prove demo reset/advance lifecycle and that normal servers lack demo controls.
- Browser tests prove the demo banner and controls, Alert → Update → Cancel rendering, Marathi copy, and hidden controls on deployed environments.
- Existing CAP, D1, security, offline, accessibility, pagination, type, build, and dependency checks stay green.
- Live source tests and generation observation are reported separately from deterministic tests.
- Staging precedes production deployment; production is deployed only after deterministic, browser, build, and staging checks pass.

## Exclusions

No WebSocket or Durable Object is added: official input changes no faster than the one-minute ingestion cadence, so those components would add state without improving source freshness. No production fixture endpoint, fake alert, report-submission feature, background Web Push, or government origination capability is added.
