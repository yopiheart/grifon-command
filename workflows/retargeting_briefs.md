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
> marketing/retargeting **consent basis**. This now exists: the dedicated
> `marketing_consent` capture (signup opt-in + Settings toggle + Privacy-Policy
> disclosure, `POLICY_VERSION`-stamped server-side — see
> [`consent_capture_plan.md`](consent_capture_plan.md)). The gate is therefore
> **enforced in code, not by hand**: `segment_pull.py` reads `marketing_consent` and
> **only** hashes users with a current grant (`consent_at` set, `withdrawn_at` null)
> into an upload roster — everyone else is excluded and counted as
> `excluded_no_consent`. Standing SOP for every upload pass:
>
> 1. **Upload only consented users.** Never upload a roster from a run where the
>    `marketing_consent` table was empty/unreadable (fail-closed: that yields empty
>    rosters by design — do not work around it).
> 2. **Honour withdrawals (Meta CA Terms §4).** Each pass also writes
>    `.tmp/growth/audiences/removal/<segment>.csv` for consented→withdrawn users —
>    Neil **removes** those hashes from the live audience, not just skips them.
> 3. **≤30-day refresh-and-reconcile.** Meta marks lists "Outdated" at 30 days.
>    Re-run the pass and apply both the new upload AND the removal roster at least
>    every 30 days.
> 4. **Neil certifies at upload.** At audience creation in the Meta UI, Neil makes
>    the Jan-2025 certification (not a CRA, no sensitive data, follows ad policies).
> 5. **Match floor.** A roster below ~1,000 matches is flagged `below_match_floor`
>    (may not deliver) — Neil's call whether to upload; it is written either way.
>
> PII never lands in this file — only counts, signal, and the brief.

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
- **Consent:** CLEARED — `marketing_consent`-gated (<n> granted uploaded, <n> excluded_no_consent, <n> consented→withdrawn to remove)
- **Roster:** `.tmp/growth/audiences/<segment>.csv` (<n> hashed; <n> missing email) + removal `removal/<segment>.csv` (<n>) — Neil uploads & applies removals
- **Offer/Hook (grifon-cmo):** <evidence-cited angle — reference a growth-debrief winner / swipe pattern>
- **Visual (grifon-creative-director):** <format, look, thumbnail direction>
- **Build:** Director AI (load `director-smoke` first) → Neil publishes

**Routed:** <Gated Proposal to viral_swipe_file.md | app_audit.md item | none>
**Open briefs added:** <segment(s) awaiting Neil's build/publish>
```

## Entries

_(none yet — appended newest-first once live data exists and the consent gate clears)_
