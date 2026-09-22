# Shadow Jev triage (TypeSafe System One)

This independent civic hub **relays** official NDMA SACHET CAP, IMD and INCOIS. It is not a government website. Call **112**. Zero alerts ≠ safe.

Jev is used **only in shadow** so operators can see which relayed bulletins need human attention for clearer citizen UX. It must never invent alerts, never change public CAP fields, and never send SMS, WhatsApp, Web Push, or cell broadcast.

Jev is **not** a coding-agent or chat LLM. It does not generate text, write code, or pick its own next action. It evaluates typed Choice / Score / Noul questions against structured CAP state. See [Jev with coding agents](https://docs.typesafe.ai/introduction/coding-agents.md) and [How to build with System One](https://docs.typesafe.ai/concepts/how-to-build-with-system-one.md).

## Flags (committed defaults stay off)

| Variable | Production default | Meaning |
| --- | --- | --- |
| `JEV_SHADOW_ENABLED` | `false` | Run shadow triage on Worker ingest and expose `/api/jev/shadow` |
| `JEV_SHADOW_KILL` | unset / `false` | Immediate halt without redeploy |
| `JEV_USE_LIVE` | `false` | If not `true`, CI/local uses the mock fixture scorer |
| `JEV_API_KEY` | unset | TypeSafe Bearer token (Wrangler secret; never `wrangler.jsonc`) |
| `cursor` | unset | Alternate Cloudflare / Cursor secret binding name |
| `JEV_GATEWAY_URL` | `https://api.typesafe.ai/v1/systemone` | Override; `/v1` and legacy `/v1/score` are rewritten to `/v1/systemone` |

Key resolution: `env.JEV_API_KEY || env.cursor`. Never commit the key. Never print it in logs.

### Enable live shadow (still default false in git)

1. `npx wrangler secret put JEV_API_KEY --env staging` (and production), **or** bind a secret named `cursor`.
2. Set Worker vars `JEV_SHADOW_ENABLED=true` and `JEV_USE_LIVE=true` in the dashboard (do not flip the committed `wrangler.jsonc` defaults).
3. Apply D1 migrations `0002_jev_shadow.sql` and `0003_jev_shadow_model.sql`.
4. Confirm ingest writes rows and `GET /api/jev/shadow` returns them.
5. Plot confidence vs operator agreement on those rows **before** automating anything. The only “safe branch” this repo may ever auto-keep is ops `log_only` / `surface_ops_badge` at **high** confidence. Public notify stays forbidden.

## One System One request per alert

Code owns the workflow. Each alert is evaluated with **atomic parallel questions** over structured CAP state only:

`{ headlineEn, descriptionEn, headlineMr, descriptionMr, kind, weaClass, districts, source, id }`

Instructions use `question` / `focus` objects and Choice/Noul criteria use contrastive `what` / `not_for` / `examples`. Questions reference state fields with backticks (for example `` `headlineEn` ``).

| Question | Type | Role |
| --- | --- | --- |
| `hazard_family` | Choice | `flood` / `cyclone` / `heat` / `earthquake` / `air_quality` / `other` — compared to relayed `kind`; mismatch is flagged |
| `citizen_urgency_clarity_en` / `_mr` | Score | `unclear` / `usable` / `clear action` |
| `bilingual_gap` | Noul | EN and MR say materially different things |
| `needs_human_ops_review` | Noul | Ambiguous geography, missing action, conflicting cancel/update cues |
| `recommendation` | Choice | `log_only` / `surface_ops_badge` / `escalate_human` (model suggestion only) |

## Confidence-gated routing (in code)

Thresholds follow TypeSafe’s confidence-gated routing pattern (floor plus a higher bar for acting on the model choice). Plot them on live shadow data before treating them as final.

| Band | Confidence | Stored ops recommendation |
| --- | --- | --- |
| high | ≥ 0.8 | Allow the model’s `log_only` or `surface_ops_badge` |
| medium | 0.6–0.8 | `needs_stronger_check` (ops-only; still no public notify) |
| low | < 0.6 | `human_review` |

Always `human_review` when hazard family mismatches relayed `kind`, `needs_human_ops_review` noul ≥ 0.6, the model chooses `escalate_human`, or the model names an SMS/push/WEA-like channel (those choices are discarded).

Rollout: **shadow → confidence plot → automate the safest ops branch only**. Never SMS/push. Never mutate public CAP.

## Model identity

Requests send `model: "jev-latest"`. TypeSafe aliases resolve to a versioned id (currently `jev-1.13.0`). The response `model` field is stored on each `jev_shadow_log` row; `requested_model` stores the alias. See [Models](https://docs.typesafe.ai/models.md).

## Ops surface (not public bulletins)

When `JEV_SHADOW_ENABLED=true`, Worker ingest calls `triageAlertShadow` after a successful snapshot save and appends D1 rows. Operators read:

- `GET /api/jev/shadow` — recent rows plus an ops-only badge payload (`public: false`). **404** when the flag is off.
- `/api/meta` `features.jevShadow` — whether the flag is on and the ops endpoint; **no Jev judgments**.

Public `GET /api/alerts` CAP records are unchanged. Do not render Jev recommendations on the citizen UI.

## Live HTTP

```http
POST https://api.typesafe.ai/v1/systemone
Authorization: Bearer <JEV_API_KEY or cursor>
Content-Type: application/json
```

Body includes `model: "jev-latest"`, `state`, and the `questions` map. See [TypeSafe API](https://docs.typesafe.ai/api.md).
