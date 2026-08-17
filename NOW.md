# NOW — the resume doc
**Stamped: 2026-08-17** (session 27)

## ▶ NEXT ACTION — two env flips, then ONE render that answers everything left

### 1. Flip two Vercel env vars (2 min). Both ear-gates PASSED today.
```
SFX_V2_ENABLED = true              # PROD (already true on preview). Runtime-read, no rebuild.
GRIFON_MUSIC_GEN_ENABLED = true    # Runtime-read, no rebuild.
```
Six months of built-and-merged work was parked behind nothing but a listen. Neil ran
both gates on 2026-08-17: SFX rotation variants PASS (incl. every machine-contested
one), the chaching family PASSES WHOLE (**no prune, all 6 stay**), and the generated
music beds beat the static ones. Recorded in
[`sfx_upgrade_plan.md`](workflows/sfx_upgrade_plan.md),
[`this_week_plan.md`](workflows/this_week_plan.md), and P13 in
[`viral_swipe_file.md`](workflows/viral_swipe_file.md).

### 2. Then one `before_after` run — it settles FOUR open things at once
```
https://grifon.ai/app?osaEngine=producer
```
Recipe `before_after` · Hiraya Glow · Presenter **SET** = `after.png` (not Auto) · slots
from `tests/fixtures/sample-batch/`. Inputs:
[`sample_run_before_after_2026-08-16.md`](workflows/sample_run_before_after_2026-08-16.md).

That single render answers: (i) session 26's two unproven merges, (ii) today's
per-preset hook looks, (iii) the closed hands-only hatches, and (iv) **SFX cue
TIMING** — the one ear-gate target an audition physically cannot judge. Hits reading
consistently late or early → tune `CALIBRATION_OFFSET_SEC`, one constant.

**Storyboard gate:** same woman in EVERY scene · scene count = 4 · does the hook SHOW
the flaw · any `cinematic_grade` chip (it flags, it does NOT auto-fix — hit REGENERATE).
**After filming:** camera moving in every scene from frame 0 · no white wash on the hook ·
thumbnail looks like the presenter in her room, not studio-lit.

## 🚀 MERGED TO MAIN TODAY — `git revert -m 1 <sha>` to undo
**Per-preset hook identity.** "Lahat ata ng preset overlay text ay pare-parehas" had
**three** stacked causes, not one:
1. `punch`/`bars`/`spotlight` were `{...IMPACT, caption}` — they overrode ONLY captions,
   inheriting IMPACT's `hook` AND `sfx` verbatim. That is why captions changed and
   nothing else did.
2. `planScene` used `pickHookPalette(variantSeed)` — the **ad** picked the colour, so it
   was random per render and identical in distribution across every title-stack preset.
   `HookStyle.gradient` owns it now.
3. `buildWordFilters` hardcoded ONE entrance, so `hook.reveal` was dead for all six
   title-stack presets. Preset-keyed now: slam / bounce / flip.

7 presets, 7 distinct hooks — 5 fonts, 6 accents, 3 entrances. **CLASSIC untouched,
proven not asserted:** its golden snapshot is byte-identical against HEAD while the
other six moved. Two new tests fail if any two presets ever share a hook signature or
SFX palette again; one caught a real collision while being written.

**Hands-only `referenceImage="none"` hatches closed** (SERVICE Tutorial S2-S4, SERVICE
Before&After S2). TUNED, Neil-approved. S1/S3 keep `"none"` on purpose — no operator in
frame at all. ⚠️ **The audit found FEWER holes than the session-26 brief claimed.**
`tryon`/`unboxing`/`demo`/`tutorial`/`realestate` never offered `"none"`. That brief was
wrong here AND on the hook root cause — do not trust its remaining pointers unread.

Merged state verified: `npm run build` pass, **1237 tests green**.

## ⚠ NOT VERIFIED — say it plainly
**No real ffmpeg render exists for any of today's work.** Burn-in tests are gated behind
`RUN_BURNIN`. Evidence stops at the emitted filtergraph (7 of 7 distinct, 3 motion
signatures). Neil's eyeball is the remaining gate. The SFX cue-class picks for
punch/bars/spotlight are a design proposal, not an ear result.

## ⚠ OPEN — owed, not blocking
- **`hookFallbackText` ([`drawPlan.ts`](api/_lib/drawPlan.ts) ~520) breaks the #1 rule of
  the `text-hook-machine` skill**: it builds the on-screen title from the first 7 words of
  the SPOKEN line. The skill bans exactly that ("that's a caption's job"). Needs a decision.
- **That skill is worth its rulebook, not its machinery.** BUILD/REFRESH need Sandcastles
  MCP, which we lack. Fundamentals + WRITE belong in the EDL prompt + a 4th swipe file.
  Its no-punctuation rule is WRONG for us — a Tagalog question hook is a workhorse.
  Committed at `public/text-hook-machine.skill`.
- **Music E2E still owed:** flip the flag, then drive a Pro/Business render through the
  AI Editor. The ear test and the E2E are two different gates.
- **The AI gate is FLAG-ONLY, it does not reroll.** `imageGate.ts`'s header still lies.
- **Premise-check parse bug is LIVE.** `cleanJson` drops a valid grounded answer ~1 in 6.
- **`MODEL_RESEARCH`** (`gemini-3.5-flash`) is referenced by no flow. Dead constant.
- **Repo grows ~400 MB/month.** `git filter-repo` is irreversible — never without Neil.

### Maintain: **overwrite, never append**, last step of any session that changed state, max 90.
Repo artifacts are ENGLISH; ads stay Taglish. Cafe-PC warnings: `cafe_session.md` §A6.
