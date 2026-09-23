# Bugbot — Maharashtra civic relay

Review the diff for correctness, security, privacy, and false authority. Skip style nits, rename preferences, and comment wording.

This file is the project review contract. Cursor project rules under `.cursor/rules/` do not apply to Bugbot. The operational loop for the author and for Grok Bot is [pr-setup](skills/pr-setup/SKILL.md). Human norms are [CONTRIBUTING.md](../CONTRIBUTING.md).

## Flag these

- A change that presents this project, a fork, or a Worker URL as NDMA, SDMA, IMD, INCOIS, CWC, CPCB, or any other government site.
- Any path that originates cell broadcast, C-DOT CBS, Wireless Emergency Alerts, or IPAWS. This relay only republishes public feeds.
- An empty, stale, disabled, or failed source rendered as an all-clear.
- Goa state leakage: LGD 551, 552, 585, 586, or Goa-only names (North Goa, Panaji, Margao, Vasco) attached to a Maharashtra district. Border places that stay in Maharashtra: Sawantwadi, Dodamarg, Tillari, Vengurla (Sindhudurg) and Chandgad (Kolhapur).
- A district inventory other than the 36 Maharashtra districts, or a division count that moves Yavatmal out of Amravati.
- A weather advisory or light-rain Met message classified as an imminent threat or a presidential alert. The word "warning" must not match a war rule.
- A chemical pattern that swallows an industrial fire, or an ocean bulletin for Indonesia, Sumatra, or the Pacific attached to the Konkan coast.
- Invented LGD or Census codes. Prefer the LGD identifier. Do not treat a Census 2011 code as LGD when that number is already an LGD id (Thane LGD is 497).
- A new mutating, push, or report API. Public HTTP stays GET/HEAD unless the pull request adds auth, abuse controls, and a privacy review.
- Secrets, credentialed URLs, or upstream response bodies in logs. Collectors need an allowlisted host, a deadline, and a size cap.
- Optional layers (Jev / situational overlays / CPCB) turned on by default in `wrangler.jsonc`.
- Behaviour changes in collectors, WEA classification, or district matching with no test in `test/`.

## Do not flag

- Bilingual English/Marathi chrome that the pull request intends to change.
- A narrow pull request that leaves an explicit follow-up for an unrelated concern.
- An unused export that a later pull request in the same stack uses, when the pull request says so.
