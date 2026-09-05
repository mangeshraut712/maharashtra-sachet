# Public API

All routes are read-only. `GET` and `HEAD` are supported; mutation methods return `405`. `/api/v1/...` aliases the corresponding `/api/...` route. Responses are JSON with explicit error status codes, security headers and `Cache-Control: no-store` to avoid masking changing alert expiry or source freshness.

| Route | Meaning |
| --- | --- |
| `/api/health` | `200` when enabled sources are healthy; `503` for uninitialized, degraded or stale source state. Includes environment, timestamp, source state and stats. A `503` does not by itself mean the website is down. |
| `/api/meta` | Districts, regions, categories, service directory, locality coverage, official links, helplines and delivery capabilities. |
| `/api/alerts` | Active public Actual CAP alerts and current supported nowcasts. Observations, expired/future alerts, cancelled and superseded records are excluded. |
| `/api/coverage` | Listed districts, current relayed counts, source health and locality/service coverage gaps. |
| `/api/sources` | Per-source health, last attempt/success, age and safe error code. |
| `/api/locations?q=Sawantwadi` | District-alias candidates; `q` has 2–80 characters; optional integer `limit` 1–20. |
| `/api/alerts/live` | `410` with polling guidance. This scoped release replaces legacy truncated streaming with complete paginated snapshots. |

Unknown routes return `404`. Unknown/duplicate query keys and invalid filter values return `400`. There is no public refresh, write, report or notification-subscription endpoint.

On production and staging, a read of a dynamic API route may schedule a background recovery when enabled-source data is uninitialized or stale. The response is never rewritten as fresh before that recovery commits, and the 60-second attempt cooldown plus D1 lease prevent request amplification. Clients should read the returned status and timestamp, then use the advertised 60-second healthy/degraded or 15-second stale/error polling interval.

## Alert pagination

`/api/alerts` accepts `district`, `region`, `class`, `kind`, `source`, `limit` (1–500, default 200), `offset` and `snapshot`. Discover allowed filter values from `/api/meta` and `/api/sources`.

The response contains `alerts`, `count`, `stats`, `sources`, `generatedAt`, `status`, `errors` and `pagination`. `count`/`pagination.total` report the filtered total; `alerts` contains the page. `stats` summarizes the state feed rather than the selected page.

Start at offset 0. If `pagination.nextOffset` is non-null, request that offset with the same filters and `pagination.snapshot`. If the generation or active-alert set changes, the server returns `409`; restart from offset 0. Do not merge generations or assume a truncated page represents the complete feed.

## Source states

`healthy` means the source contract was fetched and parsed; it may legitimately have zero records. `degraded` means the latest attempt failed. `stale` means the last successful data is older than the five-minute freshness threshold. `disabled` and `misconfigured` are not healthy empty feeds. `uninitialized` means no snapshot has been populated yet.

`count` on a source is its raw retained record count, which can include lifecycle records/observations; it is not necessarily the active public alert count. Error codes are allowlisted: `timeout`, `request_budget`, `invalid_cap`, `schema_invalid`, `http_error`, `tls_error`, `unavailable`. Raw upstream errors and URLs containing credentials are not exposed.

## Precision

Location results have `precision: "district-alias"`. Read `localityCoverage` before presenting them as exact locations. The API does not claim complete village, ward, municipal or incident coverage. An alert's official `areaDesc` remains essential context.
