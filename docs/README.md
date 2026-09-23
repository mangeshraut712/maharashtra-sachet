# Documentation map

Start here if you are choosing a file. Dated plans and old verification notes live under [history](history/README.md).

| Doc | Use it for |
| --- | --- |
| [Contributing](../CONTRIBUTING.md) | Setup, tests, PR norms, unofficial-status rules |
| [Pull request setup](pr-setup.md) | Shared Grok Bot and Cursor loop: open, Bugbot, babysit, ship |
| [Architecture](ARCHITECTURE.md) | Sources → collectors → merge → D1 → GET API → web poll / MapLibre |
| [Forking](FORKING.md) | Another Indian state or region: region pack, LGD, adapters, Workers, flags |
| [How to use](HOW-TO.md) | Resident / demo walkthrough with screenshots |
| [Event pitch](../web/pitch.html) | Codex Build House slides (live at `/pitch.html`) |
| [Current snapshot](STATUS.md) | Latest production numbers and screenshot results |
| [Realtime/demo verification](REALTIME-DEMO-VERIFICATION-2026-09-06.md) | Release IDs, test matrix, scheduler proof and known limits |
| [API](API.md) | Read-only JSON routes, pagination, source states |
| [Operations](OPERATIONS.md) | Local checks, staging/production deploy, rollback |
| [Coverage](COVERAGE.md) | District vs village precision, border policy |
| [Privacy](PRIVACY.md) | What the site stores and does not collect |
| [Source research](SOURCE_RESEARCH.md) | Provenance for SACHET, IMD, INCOIS, CWC, CPCB |
| [WEA / IPAWS research](WEA-IPAWS-RESEARCH.md) | Why this is not a cell-broadcast originator |
| [Security](../SECURITY.md) | Vulnerability reporting |

Refresh screenshots (needs Node 24 and Playwright Chromium):

```sh
LIVE_URL=https://maharashtra-sachet.mangeshraut712.workers.dev npm run docs:screenshots
```
