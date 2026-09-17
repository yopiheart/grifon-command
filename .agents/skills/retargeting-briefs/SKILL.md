---
name: retargeting-briefs
description: Turn the growth loop's own users into retargeting SEGMENTS (checkout-abandoners, power-users-still-free, free-not-converted, detractors, promoters) and write a per-segment creative brief for Neil to build + publish. Use when Neil asks to "segment our users", "who should we retarget", "build a winback for checkout abandoners", "make an upgrade campaign for free users", "retargeting briefs", "build a custom audience", or does a periodic segmentation pass. INGEST-ONLY / ROSTER-EXPORT-ONLY — produces hashed-email rosters for Neil to upload to Meta by hand; never pushes to Meta, never publishes, never spends. NOT for diagnosing PAST ad results (that's growth-debrief) or analyzing an external swipe video (that's viral-autopsy).
disable-model-invocation: true

---

For Codex tool execution, read [the desktop adapter](../_shared/codex-runtime.md) before following the workflow below.

This is the **targeting half** of Phase 3 of the Data-Driven Growth Loop
(`workflows/growth_loop.md`). Where `growth-debrief` reads *past* ads to learn why
they won, this skill defines *who to reach next* — it joins `subscriptions` tiers to
the `events` funnel + `feedback` into audiences, then writes a creative brief per
audience. Neil approves, builds in Director AI, uploads the roster, and publishes.

The deterministic membership math (who is in each segment, hashed rosters) is done by
`tools/segment_pull.py`; this skill owns the **creative judgment** — what to say to
each audience (via `grifon-cmo`) and how it should look (via
`grifon-creative-director`). Briefs compound in a versioned log so future tasks can reuse the evidence.

## Hard guardrails (read first)

1. **Ingest-only / roster-export-only.** This skill **never** pushes an audience to
   Meta, never publishes, never sets budget. `segment_pull.py` writes **hashed-email
   CSV rosters**; **Neil uploads them to a Meta Custom Audience by hand.** No
   automated push exists, by design (the whole loop's doctrine).
2. **Privacy gate — consent is BUILT and enforced in code.** Building a retargeting
   audience from user PII requires a lawful marketing/retargeting consent basis. This
   now exists: the `marketing_consent` capture (signup opt-in + Settings toggle +
   Privacy-Policy §8 disclosure, server-stamped `policy_version`). `segment_pull.py`
   enforces it automatically — it uploads **only** users with a current grant
   (`consent_at` set, `withdrawn_at` null), excludes everyone else
   (`excluded_no_consent`), and emits `removal/<segment>.csv` rosters for
   consented→withdrawn users that Neil must **remove** from the live audience (Meta CA
   Terms §4). Standing rules for every brief: (a) never upload from a run where the
   consent table was empty — that's fail-closed, not a bug to work around; (b) apply
   the removal roster, don't just skip; (c) re-run and reconcile ≤30 days; (d) Neil
   makes the Meta certification at upload. **One prod step remains:** apply
   `supabase/marketing_consent.sql` to the live DB (until then live rosters are empty
   by design). Say the consent posture (granted / excluded / to-remove) in every brief.
3. **Least-PII by default.** `segment_pull.py` stdout is **always PII-free** (counts
   + signal only — never user_ids or emails). Hashed rosters are a separate opt-in
   (`--out-dir` + emails) written to `.tmp/` (disposable, never committed). Never
   paste raw emails or user_ids into the brief log or chat.
4. **NEVER edit `services/geminiService.ts` or `api/_lib/prompts.ts`** (or any
   TUNED-tagged content) off a brief. Briefs are *proposals*; Neil approves and
   builds. Tuned-prompt implications → Gated Proposal in `viral_swipe_file.md`.
5. **Briefs cite evidence, not vibes.** Every brief references the segment's signal
   and (when available) a `growth-debrief` winning angle — "checkout-abandoners, avg
   3 generations, saw price → lead with the risk-reversal that won at ROAS 9.3×."

## Procedure

### Step 0 — Open the brief log + borrow what already won

- Read `workflows/retargeting_briefs.md` — review the last pass's **Open briefs**
  (approved-but-not-yet-published) so you don't re-brief the same audience.
- Skim `workflows/growth_debriefs.md` (winning creative angles to reuse per segment)
  and the `viral_swipe_file.md` Pattern Index (proven hooks/edit DNA to apply).

### Step 1 — Pull the segments

```bash
# No creds — verify segmentation + roster hashing against the committed fixture:
python tools/segment_pull.py --fixture tools/fixtures/segment_sample.json --out-dir .tmp/growth/audiences

# Live, PII-FREE analysis only (no emails, no rosters):
python tools/segment_pull.py --days 30

# Live, ALSO build hashed rosters for upload (pulls emails — only after the privacy gate):
python tools/segment_pull.py --days 30 --with-emails --out-dir .tmp/growth/audiences
```

The tool emits per-segment `count` + `signal` (avg engaged events, on-free count) to
stdout, and — only with emails — writes `<segment>.csv` (SHA-256 hashed, Meta-ready)
to `--out-dir`. Exit `1 SECRETS_NOT_CONFIGURED` (live, no `.env`) → use `--fixture`.
No Python on the PC (a known pending item) → install Python 3.10+, or read the same
joins via the Supabase MCP `execute_sql` and shape by hand. `--power-threshold` tunes
the power-user bar.

### Step 2 — Read the signal, pick what to activate

Don't brief every segment every time. Pick the **1–3 highest-leverage audiences this
round** by size × intent. A 0-count segment is skipped (say so). Use the playbook:

| Segment | Intent | Brief angle (starting point) |
| --- | --- | --- |
| `checkout_abandoners` | highest intent | Risk-reversal / objection-kill / urgency — they saw price and balked. The classic winback. |
| `power_users_still_free` | hottest upgrade | Show the ceiling they're hitting (quota/feature gate) + the unlock; ROI of the paid tier. |
| `free_not_converted` | upgrade-nudge | Value-proof / "you made 1 ad, here's what Pro unlocks" — re-activate dormant free. |
| `detractors` | save / winback | Acknowledge the friction (read the `feedback` free-text themes) → "we fixed X" → save. Not a hard sell. |
| `promoters` | referral / LAL seed | Referral ask + use as a **lookalike seed** (upload as a Custom Audience source, not a target). |

### Step 3 — Write the brief per activated segment

For each, invoke **`grifon-cmo`** for the offer/hook/copy and
**`grifon-creative-director`** for the visual direction, anchored to the segment's
intent and signal. The brief is a *spec for the next ad*, not the ad itself — Neil
builds it in Director AI (load `director-smoke` first for that run).

### Step 4 — Privacy gate (before any roster ships)

If the brief implies a real Custom Audience upload, the consent basis is enforced
automatically (guardrail 2): the roster already contains **only** consented users, and
a `removal/<segment>.csv` lists consented→withdrawn users for Neil to remove. State the
consent posture in the brief — `<n> granted (uploaded) · <n> excluded_no_consent · <n>
to-remove` — straight from the `segment_pull.py` output. If a run's upload roster is
empty because the consent table is empty/unapplied, the brief ships as a *plan* only
(no roster to upload yet). Promoters used as a *lookalike seed* require the same basis.

### Step 5 — Land it in the brief log + route

Append to `workflows/retargeting_briefs.md` (entry template there). Then:
- A winning angle worth a tuned change → **Gated Proposal** in `viral_swipe_file.md`.
- A recurring detractor theme that's really a product bug → `workflows/app_audit.md`.

### Step 6 — Commit

Checkpoint the reviewed brief-log update with the completed task
(`retargeting-briefs: add <date> segment briefs`). Rosters in `.tmp/` are disposable
and **never committed** (they contain hashed PII) — regenerate them when Neil uploads.

## Thresholds (starting heuristics — tune as real data arrives)

Defaults, not law (precedent: the `quota.ts` "revisit when real telemetry contradicts
the model" note):

- **Power-user bar:** `--power-threshold` engaged events (default 5) within the
  window. Engaged = any event except `PageView`/`ViewContent`.
- **NPS bands:** detractor `≤ 6`, promoter `≥ 9` (standard NPS).
- **Window:** `--days` (default 30) for events + feedback. `subscriptions` is current
  state, not windowed.
- **Minimum audience size:** a segment too small to matter (or too small for Meta's
  Custom Audience floor, ~1,000 for a usable match) → note it, don't ship a roster for
  a handful of users.
- **Anonymous events** (no `user_id`) can't be email-retargeted → reported as
  `anon_events_skipped`, excluded from every segment.

## Out of scope / wrong tool

- **Diagnosing why a past ad won/lost** → `growth-debrief`.
- **Analyzing an external swipe video** → `viral-autopsy`.
- **Pushing an audience to Meta / publishing / budgeting** → Neil, by hand. This skill
  never does — roster export only.
- **Changing the marketing-consent capture** (the `marketing_consent` table, `api/consent.ts`,
  signup opt-in / Settings toggle) → that's its own surface (`consent_capture_plan.md`); this skill
  only *consumes* its output via `segment_pull.py`. Don't edit it from a brief.
- **Building this into an in-app audience dashboard** → post-beta idea →
  `workflows/post_beta_roadmap.md`, not scope creep here.
