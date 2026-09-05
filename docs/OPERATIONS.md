# Operations and deployment

Use Node 24 and the checked-in lockfile. Cloudflare is the release target. Staging and production use separate Workers and D1 databases; do not bind production data to local test environments.

## Local checks

```sh
npm ci
npm run types
npm run typecheck
npm test
npm run build
npx playwright install --no-shell chromium
npm run test:e2e
npm audit
```

Browser tests select Chromium's full browser channel; the separate headless-shell download is unnecessary. Mobile checks emulate a phone viewport in Chromium, not a physical device or Safari.

## Staging

```sh
npx wrangler whoami
npx wrangler d1 migrations apply maharashtra-sachet-staging-db --env staging --remote
npm run deploy:staging
LIVE_URL=https://maharashtra-sachet-staging.mangeshraut712.workers.dev npm run test:e2e
```

Verify the intended account before a deployment. Configured database IDs identify this deployment; forks should create their own databases and replace the IDs.

## Production

```sh
npx wrangler d1 migrations apply maharashtra-sachet-db --env production --remote
npm run deploy:production
LIVE_URL=https://maharashtra-sachet.mangeshraut712.workers.dev npm run test:e2e
```

Do not seed production with browser-test fixtures. Scheduled ingestion runs every minute with bounded collectors. Confirm successive `generatedAt` timestamps, not just a successful asset upload. If the deploy command reports a partial trigger update, inspect current state and use `npx wrangler triggers deploy --env staging` (or production) to reconcile it; report any remaining failure.

## Monitoring

Use `/api/health`, `/api/sources` and Wrangler logs. Health `503` can indicate data-source degradation while the application is serving correctly. Examine each source's `lastSuccessAt`, `lastAttemptAt`, `errorCode` and status. A source timeout is not proof of zero hazards.

Logs include only outcome/source/error category. Never log response bodies, cookies, keys or complete error URLs. Source-specific outages preserve previous records. CWC direct ingestion is intentionally disabled pending an established schema; CPCB is disabled by default.

## Capacity and lifecycle

Per-source raw snapshots are bounded to 900,000 bytes. Cancel/Update records are retained to prevent resurrecting alerts if a later feed omits the retirement message. If retained data reaches the limit, the source fails closed and requires an operator to design a safe archival/tombstone-compaction migration. Do not simply drop cancellation records or clear D1 to make health green.

D1 uses a token-owned 120-second ingestion lease. Atomic writes require a live matching token. A stale writer cannot overwrite a newer run. Collectors also have response byte limits and deadlines; SACHET has a total request budget.

## Optional credentials

CPCB is an observation integration, not AQI calculation. If enabled after review, set `DATA_GOV_IN_API_KEY` using `wrangler secret put` for the correct environment and change `CPCB_ENABLED` intentionally. Never put the key in `wrangler.jsonc`, git, an issue or a CLI argument. No OpenAI API key or Supabase credential is required by the release runtime.

## Rollback

Run `npx wrangler versions list --env production` and `npx wrangler deployments list --env production` to identify the previously verified version. Inspect `npx wrangler rollback --help`, then roll back to that explicit version when authorized. A Worker rollback does not revert a D1 migration. The first deployment has no previous production version; never invent a rollback ID or delete the database as a rollback substitute.

Preserve a version-compatible schema and use additive migrations. Record the deployed version IDs and outcomes in the dated verification report.
