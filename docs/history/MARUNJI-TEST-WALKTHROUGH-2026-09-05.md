# Marunji: live check and good/bad scenario walkthrough

Tested 2026-09-05 against local commit `246837a` and the production site. This is a test report, not a safety assessment of the area. No GPS location was requested and no fabricated incident was published.

## Main finding

Marunji is listed under Mulshi in the [PMRDA village list](https://www.pmrda.gov.in/wp-content/uploads/2026/02/Mulshi-Taluka.pdf), row 67, page 2. [Pune district's tahsil directory](https://pune.gov.in/en/tahsils/) lists Mulshi. This establishes the administrative context Marunji → Mulshi → Pune for the test.

The deployed app does not currently contain the Marunji place alias. Both `/api/locations?q=Marunji` and the browser search returned no match. This is a locality-coverage gap; it is not proof that no incidents exist there.

Manually selecting Pune works. The browser was left with Pune selected as the broad district fallback. This does not establish exact Marunji boundaries, ward coverage or which district-wide alerts apply to a particular address.

## Live checks

| Input/check | Observed result | Interpretation |
| --- | --- | --- |
| Search Marunji | HTTP 200, `locations: []`; UI says no verified place match | Coverage gap: valid locality missing from search hints |
| Search Pune | HTTP 200, Pune district match | Supported positive lookup |
| Select Pune in browser | District and bulletin scope become Pune | District fallback works |
| Pune active alerts | HTTP 200, count 0 | No matching active messages in the current relay snapshot, not an all clear |
| Source health | HTTP 200, enabled sources healthy | Fetching/processing succeeded; does not mean every incident is known |
| Invalid district `made-up` | HTTP 400, Invalid district | Bad input correctly rejected |
| One-character search `x` | HTTP 400, minimum-length explanation | Bad input correctly rejected |
| Search Navi Mumbai | Both Raigad and Thane returned | Geographic ambiguity preserved |
| Search Panaji | HTTP 200, no Maharashtra match | Neighboring-state place not assigned to a Maharashtra district |

The recorded API snapshot was `2026-09-05T10:04:41.994Z` (15:34:41 IST). SACHET retained 10 source records, while the active alert count was zero. IMD and INCOIS were healthy with zero records. CWC and CPCB were disabled. These are point-in-time observations and will change with later ingestion.

## Controlled examples: not real incidents

The following records were supplied directly to local functions and tests. They were not inserted into production or delivered as notifications.

| Scenario | Actual result | What it proves |
| --- | --- | --- |
| Valid active Actual/Public district alert | 1 visible alert | The basic display-eligibility path works |
| Alert whose expiry is past | 0 visible alerts | Expired messages leave the active feed |
| Official Test message | 0 visible active alerts | Exercises are not presented as real emergencies |
| Private-scope message | 0 visible alerts | Private messages are excluded from the public active feed |
| Matching issuer cancels an alert | 0 visible alerts | Lifecycle cancellation works |
| Different issuer attempts cancellation | Original alert remains visible | An unrelated sender cannot retire another issuer's message |
| Explicit Severe/Immediate chemical alert | IMMINENT_THREAT presentation | Serious official attributes are prioritized; this is a UI classification |
| Source throws a timeout | Previous alert remains, source becomes degraded, prior success timestamp retained | Outage does not silently erase last-good data or become an all clear |

## Browser and automated verification

`npm test`: 75 tests total, 72 passed, 3 live-source tests explicitly skipped, zero failures. These cover CAP parsing/languages/lifecycle, source transport bounds, geography, ETags, API validation, source outages and actual local Workers/D1 integration.

`npm run test:e2e`: 14 passed across desktop and mobile Chromium. Covered English/Marathi, 320/768/1440-pixel layouts, accessibility checks, filters, place search, untrusted text rendered safely, offline snapshots, denied storage/notification permission, complete 501-item pagination and the phone-readiness guide.

Passing software tests do not prove exhaustive location data. The existing suite tests its supported places; this Marunji investigation found an unrepresented place outside that set. Nor do tests certify actual notification delivery, emergency-response times or real-world safety.

## How the product works

1. A Cloudflare schedule reads supported official feeds.
2. Fetch boundaries check HTTPS, approved hosts, size and deadlines; SACHET reuses XML through ETags.
3. Parsing preserves issuing source, content, language, time, geography and lifecycle references.
4. D1 stores source snapshots and retirement records. Failed refreshes retain the last valid data.
5. Eligibility checks remove expired, future, cancelled, private and non-Actual records from the default active feed.
6. The frontend filters eligible records by the selected district, region and situation, and shows source freshness.
7. Where no live civic feed is integrated, official service-directory links provide a route to the relevant authority.

For Marunji, step 6 currently requires selecting Pune manually because the lookup dictionary lacks the alias. Nothing in this flow independently observes every road, fire, electricity outage or health incident in Marunji.

## Interpreting good, bad and unknown

- A green test result means the code behaved as expected in that test.
- A healthy source means a retrieval/parse succeeded within the freshness threshold.
- An urgent alert describes the issuing source's warning attributes.
- A degraded/disabled source means information is unavailable or incomplete.
- No active alert and an unknown place are not green safety assessments.

## Follow-up (same day)

`marunji` was added as a Pune `places` alias with a regression test. Precision remains `district-alias`. Production still returned no Marunji match until a Worker deploy. A complete locality solution still needs a versioned official village/local-body directory and verified boundaries.
