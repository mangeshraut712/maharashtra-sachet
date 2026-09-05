# Civic hub release implementation plan

**Goal:** Ship the approved Maharashtra civic hub with verified source semantics and a truthful event demo.

**Architecture:** Shared ESM domain and service functions, a TypeScript Worker with D1/Cron, and the existing small frontend rebuilt for safe accessible rendering. This implements the scoped design dated 2026-09-05; the larger 2026-09-04 plan remains a roadmap.

## Checkpoints and ownership

- [x] Inspect current checkout, prior design, source adapters and test commands; confirm scope with user.
- [x] Check official event page, government service directories and US IPAWS references.
- [x] Core lane: fix `server/{http,sachet,imd,incois,cwc,cpcb,wea,merge}.mjs`; prove changed behavior in deterministic tests and gate live tests explicitly.
- [x] Runtime lane: build `server/service.mjs`, safe Node composition, `src/index.ts`, D1 repository, migrations, environment config and Workers integration tests.
- [x] Coverage lane: add `server/coverage-catalog.mjs`, alias search retaining ambiguity, twelve service categories and coverage-gap tests.
- [x] UI lane: replace unsafe alert markup; implement bilingual responsive list, filters, service directories, source state, offline cache and opt-in foreground notifications.
- [x] Integrate all lanes, run `npm test`, `npm run types`, `npm run typecheck`, `npm run build`, `npm audit`, and `npm run test:e2e` on Node 24.
- [x] Deploy isolated staging, apply its D1 migration, verify real ingestion and browser flows.
- [x] Deploy production only after staging evidence; verify the live URL, headers, source freshness, localities, filters and measured performance.
- [x] Update README, source research, API reference, operations/privacy notes, submission draft and dated verification report.

## Contract

Legacy `/api` routes and `/api/v1` aliases share response semantics. `/alerts` returns alerts, count, source state, generated timestamp and stats. `/meta` supplies districts, regions, class/category labels, helplines, official links, serviceCategories and localityCoverage. `/locations?q=` returns district-alias choices with precision disclosure. `/coverage` distinguishes listed districts from actual live source coverage. `/health` reports degraded/uninitialized data rather than unconditional success.

## Verification strategy

Source adapters are tested with injected responses and fixed times. Storage keeps raw lifecycle messages so a later refresh cannot revive a cancelled alert. Node tests exercise public routes; Miniflare tests use actual D1 bindings. Browser tests run against local fixtures and the deployed app without inserting fabricated production alerts. Network outages are recorded separately from deterministic regressions.

## Deployment authority

The user's request and subsequent approved scope authorize staging and production deployment of this project. They do not authorize a paid subscription upgrade, new third-party messages, leaderboard enrollment, or final event submission. Existing credentials are used only through normal authenticated tools.
