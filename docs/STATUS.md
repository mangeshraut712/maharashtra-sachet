# Current production snapshot — 5 Sept 2026

Checked against https://maharashtra-sachet.mangeshraut712.workers.dev at **16:39 IST**. The refreshed screenshots show the last-known generation `2026-09-05T10:33:41.986Z` (16:03:41 IST) and a **stale** source state. The bulletin still had **0 active alerts** and SACHET retained **10** records. This is not an all-clear: stale means no successful generation arrived within the five-minute freshness window even though ingestion is scheduled about once per minute.

Screenshots in [screenshots/](screenshots/) were taken from that live site in the same session.

## Production

| Surface | Observed |
| --- | --- |
| Homepage | Independent banner, 36-district panel, bilingual masthead, five nav links |
| Latest status | Partial coverage (CWC and CPCB not connected) |
| Public bulletin | **0 alerts** — empty list is labelled incomplete, not all-clear |
| `/api/health` | HTTP 503, `status: stale`, `environment: production` |
| `/api/alerts` | `count: 0`, pagination total 0 |
| `/api/coverage` | `totalDistricts: 36`, `liveCovered: 0` |
| SACHET | `stale`, 10 last-known retained records, last success 5 Sept 2026, 4:03 pm IST |
| IMD | `stale`, 0 last-known records |
| INCOIS | `stale`, 0 last-known records |
| CWC FloodWatch | `disabled` — use the official directory link |
| CPCB AQI | `disabled` — use the official directory link |

Place search on production at capture time:

| Query | HTTP | Result |
| --- | --- | --- |
| `Pune` | 200 | Pune district (+ `khed pune` alias) |
| `Navi Mumbai` | 200 | Raigad and Thane (`precision: district-alias`) |
| `Sawantwadi` | 200 | Sindhudurg |
| `Marunji` | 200 | **empty** on production; alias is now in git for Pune (Mulshi context) pending deploy |
| `Panaji` | (prior check) | no Maharashtra district match |

## Staging

https://maharashtra-sachet-staging.mangeshraut712.workers.dev returned `status: stale` with the same source pattern (SACHET 10 records, CWC/CPCB disabled) and `generatedAt: 2026-09-05T10:23:59.254Z`. Do not demo staging as a fresh bulletin.

## Screenshots

| File | What it shows |
| --- | --- |
| [desktop-home.png](screenshots/desktop-home.png) | English homepage, 0 alerts, partial coverage |
| [desktop-search-navi-mumbai.png](screenshots/desktop-search-navi-mumbai.png) | Ambiguous place search chips |
| [desktop-source-health.png](screenshots/desktop-source-health.png) | Bulletin empty state + source panel |
| [desktop-marathi.png](screenshots/desktop-marathi.png) | Marathi UI |
| [mobile-phone-guide.png](screenshots/mobile-phone-guide.png) | Phone / WEA readiness page at a mobile viewport |
| [mobile-home.png](screenshots/mobile-home.png) | Narrow viewport |

## What changed in the repo with this snapshot

- Docs reorganized: everyday guides stay at `docs/`; dated plans and old verification live in `docs/history/`.
- `marunji` added as a Pune place alias (district-level hint only). Production will keep returning no Marunji match until the Worker is redeployed.
- Screenshot capture script: `npm run docs:screenshots`.

Earlier measured deploy IDs, Lighthouse-style lab samples and the 72-test verification table remain in [history/VERIFICATION-2026-09-05.md](history/VERIFICATION-2026-09-05.md).
