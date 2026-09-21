# Current production snapshot — 6 Sept 2026

Checked against https://maharashtra-sachet.mangeshraut712.workers.dev at **00:59 IST**. Production version `6645d3eb-b2e0-4070-bc55-81c18fc5f2af` returned HTTP 200 with `status: healthy`. The read-only observer saw the stored generation advance from `2026-09-05T19:27:58.576Z` to `2026-09-05T19:28:58.319Z` in one scheduler cycle.

The bulletin had **0 active alerts** while SACHET retained **10 source records**. This is not an all-clear: only active public Actual records appear, source coverage is incomplete, and local incidents may not have a consumable public feed.

Screenshots in [screenshots/](screenshots/) were refreshed from production after this deployment.

## Production

| Surface | Observed |
| --- | --- |
| Homepage | Independent banner, 36-district panel, bilingual masthead, five nav links |
| Latest status | Partial coverage because CWC and CPCB are not connected |
| Public bulletin | **0 active alerts** — empty state explicitly says it is not an all-clear |
| `/api/health` | HTTP 200, `status: healthy`, `environment: production` |
| `/api/alerts` | `count: 0`, pagination total 0 |
| `/api/coverage` | `totalDistricts: 36`, `liveCovered: 0` |
| SACHET | `healthy`, 10 retained records, 0 currently active alerts |
| IMD | `healthy`, 0 current records |
| INCOIS | `healthy`, 0 current records |
| CWC FloodWatch | `disabled` — use the official directory link |
| CPCB AQI | `disabled` — use the official directory link |
| Demo controls | Hidden; `POST /__demo/advance` returns 405 |

Place search on production:

| Query | HTTP | Result |
| --- | --- | --- |
| `Pune` | 200 | Pune district aliases |
| `Navi Mumbai` | 200 | Raigad and Thane (`precision: district-alias`) |
| `Sawantwadi` | 200 | Sindhudurg |
| `Marunji` | 200 | Pune (`precision: district-alias`) |
| `Panaji` | 200 | No Maharashtra district match |

## Feature flags (upgrade sequence)

| Flag | Default (prod/staging) | Purpose |
| --- | --- | --- |
| `SITUATIONAL_LAYERS_ENABLED` | `false` | USGS/FIRMS map layers via `/api/situational` — not official alerts |
| `JEV_SHADOW_ENABLED` | `false` | Shadow Jev triage logs at `/api/jev/shadow` — ops only, no bulletin mutation |
| `JEV_SHADOW_KILL` | unset | Emergency halt for shadow triage when `true` |
| `FIRMS_MAP_KEY` | unset | NASA FIRMS when situational layers are enabled |
| `JEV_API_KEY` / `cursor` / `JEV_USE_LIVE` | unset / unset / `false` | Optional live TypeSafe System One (`POST /v1/systemone`, model `jev-latest`). Key is `JEV_API_KEY` or the `cursor` secret. CI stays on mock fixtures. |

## Staging

Version `d4af16ea-0bdc-41c4-bb52-35f416ce58d1` passed the same desktop/mobile deployed suite. Its observer saw healthy generations advance from `2026-09-05T19:29:58.101Z` to `2026-09-05T19:30:58.545Z`.

## Screenshots

| File | What it shows |
| --- | --- |
| [desktop-home.png](screenshots/desktop-home.png) | Current English production homepage |
| [desktop-search-navi-mumbai.png](screenshots/desktop-search-navi-mumbai.png) | Ambiguous place search chips |
| [desktop-source-health.png](screenshots/desktop-source-health.png) | Current bulletin and source panel |
| [desktop-marathi.png](screenshots/desktop-marathi.png) | Marathi interface |
| [mobile-phone-guide.png](screenshots/mobile-phone-guide.png) | Phone / WEA readiness page at a mobile viewport |
| [mobile-home.png](screenshots/mobile-home.png) | Narrow production viewport |

Full release evidence and limitations are in [REALTIME-DEMO-VERIFICATION-2026-09-06.md](REALTIME-DEMO-VERIFICATION-2026-09-06.md). Earlier measurements remain in [history/VERIFICATION-2026-09-05.md](history/VERIFICATION-2026-09-05.md).
