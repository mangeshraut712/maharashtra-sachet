# WEA/IPAWS lessons for Maharashtra

Research checked 2026-09-05. This document guides the Maharashtra-first product; it does not certify WEA compliance or grant alert-origination authority.

## Corrections to the initial comparison

1. **WEA is a delivery channel within IPAWS.** CAP represents alert content and lifecycle; mobile cell broadcast, radio/television distribution and an internet dashboard are different delivery paths.
2. **National Alerts is the current US term.** The FCC replaced Presidential Alerts with National Alerts; the class includes authorized national messages and cannot be opted out of. The app must not assign national authority from keywords. [FCC 2021 compliance guide](https://docs.fcc.gov/public/attachments/DA-21-1249A1.pdf)
3. **Public Safety Messages are not every civic update.** FCC guidance describes emergency-related protective advisories, and discusses alert fatigue. Routine electricity notices or local administration updates should not inherit a national emergency tone merely because they share a dashboard. [FCC 25-14](https://docs.fcc.gov/public/attachments/FCC-25-14A1_Rcd.pdf)
4. **Congestion resilience is not independence from infrastructure.** A cell-broadcast receiver still needs a functioning compatible device and supported network coverage. The website and its browser notifications require internet connectivity; cached content is old information, not continued live reception.
5. **AMBER is an authorized child-abduction program, not a keyword classifier for every missing person or rescue.** This release uses ordinary attributed public-safety categories for such content and does not automatically declare AMBER alerts.

The Ready.gov and main FEMA/FCC consumer pages returned HTTP 403 during retrieval. FCC's official document host was accessible. Availability details must be checked against current carrier/manufacturer guidance; no testing of an actual handset broadcast took place.

## India already has the underlying government system

The Ministry of Communications announced the launch of India's indigenous C-DOT Cell Broadcast System on **2 May 2026**, integrated with CAP-based SACHET. The announcement describes geographically targeted multilingual delivery through telecom networks and nationwide trials. This supersedes older descriptions treating Indian cell broadcast solely as an upcoming pilot. A public launch announcement does not provide a third-party app with sending credentials or prove delivery on every individual handset. [PIB release 2257499](https://www.pib.gov.in/PressReleasePage.aspx?PRID=2257499)

The Maharashtra app should therefore complement the NDMA/SDMA system, preserve its official messages and direct people to official channels. Government origination, carrier integration, national alert policy and broadcast trials require the relevant authorities' participation.

## SACHET consumer requirements

NDMA's guide requires consumers to retain CAP XML and its ETag, send `If-None-Match` on later requests, reuse cached XML on `304` without an immediate unconditional retry, and replace both XML and ETag on a changed `200` response. The release persists this cache alongside the source snapshot in D1; a failed collection preserves the previous complete generation. [NDMA integration guide](https://sachet.ndma.gov.in/docs/Integration_Guide_For_Agencies.pdf)

## Capability comparison

| Requirement | Maharashtra release | What remains |
| --- | --- | --- |
| No account/phone-number signup | Public read-only bulletin | No automatic receipt on every nearby phone |
| Multiple hazards | CAP plus twelve service categories | More verified notice adapters and agency cooperation |
| Local targeting | 36 districts, place aliases, original affected-area text and retained CAP geometry | Versioned LGD village/ward data, verified boundaries and precise user-side targeting |
| Alert lifecycle | Actual/Public filtering, timestamps, expiry, matching-issuer updates/cancellations | Broader CAP conformance tests for uncommon multi-info cases |
| Local languages | Marathi/English UI and preserved declared source languages | Independent language review and more official translations |
| Resilient reads | D1 last-good state, bounded requests, ETags and labelled offline snapshot | Independent failure-domain redundancy and tested recovery objectives |
| Phone attention signal | Optional foreground browser notifications | Government cell broadcast is a separate authorized channel; no WEA signal imitation |
| Background delivery | Not available in this release | Reviewed Web Push, subscriptions, expiry, retries, permission and platform tests |
| Official authority | Source attribution; project is explicitly unofficial | Government agreements and controlled integration if ever requested |
| National expansion | Architecture keeps collectors, storage and UI separate | State-specific datasets, issuers, languages and jurisdiction tests before adding each state |

## Phone readiness

Apple documents Government Alerts under Settings → Notifications and notes carrier/region support differences. Google documents Wireless emergency alerts settings; Android device manufacturers may arrange settings differently. The website cannot verify or change these settings. Do not call emergency services or trigger SOS to test the product. [Apple guide](https://support.apple.com/en-us/102516), [Google guide](https://support.google.com/android/answer/9319337?hl=en)

## Roadmap after the Maharashtra release

1. Obtain a dated, permitted official LGD export and boundary dataset; establish exact locality membership and ambiguous-place handling.
2. Validate additional non-weather public notices source by source. Record measured coverage for each district and category instead of inferring completeness from a menu.
3. Add provenance-preserving alert history and a bounded lifecycle tombstone archival policy.
4. Add opt-in background notifications only after independent expiry, cancellation, retry, quiet-hours and delivery-failure tests.
5. Seek NDMA/SDMA/DoT/C-DOT cooperation for any official dissemination integration; keep public reading isolated from authenticated origination.
6. Expand one state at a time with separate jurisdiction/language/source conformance checks. India-wide broadcast remains outside an independently deployed website's authority.
