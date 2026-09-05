# Verification record — 2026-09-05

Scope: the approved September 5 civic-hub release. This is not a certification of comprehensive Maharashtra incident coverage or WEA/IPAWS compliance.

Latest frontend deployment: see the public-service design refresh addendum below. Earlier version IDs and measurements are retained as historical evidence.

## Local verification

| Check | Observed result |
| --- | --- |
| Node runtime | 24.19.0, scoped to task commands; system default unchanged |
| Deterministic tests | 75 tests: 72 passed, 3 opt-in live checks skipped; no failures |
| Workers/D1 integration | Actual Miniflare runtime; startup, schema, snapshots, cancellation persistence, ETag cache roundtrip and lease fencing verified |
| Type generation and TypeScript | Passed; generated Cloudflare bindings used |
| Worker dry run | Passed; final staging upload 226.68 KiB raw / 60.42 KiB gzip |
| Browser fixtures | 12 tests passed: desktop and mobile Chromium, both UI languages, filters/place search, injected-text safety, offline reload, denied storage/notifications, 501-item pagination and phone guide |
| Automated accessibility | No violations for the exercised WCAG 2 A/AA and 2.1 AA axe tags in English/Marathi views; does not establish full manual WCAG conformance |
| Dependency audit | Zero reported vulnerabilities in both production-only and full audits on successful network runs |
| Whitespace | `git diff --check` passed |

Browser tooling: the full Chromium browser downloaded successfully. The optional headless-shell download timed out; tests use the supported `channel: chromium` setting and the documented `--no-shell` installation path.

## Reproduced and fixed behaviours

- Strict TLS, approved HTTPS paths and redirects, finite deadlines and response bytes.
- CAP language identity preserved; Hindi is not labelled Marathi.
- CAP status/scope, source-qualified identities, expiry and future dates enforced.
- Updates/cancellations match the original issuer, identifier and sent time; replay does not revive retired warnings.
- Earthquake observations do not become synthetic tsunami warnings; pollutant concentration is not mislabelled AQI.
- Rescue/missing-child keywords do not establish AMBER authority; emergency keywords do not grant national-alert status.
- Raw source text cannot create executable alert markup or map popups.
- Failed sources keep last-good data and expose bounded diagnostic codes.
- Complete pagination replaces the old 200-to-80 SSE truncation.
- Place search retains ambiguous choices; LGD lookup no longer aliases unrelated Census codes (67 mixed entries reduced to 36 declared LGD records).
- SACHET expired/cancelled CAP records retain their lifecycle while skipping irrelevant external historical geometry.
- SACHET CAP ETags/XML persist in D1; `304` reuses cached XML without an unconditional retry.

## Live source and staging evidence

Staging: https://maharashtra-sachet-staging.mangeshraut712.workers.dev

Verified staging version: `b2209293-0d6b-48e7-8f9c-7bdf688fef36`.

The first upload's scheduled-trigger update partially failed. A focused `wrangler triggers deploy --env staging` succeeded; later deployments reported the one-minute schedule normally. Successive generated timestamps proved ingestion, rather than relying only on deploy output.

Initial SACHET schema/timeout failures were reproduced. Historical polygon fetching was unnecessary for expired records. After the fix, a local live collection obtained 10 CAP records in 15.126 seconds. Staging then reported SACHET healthy with 10 retained records and zero active alerts; IMD and INCOIS were healthy with zero records. CWC and CPCB were explicitly disabled. This is not an all-clear statement.

A direct local INCOIS check failed strict TLS earlier; the Cloudflare runtime subsequently fetched it successfully. The implementation never disabled certificate verification.

Final staging browser runs passed on desktop and mobile. One intermediate run failed because the local computer lost internet connectivity: Chromium returned `ERR_INTERNET_DISCONNECTED` and npm DNS lookup failed. Read-only network checks subsequently succeeded, then the same live checks and audit passed.

## Performance evidence and limits

| Staging sample | Desktop LCP | Mobile LCP | CLS |
| --- | --- | --- | --- |
| First live run | 2.300 s | 1.468 s | 0 |
| Run after connection interruption | 5.352 s | 2.504 s | 0 |

