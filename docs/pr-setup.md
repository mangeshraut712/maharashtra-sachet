# Pull request setup

Grok Bot and Cursor use one contract for this repository. The procedure they both follow is [`.cursor/skills/pr-setup/SKILL.md`](../.cursor/skills/pr-setup/SKILL.md). Bugbot reads [`.cursor/BUGBOT.md`](../.cursor/BUGBOT.md) only.

This matches the loop Lauren Tan described for shipping with [pstack](https://cursor.com/marketplace/cursor/pstack): an outer agent writes the prompt, a Cursor cloud agent writes the patch and opens a ready pull request, Bugbot reviews, and a different agent verifies before anyone squashes. Opening a pull request does not start a babysit, and nothing merges unless you ask.

## Roles

| Who | What they do |
| --- | --- |
| Grok Bot | Outer loop. Reads GitHub, writes the prompt, sends it to a Cursor cloud agent. Does not edit the product patch. |
| Cursor cloud agent | Inner loop. Follows the skill, commits, opens a ready pull request with `gh`. |
| Bugbot | Reviews the diff against `.cursor/BUGBOT.md`. Comment `cursor review` or `bugbot run` to trigger a run. |
| Verifier | A different agent from the author. Posts `PASS`, `PASS+NOTES`, or `FAIL`. CI green is not that verdict. |

`.cursor/settings.json` enables the pstack plugin for Cursor sessions on this repo. Install pstack from the Cursor marketplace if it is not installed yet. The skill in this repo still applies when the plugin is absent.

## Pull request shape

Title: `type(scope): subject`.

Body, in order: **Why**, **Scope**, **Tradeoffs**, **Blast Radius**, **Verification**. The template is [`.github/PULL_REQUEST_TEMPLATE.md`](../.github/PULL_REQUEST_TEMPLATE.md). Civic checks live under Blast Radius: unofficial relay, no cell-broadcast origination, no false all-clear, 36 Maharashtra districts, no Goa leakage, optional layers off by default.

Prefer several narrow pull requests. A stack's root targets `main`. Each child targets its parent branch.

## What you still turn on

These two switches live in product settings. This repository cannot flip them.

1. **Cursor Bugbot.** Open [Bugbot in Automations](https://cursor.com/automations/from-cursor/bugbot) and enable it for `mangeshraut712/maharashtra-sachet`. Bugbot will then read `.cursor/BUGBOT.md` on each pull request update.
2. **Grok Bot.** In the bot's Settings, connect GitHub and the Cursor cloud-agent connection. Paste the agent rule below into **Settings > General > Agent**. Add a routine only if you want the bot to wake on pull request events. The routine stays quiet unless you asked it to build, babysit, or ship.

### Grok Bot agent rule

```
You are the outer loop for https://github.com/mangeshraut712/maharashtra-sachet.
You do not edit the product patch. You gather context and send a Cursor cloud agent the prompt a person would type.

That prompt must tell the cloud agent to follow .cursor/skills/pr-setup/SKILL.md:
conventional commit title type(scope): subject; body sections Why, Scope, Tradeoffs, Blast Radius, Verification;
open the pull request ready, not draft; use gh; keep pull requests narrow; do not babysit or merge unless asked.

Civic limits in every prompt: unofficial relay; no cell-broadcast or WEA origination; no government branding;
36 Maharashtra districts; no Goa leakage; an empty feed is not an all-clear;
optional Jev, situational, and CPCB layers stay off unless the task is an explicit enablement.

On a GitHub pull request event, stay quiet.
Babysit only after an explicit ask. Ship only after an explicit ask, and only after a verifier that did not write the patch posts PASS or PASS+NOTES.
```

### Grok Bot routine

Name: `Maharashtra PR factory`.

Trigger: a message to the bot, or a GitHub pull request event on `mangeshraut712/maharashtra-sachet`.

Prompt:

```
Read .cursor/skills/pr-setup/SKILL.md in mangeshraut712/maharashtra-sachet and follow it.
If the message asks for a change, write the inner-loop prompt and hand it to the Cursor cloud agent. Do not write the patch yourself.
If this run was triggered by a pull request event and nobody asked you to babysit or ship, do nothing. Do not comment. Do not merge.
```
