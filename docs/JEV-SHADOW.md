# Shadow Jev triage (TypeSafe System One)

This independent civic hub **relays** official NDMA SACHET CAP, IMD and INCOIS. It is not a government website. Call **112**. Zero alerts ≠ safe.

Jev is used **only in shadow** so operators can see which relayed bulletins need human attention for clearer citizen UX. It must never invent alerts, never change public CAP fields, and never send SMS, push, or cell broadcast.

## Flags

| Variable | Production default | Meaning |
| --- | --- | --- |
| `JEV_SHADOW_ENABLED` | `false` | Run shadow triage on ingest and expose `/api/jev/shadow` |
| `JEV_SHADOW_KILL` | unset / `false` | Immediate halt without redeploy |
| `JEV_USE_LIVE` | `false` | If not `true`, CI/local uses the mock fixture scorer |
| `JEV_API_KEY` | unset | TypeSafe Bearer token |
| `cursor` | unset | Alternate secret name (Cursor cloud / Cloudflare binding) |
| `JEV_GATEWAY_URL` | `https://api.typesafe.ai/v1/systemone` | Override; `/v1` and legacy `/v1/score` are rewritten to `/v1/systemone` |

Key resolution: `env.JEV_API_KEY || env.cursor`. Never commit the key. Put it with Wrangler secrets, not `wrangler.jsonc`.

## One System One request per alert

Code owns the workflow. Each alert is evaluated with **atomic parallel questions** over structured CAP state only:

`{ headlineEn, descriptionEn, headlineMr, descriptionMr, kind, weaClass, districts, source, id }`

| Question | Type | Role |
| --- | --- | --- |
| `hazard_family` | Choice | `flood` / `cyclone` / `heat` / `earthquake` / `air_quality` / `other` — compared to relayed `kind`; mismatch is flagged |
| `citizen_urgency_clarity_en` / `_mr` | Score | `unclear` / `usable` / `clear action` |
| `bilingual_gap` | Noul | EN and MR say materially different things |
| `needs_human_ops_review` | Noul | Ambiguous geography, missing action, conflicting cancel/update cues |
| `recommendation` | Choice | `log_only` / `surface_ops_badge` / `escalate_human` |

Routing in **code**: if the model choice is `escalate_human` **or** confidence is below 0.6 **or** hazard family mismatches the relayed kind, the stored recommendation is `human_review`. SMS/push choices are discarded.

Rows persist in D1 `jev_shadow_log` (migration `0002_jev_shadow.sql`). Public `/api/alerts` is unchanged.

## Live HTTP

```http
POST https://api.typesafe.ai/v1/systemone
Authorization: Bearer <JEV_API_KEY or cursor>
Content-Type: application/json
```

Body includes `model: "jev-latest"`, `state`, and the `questions` map. See [TypeSafe API](https://docs.typesafe.ai/api.md).
