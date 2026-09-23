<!-- Title: type(scope): subject. Open ready, not draft. Sections below follow .cursor/skills/pr-setup/SKILL.md. -->

## Why

<!-- Intent and approach. One or two short paragraphs. -->

## Scope

<!-- Bullets: symbols and paths in this change. Name what is out of scope when the boundary matters. -->

## Tradeoffs

<!-- Rejected alternatives a reviewer would ask about. Delete this section if there was no real choice. -->

## Blast Radius

<!-- Who or what this touches, and why it is safe or risky. -->

- [ ] This change does **not** claim government status or originate cell broadcast / WEA / IPAWS.
- [ ] Empty, stale, or disabled sources are not presented as an all-clear.
- [ ] Optional layers / Jev / CPCB stay **off by default** unless this PR is an explicit, documented enablement.
- [ ] Coverage stays the 36 Maharashtra districts. Goa LGD 551, 552, 585, 586 and Goa-only names do not attach.

## Verification

<!-- Name each command you ran and its outcome. -->

- [ ] `npm test`
- [ ] `npm run typecheck` (and `npm run types` if Wrangler bindings changed)
- [ ] `npm run test:e2e` if UI, CSP, or the API contract changed
