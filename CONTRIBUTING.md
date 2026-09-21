# Contributing

Thank you for helping improve this **independent civic CAP relay**. It is MIT-licensed software that republishes **public** official feeds. It is **not** a government website, not NDMA/SDMA, and not an emergency dispatch service.

**In immediate danger call 112.** Zero relayed alerts does not mean an area is safe. Official CAP (and the issuing agency) remains the sole authority for alert content, lifecycle, and instructions.

## What not to claim

Do **not** in issues, PRs, forks, screenshots, or marketing:

- Present the project, a fork, or a Worker URL as official government, NDMA, SDMA, IMD, INCOIS, CWC, or CPCB.
- Imply origination of **cell broadcast**, India’s C-DOT CBS, US Wireless Emergency Alerts, or IPAWS.
- Treat a healthy empty feed, a missing village, or a source outage as an all-clear.
- Invent LGD/Census codes, village/ward completeness, or impact in a neighbouring state from distance or magnitude.
- Relabel CPCB pollutant concentrations as calculated AQI, or promote earthquake observations into tsunami warnings.
- Add reconnaissance, port scanning, or other offensive tooling to this repository.

Keep banners, `/api/meta.disclaimer`, and “unofficial” API fields honest.

## Setup

Node.js 24 LTS (see `.node-version`) and npm:

```sh
npm ci
npm start
# http://127.0.0.1:8787  live public sources (unofficial local relay)

npm run demo
# http://127.0.0.1:8799  labelled fixture alerts for demos; never production
```

Do not seed production D1 with demo fixtures.

## Tests and checks

```sh
npm test                 # offline tests; live network checks skipped
npm run typecheck
npm run types            # regenerate worker-configuration.d.ts via wrangler
git diff --exit-code -- worker-configuration.d.ts
npm run build            # wrangler dry-run
npm run test:e2e         # after: npx playwright install --no-shell chromium
npm audit
```

CI (`.github/workflows/verify.yml`) runs the same gate on pull requests. Optional live proof of two advancing production generations: `npm run verify:realtime` (read-only). Deploy, secrets, and rollback: [docs/OPERATIONS.md](docs/OPERATIONS.md).

## Pull request norms

- One concern per PR when practical (docs, collector, UI, ops).
- Add or extend tests in `test/` for behaviour changes; keep live fetches behind `RUN_LIVE_TESTS=1`.
- Preserve CAP identity (`source` + identifier), issuer-matched Update/Cancel, expiry, and last-good snapshots on collector failure.
- Public HTTP remains **GET/HEAD only**. New mutation, push, or report APIs need auth, abuse controls, and a privacy review.
- Collectors must use bounded sizes/deadlines, approved hosts, schema checks, and allowlisted error codes (never log bodies or credentialed URLs).
- Feature flags that add non-CAP layers (for example situational overlays or ops shadow pipelines) stay **off by default** in `wrangler.jsonc` for staging and production.
- Do not enable Jev/situational layers by default. Do not add Osiris-style recon.
- Keep UI copy bilingual (English/Marathi) for user-visible chrome when you change strings in this Maharashtra tree; forks may swap languages—see [docs/FORKING.md](docs/FORKING.md).
- Describe user-visible risk in the PR template (authority, coverage, freshness).

## Issues

Use the templates under `.github/ISSUE_TEMPLATE`:

- **Bug** — product/API/UI defects.
- **Source health** — feed outages, schema drift, false empty “all clear” presentation.
- **Docs** — CONTRIBUTING, architecture, forking, README accuracy.

Questions and fork coordination can go to [GitHub Discussions](https://github.com/mangeshraut712/maharashtra-sachet/discussions) when that forum is enabled; do not file “make this official” requests.

## Security

Report vulnerabilities privately as described in [SECURITY.md](SECURITY.md). Do not post credentials, private upstream records, or exploit payloads against the public Worker.

## License

Contributions are accepted under the [MIT License](LICENSE). Government feed text remains attributed to its issuer.
