# Agent guide

This is an unofficial Maharashtra civic CAP relay. It republishes public feeds. It is not a government site and it does not originate cell broadcast, Wireless Emergency Alerts, or IPAWS. In immediate danger, tell people to call 112. An empty feed is not an all-clear.

Exactly 36 Maharashtra districts. Do not attach Goa. Optional Jev, situational, and CPCB layers stay off by default.

## Pull requests

Grok Bot and Cursor use the same contract: [`.cursor/skills/pr-setup/SKILL.md`](.cursor/skills/pr-setup/SKILL.md).

- Grok Bot gathers context and writes the prompt. It does not edit the product patch.
- A Cursor cloud agent applies that prompt and opens a ready pull request with `gh`.
- Bugbot reviews with [`.cursor/BUGBOT.md`](.cursor/BUGBOT.md).
- Do not babysit when the pull request opens. Do not merge unless the user asked to ship, land, or merge.

Human map, including the Grok Bot rule to paste into Settings: [docs/pr-setup.md](docs/pr-setup.md).
