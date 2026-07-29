# Funnel Swipe File

Compounding database of decoded LIVE lead-gen funnels — full-page teardowns of landing pages and their post-opt-in flows from proven direct-response operators (Sabri Suby, Alex Hormozi, Russell Brunson, and whoever Neil drops next). Each entry captures the page-level anatomy the image swipe files can't: section sequence, CTA cadence, form design, consent/disclaimer language, and the post-opt-in map. What compounds here: **L-patterns** (page/funnel-level structures) that graduate into the Funnel Forge template's section library and archetype rules. Maintained by the `funnel-autopsy` skill; `grifon-cmo` owns the persuasion-lever reads, `grifon-creative-director` owns the visual-DNA reads; findings feed `funnel-forge` builds, which must cite F-/L-IDs for every structural choice.

**Ingest loop:** driven by `.claude/skills/funnel-autopsy/` (user-invoked, `/funnel-autopsy`). Evidence per entry: WebFetch text pass (hypothesis) + `smoke-tester` full-page screenshots at 390×844 and 1440×900 (ground truth) + dummy-data funnel walk (post-opt-in map) + Meta Ads Library `ads_library_search` recon (ad→LP mapping). Screenshots live in `assets/funnel-swipe/F<NN>/` (compressed, committed). Dedupe by URL before fetching — a re-drop of a known funnel updates its existing entry (re-walk noted with date), no new F-number, no Pattern bump.

**RESUME (2026-07-29):** File created (Funnel Forge Phase 0). No entries yet. Next F-number = **F01**. Next L-number = **L1**. Phase 1 targets queued: aisecretschallenge.com (Brunson), selllikecrazybook.com/free (Suby), acquisition.com/{fivescalingframeworks, roadmap, workshop-multi-2, opt-in-financial-p-f} (Hormozi). Recon identity for funnel walks: name "Grifon Recon", email `neilmaglaya.business22+recon@gmail.com` (Neil-approved 2026-07-29 — his inbox captures competitor email sequences as bonus swipe material), PH-format dummy phone.

⚠ **Cafe-PC rule:** commit after every entry (`swipe(funnel): add F<NN> <brand>`). Uncommitted teardowns die with the reboot.

**The trust line:** steal the *structure* and the *lever*, never the lie. Fabricated scarcity (fake stock counters, evergreen "closing tonight"), unverifiable earnings claims, and fake-countdown patterns get recorded in `trust_flags` and are **do-not-replicate** — we take the section that carries the trick, not the trick.

---

## Pattern Index

Status legend: `observed` (counting corroborations) → `proposed` (≥3 corroborations across independent brands — same-brand repeats are weak evidence — and written up as an FGP below) → `applied` (shipped into the Funnel Forge template / a live funnel).

| ID | Pattern | Corroborations | Status |
|----|---------|----------------|--------|
| — | *(none yet — Phase 1 seeds this)* | — | — |

---

## Gated Proposals

Template/build changes distilled from ≥3-corroborated L-patterns, awaiting Neil's explicit approval before entering `funnels/_template/`. Each FGP pairs a **CMO angle** (copy/structure pattern + guardrail) with a **CD recipe** (exact visual spec). Nothing here self-applies.

*(none yet)*

---

## Entries

Newest first. Entry template:

```
### F<NN> — <url> (<Operator>) — <YYYY-MM-DD>
archetype: minimal | longform        confidence: high | med | low
screenshots: assets/funnel-swipe/F<NN>/  (desktop.png, mobile.png, post-optin-*.png)
**Why swiped:** <what made this worth decoding>
**SECTION WALK (in order):** numbered list — section name · purpose · verbatim headline/key line · levers (Cialdini + Suby/Hormozi/Brunson device) · CTA text if present
**FORM:** fields + required flags · CTA verbatim · consent/disclaimer language verbatim
**CTA CENSUS:** count + all verbatim variants
**POST-OPT-IN MAP:** page 2+ URLs · what each sells · order bumps/upsells/calendars/VSLs observed · dummy data used
**AD→LP MAPPING:** ads_library_search evidence — which ad hooks point here (or "not run — why")
**trust_flags:** fabricated scarcity/counters/claims observed, or "none noted"
**STEALABLE:** 3–5 bullets → candidate L-patterns
**Patterns:** corroborates <L-IDs> · new candidate <or none> · contradicts <or none>
```

*(no entries yet)*
