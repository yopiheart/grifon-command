# Retargeting Briefs

The compounding log behind the `retargeting-briefs` skill (Phase 3 of
[`growth_loop.md`](growth_loop.md)). Each pass joins `subscriptions` tiers to the
`events` funnel + `feedback` (via `tools/segment_pull.py`) into audiences, and lands a
per-segment **creative brief** here for Neil to build + publish. Read the most recent
pass's **Open briefs** before a new run.

**Ingest-only / roster-export-only.** Nothing in this file pushes to Meta, publishes,
or spends. `segment_pull.py` writes **hashed-email CSV rosters** to `.tmp/` (disposable,
never committed); **Neil uploads them to a Meta Custom Audience by hand**, then builds
the approved brief in Director AI and publishes. The briefs here are specs, not ads.

> **Privacy gate (read before any upload).** A real Custom Audience upload needs a
> marketing/retargeting **consent basis**. A dedicated marketing-consent capture does
> **not exist yet** (the `user_voices` consent is voice-only) — building it is a
> separate gated task touching the consent UI (`components/`/`App.tsx`), plus a
> `terms`/`privacy` update. Until it ships, every roster is **blocked pending Neil's
> explicit confirmation** of a consent basis. PII never lands in this file — only
> counts, signal, and the brief.

> **No live entries yet.** `events` / `subscriptions` have no live retargetable data
> until Phase 0 telemetry runs in production. Segmentation + roster hashing are
> verified against `tools/fixtures/segment_sample.json`; the first real briefs land
> once live data exists (and the consent gate clears).

## Open briefs (approved, not yet published)

*Briefs Neil has greenlit but hasn't built/published yet — don't re-brief these.*

- _(none yet)_

## Segment playbook (the standing intents)

| Segment | Intent | Default angle |
| --- | --- | --- |
| `checkout_abandoners` | highest intent | Risk-reversal / objection-kill / urgency — saw price, balked. |
| `power_users_still_free` | hottest upgrade | Show the ceiling they hit + the unlock; ROI of the paid tier. |
| `free_not_converted` | upgrade-nudge | Value-proof; re-activate dormant free. |
| `detractors` | save / winback | Acknowledge friction → "we fixed X" → save. Not a hard sell. |
| `promoters` | referral / LAL seed | Referral ask; use as a **lookalike seed**, not a target. |

---

## Entry template

```markdown
### <YYYY-MM-DD> — segment pass (window: <since>→<until>, <N> days, source: <supabase|fixture>)
**Sizes:** checkout_abandoners <n> · power_users_still_free <n> · free_not_converted <n> · detractors <n> · promoters <n> · anon_skipped <n>
**Activated this round:** <which segments + why (size × intent)>

**Brief — <segment> (<count> users, signal: <avg engaged / on-free / themes>)**
- **Consent:** <CLEARED — basis: … | BLOCKED — consent capture not built>
- **Roster:** `.tmp/growth/audiences/<segment>.csv` (<n> hashed; <n> missing email) — Neil uploads
- **Offer/Hook (grifon-cmo):** <evidence-cited angle — reference a growth-debrief winner / swipe pattern>
- **Visual (grifon-creative-director):** <format, look, thumbnail direction>
- **Build:** Director AI (load `director-smoke` first) → Neil publishes

**Routed:** <Gated Proposal to viral_swipe_file.md | app_audit.md item | none>
**Open briefs added:** <segment(s) awaiting Neil's build/publish>
```

## Entries

_(none yet — appended newest-first once live data exists and the consent gate clears)_
