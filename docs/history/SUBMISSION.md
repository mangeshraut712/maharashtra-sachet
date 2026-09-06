# Codex Build House Pune submission

Status: submitted on 6 Sept 2026 via https://forms.gle/FvRnxoUA7S8DBaFeA. Final verification before cutoff: live hub, briefing pitch, PPTX, place search and deployed Playwright all passed. Production health can be stale when SACHET returns `http_error`; that is reported honestly.

| Field | Value |
| --- | --- |
| Builder | Mangesh Raut |
| Team | Maharashtra Civic Alerts |
| Email | mbr63drexel@gmail.com |
| GitHub | https://github.com/mangeshraut712/maharashtra-sachet |
| Live demo | https://maharashtra-sachet.mangeshraut712.workers.dev |
| HTML pitch | https://maharashtra-sachet.mangeshraut712.workers.dev/pitch.html |
| PPTX | https://maharashtra-sachet.mangeshraut712.workers.dev/pitch.pptx |
| Written notes | this file |

The organizer form's "Phone No" field is typed as an email input, so the submitted phone row used the Gmail address. The real India number is in the solution text and on the last PPTX slide: +91 7276819090.

Vercel is not used. The hosted project is the existing Cloudflare Worker + D1 deployment.

## Project

**Maharashtra Civic Alerts** — a bilingual place-aware public information hub for residents who need to know what an official warning says, where it applies, how fresh it is and which agency to consult.

## The problem

Residents navigate separate national, state, municipal and utility information sources. Weather-only dashboards miss civic disruptions; an empty map can look reassuring even when a source is offline. Place names and district boundaries can also be ambiguous.

## What we built

An independent English/Marathi hub combining CAP lifecycle handling, official-source freshness, district and place-alias search, twelve service categories, safe rendering, offline snapshots and Cloudflare persistence. The UI states coverage gaps and routes residents to official service websites. It keeps original warning text and labels language fallback.

## Codex contribution during this event work

Codex inspected the existing relay, researched official sources and US IPAWS design concepts, identified unsafe and misleading behaviours, added regression coverage, implemented source/runtime/UI changes in parallel, integrated and tested the result, and prepared documentation and deployment checks.

This repository predates the event-day changes. Prior commits and the September 4 design documents are preserved. Do not describe the whole repository as created from scratch during the event.

## Demonstration sequence

1. Open the production site and explain the independent-project banner.
2. Open `/pitch.html` if judges want the short slide walkthrough.
3. Show source health before interpreting the active-alert count.
4. Search Sawantwadi or Chandgad; explain the district-level precision disclosure.
5. Search Navi Mumbai and show the separate district candidates.
6. Switch to Marathi; demonstrate filters and coverage across 36 districts.
7. Open service coverage details for power, water, public health or transport and explain which are directory-only.
8. Use `npm run demo` for a labelled demonstration of Marathi alert content if live feeds are empty. Never inject fixtures into the production feed.

## Honest limits

No complete village/ward directory, government affiliation, cell broadcast, dispatch, guaranteed delivery or complete incident awareness. Background Web Push is not implemented. Some public sources are unavailable or disabled; non-weather official directories are useful discovery tools, not universal real-time incident feeds. The project does not use generative AI to issue or rewrite emergency instructions.

## Next milestones

Versioned LGD and boundary imports, reviewed additional public notice adapters, agency partnerships, independent Marathi content review, broader browser/device testing and opt-in background notifications after their own reliability/privacy verification.