These are single lab observations on the local connection, not field Core Web Vitals. The later sample had TTFB of 5.039 s desktop / 2.371 s mobile. No claim of uniformly sub-2.5-second loading or field INP is made. Worker startup was measured by Cloudflare at 11–15 ms across staging releases. The UI loads same-origin assets and no mandatory external map/font/script dependency. The first run transferred about 12.5 KB app JS, 2.2 KB UI model and 5.0 KB stylesheet according to browser Resource Timing (including response overhead).

## Production

Production: https://maharashtra-sachet.mangeshraut712.workers.dev

Verified version: `4f6d4f64-aa43-4d2f-9344-868ee202dc58`. Worker startup: 13 ms. Separate production schema migration and one-minute scheduled trigger succeeded.

The first production test correctly failed while the first scheduled ingestion was pending (`generatedAt: null`). No test was weakened and no fixture was inserted. Scheduled ingestion subsequently populated the database. Observed timestamps advanced from `2026-09-05T09:10:41.945Z` to `2026-09-05T09:11:41.990Z`; the captured scheduled run completed with no exceptions in 5.627 seconds wall time / 52 ms CPU.

Final production checks: desktop and mobile browser tests both passed; `/api/health` returned HTTP 200 with `status: healthy`; SACHET retained 10 records, all expired, and the active feed contained zero alerts. IMD and INCOIS were healthy with zero records; CWC and CPCB were explicitly disabled. Filters, all 36 district entries, twelve service categories, ambiguity handling, English/Marathi accessibility, headers and invalid-method/query handling passed.

Final production lab sample: desktop LCP 2.260 s / TTFB 2.108 s; mobile LCP 1.220 s / TTFB 1.058 s; CLS 0 on both. The first initialization-era sample had desktop LCP 5.152 s and mobile LCP 1.956 s. These observations do not prove a universal performance or delivery guarantee.

Eight of nine unique official service landing URLs returned HTTP 200 in a bounded local GET check. CPCB's AQI page did not respond within the limit; it remains an official directory link with no enabled live adapter.

## Remaining scope and unverified capabilities

- Complete village, ward and municipal boundary coverage requires an official versioned dataset and validation. Current results are district aliases.
- Several non-weather service areas are official directories, not complete live incident adapters.
- No cell-broadcast authority, SMS/WhatsApp dispatch, background Web Push, native app or guaranteed delivery.
- No full CAP conformance certification, independent Marathi linguistic review, physical-phone testing, Safari/Firefox coverage or manual screen-reader audit was performed.
- D1 lifecycle retention is bounded; the 900,000-byte per-source budget fails closed and needs a future safe archive/compaction policy.
- Live feeds can be late, empty or unavailable; polling is not instantaneous emergency delivery.
- CI workflow is written and locally exercised through its main commands; no remote GitHub Actions execution is claimed.
- Event submission endpoint, deadline and pre-existing-project rules remain unverified; no final submission sent.

## Public-service design refresh addendum

The frontend was restyled after inspecting official Maharashtra SDMA, Public Health and Urban Development sites. The bilingual masthead, navigation band, amber notices and service panels use those public-service layout conventions. Original project identity and independent-site disclosure remain; no government seal, portraits or government ownership claims were copied. See `DESIGN-2026-09-05.md`.

Local checks: 72 deterministic tests passed with three live checks explicitly skipped; TypeScript and Worker build passed; 14 browser tests passed. The added browser test covers both languages at 320, 768 and 1440 CSS pixels, visible independent identity and the five navigation links. After updating the offline-shell cache to v4, its three tests and both offline-reload browser checks passed again. Desktop/mobile screenshots were visually reviewed.

Staging version `045774dc-2a38-4826-96f3-da8bb721b0b7` passed both live browser tests. Production version `d7257b42-b107-4d14-823b-789b2f47b407` deployed successfully and passed both live desktop/mobile checks, including axe accessibility checks in English/Marathi, filters and API validation. Enabled sources were healthy at `2026-09-05T09:23:42.011Z`; CWC and CPCB remained explicitly disabled. No collector or alert semantics changed in this design pass.

Production lab sample: desktop LCP 2.364 s, mobile LCP 2.080 s, CLS 0 on both; Worker startup 21 ms. These are observed samples, not field Core Web Vitals or guaranteed loading times. No new external rendering dependency was added.
