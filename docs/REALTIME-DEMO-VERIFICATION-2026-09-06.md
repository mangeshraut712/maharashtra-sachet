# Realtime recovery and lifecycle demo verification — 6 Sept 2026

This report records the evidence for bounded stale recovery, the local-only CAP lifecycle demonstration, and the deployed one-minute generation observer. It does not claim carrier cell broadcast, background Web Push, complete village coverage or complete civic-source coverage.

## Released versions

| Environment | Cloudflare version | Trigger | Result |
| --- | --- | --- | --- |
| Staging | `d4af16ea-0bdc-41c4-bb52-35f416ce58d1` | `* * * * *` | Healthy; deployed desktop/mobile suite passed; two generations advanced |
| Production | `6645d3eb-b2e0-4070-bc55-81c18fc5f2af` | `* * * * *` | Healthy; deployed desktop/mobile suite passed; two generations advanced |

The production upload was 227.90 KiB raw / 60.20 KiB gzip and reported 13 ms Worker startup. These are deployment outputs, not field performance guarantees.

## Verification matrix

| Check | Evidence | Result |
| --- | --- | --- |
| Offline tests | `npm test` | 79 total: 76 passed, 3 live-only skips, 0 failed |
| Worker recovery integration | stale production schedule, fresh suppression, non-production suppression, D1 persistence | Passed |
| Types | `npm run types`; `npm run typecheck` | Passed |
| Worker build | `npm run build` | Passed |
| Dependency audit | `npm audit` | 0 vulnerabilities |
| Local browser suite | `npm run test:e2e` | 16/16 passed across desktop and mobile |
| Staging browser suite | `LIVE_URL=...staging... npm run test:e2e` | 2/2 passed |
| Production browser suite | `LIVE_URL=...production... npm run test:e2e` | 2/2 passed |
| Patch hygiene | `git diff --check` | Passed |
| Live source diagnostic | `npm run test:live` | 18/19 passed; local INCOIS TLS trust failed closed |

The single local live-source failure was `UNABLE_TO_VERIFY_LEAF_SIGNATURE` for INCOIS. TLS validation was not disabled. Both deployed Cloudflare environments successfully checked INCOIS during this release, returning zero current records.

## Realtime generation proof

`npm run verify:realtime` is read-only. It fails on HTTP errors, missing/invalid/regressing timestamps, or no second generation within 90 seconds.

| Environment | First generation | Second generation | Result |
| --- | --- | --- | --- |
| Staging | `2026-09-05T19:29:58.101Z` | `2026-09-05T19:30:58.545Z` | Passed |
| Production | `2026-09-05T19:27:58.576Z` | `2026-09-05T19:28:58.319Z` | Passed |

Before the staging release, an API read encountered an old stale snapshot and scheduled recovery. The existing D1 lease became active, the background ingestion committed a fresh generation, and health returned to HTTP 200. Request recovery uses a 60-second attempt cooldown and the D1 lease; Cron remains the primary one-minute ingestion path.

## Local lifecycle demonstration

Run `npm run demo`, then open http://127.0.0.1:8799. The server binds only to loopback and labels all fixtures as demo data in English and Marathi.

The automated and manual flows verified:

1. Alert: Marunji/Pune water fixture plus a Sindhudurg road fixture.
2. Update: the revised water message supersedes the original.
3. Cancel: the water lifecycle disappears, leaving only the road fixture.
4. Reset: the initial two records return.
5. Hostile HTML-like source text renders literally and does not execute.
6. Marathi labels and fixture content render after reset.

Demo endpoints and fixture headlines are absent from the Worker bundle. Production hides the controls and returns HTTP 405 for `POST /__demo/advance`.

## Browser sample

The production Chromium smoke sample reported desktop LCP 976 ms, TTFB 594.9 ms and CLS 0; mobile LCP 752 ms, TTFB 433 ms and CLS 0. These are one-run lab observations from the deployed Playwright test, not Core Web Vitals field data or a service-level objective.

## Known limits

- Delivery is near-realtime polling: one-minute healthy/degraded refresh and 15-second stale/error rechecks. It is not FEMA IPAWS/WEA or a telecom cell broadcast.
- SACHET, IMD and INCOIS are enabled. CWC direct ingestion and CPCB AQI remain explicitly disabled.
- Marunji and other place names are district aliases. Exact gaon, ward, municipal and incident boundaries require an authoritative versioned dataset.
- Zero active alerts is not proof of safety. Always read source health and the issuing authority's affected-area text.
