# Codex Build House Pune submission draft

Status: draft prepared for the builder; no organizer form submitted. The public event page does not establish the submission endpoint, exact deadline time, rubric or pre-existing-project rules. Confirm these with organizer instructions before final submission.

Verified live demo: https://maharashtra-sachet.mangeshraut712.workers.dev

## Project

**Maharashtra Civic Alerts** — a bilingual place-aware public information hub for residents who need to know what an official warning says, where it applies, how fresh it is and which agency to consult.

## The problem

Residents navigate separate national, state, municipal and utility information sources. Weather-only dashboards miss civic disruptions; an empty map can look reassuring even when a source is offline. Place names and district boundaries can also be ambiguous.

## What we built

An independent English/Marathi hub combining CAP lifecycle handling, official-source freshness, district and place-alias search, twelve service categories, safe rendering, offline snapshots and Cloudflare persistence. The UI states coverage gaps and routes residents to official service websites. It keeps original warning text and labels language fallback.

## Codex contribution during this event work

Codex inspected the existing relay, researched official sources and US IPAWS design concepts, identified unsafe and misleading behaviours, added regression coverage, implemented source/runtime/UI changes in parallel, integrated and tested the result, and prepared documentation and deployment checks. See the dated verification report for completed checks and live outcomes.

This repository predates the event-day changes. Prior commits and the September 4 design documents are preserved. Do not describe the whole repository as created from scratch during the event.

## Demonstration sequence

1. Open the production site and explain the independent-project banner.
2. Show source health before interpreting the active-alert count.
3. Search Sawantwadi or Chandgad; explain the district-level precision disclosure.
4. Search Navi Mumbai and show the separate district candidates.
5. Switch to Marathi; demonstrate filters and coverage across 36 districts.
6. Open service coverage details for power, water, public health or transport and explain which are directory-only.
7. Use the isolated local browser fixture server for a labelled demonstration of Marathi alert content, injection protection and offline cached data if live feeds are empty. Never inject fixtures into the production feed.
8. Show the test report and explain cancellation, expiry and source-outage behaviour.

## Honest limits

No complete village/ward directory, government affiliation, cell broadcast, dispatch, guaranteed delivery or complete incident awareness. Background Web Push is not implemented. Some public sources are unavailable or disabled; non-weather official directories are useful discovery tools, not universal real-time incident feeds. The project does not use generative AI to issue or rewrite emergency instructions.

## Next milestones

Versioned LGD and boundary imports, reviewed additional public notice adapters, agency partnerships, independent Marathi content review, broader browser/device testing and opt-in background notifications after their own reliability/privacy verification.
