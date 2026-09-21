# Maharashtra Civic Alerts

Independent English/Marathi hub for official Maharashtra public alerts, district search and service directories.

**This is not a government website or an emergency dispatch service.** In immediate danger call **112**. Zero relayed alerts does not mean an area is safe.

**Use it live:** [maharashtra-sachet.mangeshraut712.workers.dev](https://maharashtra-sachet.mangeshraut712.workers.dev)

**Event pitch:** [live slides](https://maharashtra-sachet.mangeshraut712.workers.dev/pitch.html) · [PPTX](https://maharashtra-sachet.mangeshraut712.workers.dev/pitch.pptx) · [submission notes](docs/history/SUBMISSION.md)

![Production homepage, 5 Sept 2026](docs/screenshots/desktop-home.png)

## How to use (in short)

1. Open the site. Read the independent-project banner and **Latest status**.
2. Search a place (Pune, Sawantwadi, Navi Mumbai) or pick a district. Place names map to a **district**, not a verified village/ward boundary.
3. If two districts appear (Navi Mumbai → Raigad and Thane), choose the one that matches your area.
4. Read **Source health** before treating an empty bulletin as “all clear”.
5. Use **Citizen services** for official portals. Directory links are not live incident feeds.
6. Switch to **मराठी** when needed. Optional notifications only work while the page is open.

Full walkthrough and current live numbers: [How to use](docs/HOW-TO.md) · [Current snapshot](docs/STATUS.md)

## Current live snapshot

Verified **6 Sept 2026, 00:59 IST** against production version `6645d3eb-b2e0-4070-bc55-81c18fc5f2af`. The one-minute scheduler advanced the healthy generation from `2026-09-05T19:27:58.576Z` to `2026-09-05T19:28:58.319Z`. Feeds and health can change after this snapshot.

| Check | Result |
| --- | --- |
| Production health | HTTP 200, `status: healthy`, generation advanced within 60 seconds |
| Active alerts | **0** (expired CAP records are excluded) |
| SACHET | Healthy, **10** retained source records; none currently active |
| IMD / INCOIS | Healthy checks, **0** current source records |
| CWC / CPCB | Explicitly **disabled** (not connected) |
| Districts | All **36** listed; none had a live alert in this snapshot |
| Place search | Navi Mumbai → Raigad + Thane; Sawantwadi → Sindhudurg; Marunji → Pune, all labelled district aliases |

Staging version `d4af16ea-0bdc-41c4-bb52-35f416ce58d1` also passed desktop/mobile deployment tests and advanced from `19:29:58.101Z` to `19:30:58.545Z`. See the [dated verification report](docs/REALTIME-DEMO-VERIFICATION-2026-09-06.md).

## Run locally

Node.js 24 LTS (see `.node-version`) and npm:

```sh
npm ci
npm start
# http://127.0.0.1:8787  live public sources

npm run demo
# http://127.0.0.1:8799  labelled fixture alerts for demos; never production
```

```sh
npm test                 # offline tests; live network checks skipped
npm run typecheck
npm run test:e2e         # after: npx playwright install --no-shell chromium
npm run verify:realtime  # read-only proof of two advancing production generations
```

Deploy, rollback and secrets: [operations](docs/OPERATIONS.md). API: [docs/API.md](docs/API.md). All docs: [docs/README.md](docs/README.md).

## Open source / Fork this

This is an **MIT** civic CAP relay meant to be forked, and it is **not a government website**. Another Indian state or region can reuse the pipeline by replacing district/LGD tables, feed adapters, and branding—while keeping the same safety rules: unofficial relay, **CAP is the sole authority**, call **112**, no cell-broadcast / WEA / IPAWS origination.

**Live demo:** [maharashtra-sachet.mangeshraut712.workers.dev](https://maharashtra-sachet.mangeshraut712.workers.dev) (independent Worker; not `.gov.in`)

| Guide | What it covers |
| --- | --- |
| [CONTRIBUTING.md](CONTRIBUTING.md) | Setup, tests, PR norms, what not to claim |
| [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) | Sources → collectors → merge/lifecycle → D1 → public GET API → web (poll + MapLibre) |
| [docs/FORKING.md](docs/FORKING.md) | Districts/LGD, adapters, Workers/D1, feature flags |

Issues: bug vs source-health vs docs templates under `.github/ISSUE_TEMPLATE`. Optional layers and ops shadow pipelines stay **off by default** if present.

## What this project does not do

- Originate government alerts, cell broadcasts or US Wireless Emergency Alerts.
- Guarantee complete village, ward or municipal coverage.
- Connect statewide live power, water, traffic or AQI feeds (those are official directories unless a source is enabled).
- Deliver background Web Push after you close the tab.

The software is MIT licensed. Government content stays attributed to its source.
