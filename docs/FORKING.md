# Forking for another Indian state or region

This repository is a **Maharashtra-shaped** unofficial relay. A fork can serve another state or a smaller region if you replace jurisdiction data, feed adapters, and branding—and you **keep the safety contract**.

A fork is still **not** a government website. CAP from the issuer remains the sole authority. Call **112**. Do not originate cell broadcast, C-DOT CBS, WEA, or IPAWS.

## 1. Jurisdiction: districts and LGD

Replace `server/districts.mjs` (and coverage aliases in `server/coverage-catalog.mjs`):

- List **your** districts (or equivalent) with official [Local Government Directory](https://lgdirectory.gov.in/) **district** codes. Do not invent LGD or Census codes. Do not copy Maharashtra’s 36-district table and relabel it.
- Keep Census 2011 codes only if you have a documented mapping; they are not LGD codes.
- Place aliases are **district navigation hints**, not a village/ward registry. Import a dated LGD export (checksums, row counts, permitted use) before claiming sub-district search—see [COVERAGE.md](COVERAGE.md).
- Neighbouring states must not appear as your districts. Do not fabricate in-state impact from earthquake magnitude or a name across the border.
- Update `REGIONS` / revenue divisions, `HELPLINES` (keep **112**; replace SEOC/DEOC numbers with numbers published for **your** SDMA/SEOC), and `OFFICIAL_LINKS` (your SDMA, not Maharashtra SDMA).
- IMD title matching (`imdTitles`) must use names the IMD feed actually uses for **your** districts.

SACHET CAP often carries `geocode` with LGD district codes. `DISTRICT_BY_LGD` must match **your** codes or polygons will attach to the wrong place—or nowhere.

## 2. Feed adapters

`SOURCE_IDS` and `sourceCollectors()` in `server/service.mjs` define what is ingested.

| Source | Typical fork work |
| --- | --- |
| SACHET | Point at the **public CAP RSS for your state** (this tree uses `rss_maharashtra.xml` in `server/sachet.mjs`). Confirm NDMA session/ETag behaviour still applies. |
| IMD | Nowcast RSS is national; **filter** to your districts via `matchImdDistrictTitle`. Empty mapping means those items are dropped. |
| INCOIS | Geographic filters in `server/incois.mjs` are west-coast oriented. Coastal/inland forks must change the window **with tests**; never promote magnitude-only rows into tsunami watches. |
| CWC | Leave **disabled** until you verify a public schema. Do not parse HTML dashboards as CAP. |
| CPCB | Keep `CPCB_ENABLED=false` unless you have a reviewed data.gov.in contract. Concentrations are not AQI. |

New collectors: approved host/path, size and time bounds, schema tests, deterministic outage tests, allowlisted error codes. Do not log bodies or URLs that might contain keys.

Optional **situational** overlays (USGS, FIRMS, etc.) and **Jev** ops shadow pipelines, if present in a later merge, stay **feature-flagged off**. They are not CAP. Do not enable them by default in your Worker vars. Do not add recon/port-scan tooling.

## 3. Branding and copy

Search the tree for Maharashtra-specific chrome:

- `web/` HTML/JS strings, `web/manifest`, notification titles, pitch pages.
- README, `docs/HOW-TO.md`, `docs/STATUS.md`, screenshots.
- Worker names (`maharashtra-sachet` in `wrangler.jsonc` / `package.json`).
- LocalStorage keys such as `mh-sachet-snapshot`.

Every public surface must say the project is **independent / unofficial**. Link NDMA SACHET (or the official portal you relay) as the **authority**, not your Worker. Do not use the national emblem, SDMA logos, or “.gov.in” styling that implies government operation.

Languages: this tree is English + Marathi. Swap `mr` fields and UI `tx()` strings for the languages you actually support; do not leave Marathi labels on a non-Maharashtra product.

Demo mode (`npm run demo`) must remain **labelled fixtures**, never a production feed.

## 4. Workers and D1

Do **not** reuse this project’s D1 `database_id` values or production Worker name.

1. Create a Cloudflare account you control.
2. `npx wrangler d1 create <your-db-name>` for staging and production separately.
3. Put **your** database IDs in `wrangler.jsonc`. Apply `migrations/` with `wrangler d1 migrations apply`.
4. Rename Workers (`name` / `env.*.name`). Use your own `workers.dev` or custom domain.
5. Keep `CPCB_ENABLED` (and any layers/Jev flags) **false** until explicitly reviewed.
6. Put `DATA_GOV_IN_API_KEY` only via `wrangler secret put` if you enable CPCB.
7. Cron remains a one-minute ingest; confirm two advancing `generatedAt` values after deploy (`npm run verify:realtime` with `LIVE_URL` pointing at **your** Worker).

Rollback and monitoring: [OPERATIONS.md](OPERATIONS.md). A Worker rollback does not undo D1 migrations.

## 5. Feature flags

Current flags in this tree:

- `CPCB_ENABLED` — observation collector; default `"false"` in all Wrangler envs.
- `ENVIRONMENT` — `local` / `staging` / `production` (and demo via `DEMO=1` locally).

Treat any later `SITUATIONAL_LAYERS_ENABLED`, Jev shadow, or similar vars as **opt-in**. Forks should ship with them off. Public `/api/meta` should advertise capabilities honestly (`webPush: unavailable` unless you have built and reviewed that path).

## 6. Tests and CI

- Replace Maharashtra fixtures (Sawantwadi, Navi Mumbai/Raigad+Thane, Marunji/Pune, Goa exclusion) with **your** border and alias cases.
- Keep merge/lifecycle tests: issuer-matched cancel, expiry, fail-closed storage budget.
- Keep e2e checks that the banner is unofficial and that 112 is visible.
- Point `LIVE_URL` in docs/scripts at your deployment, not `maharashtra-sachet.mangeshraut712.workers.dev`.

## 7. Legal and ops hygiene

- MIT license: keep the license file; government content stays attributed.
- Do not scrape authenticated or personal records. Directory pages are not alert feeds ([SOURCE_RESEARCH.md](SOURCE_RESEARCH.md)).
- If a state agency asks you to stop republishing a feed, disable that collector and fail **closed** (visible unhealthy source), not silent empty success.
- Coordinate large forks in Discussions rather than claiming a national “official app”.
