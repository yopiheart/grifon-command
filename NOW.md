# NOW — the resume doc
**Stamped: 2026-08-16** (session 26)

## ▶ NEXT ACTION — one more `before_after` run, watched

Three merges shipped today. The last two are UNPROVEN — nothing has run against them.

```
https://grifon.ai/app?osaEngine=producer
```
Recipe `before_after` · Hiraya Glow · Presenter **SET** = `after.png` (not Auto) · slots
`hero`/`before`/`after` from `tests/fixtures/sample-batch/`. Inputs + pre-flight:
[`sample_run_before_after_2026-08-16.md`](workflows/sample_run_before_after_2026-08-16.md).

**Storyboard gate — check ALL of these, not one:**
1. **Same woman in EVERY scene.** Two beats used to permit `referenceImage="none"`; a
   one-scene gate let a break through on run 2. Fixed, but this is the gate that matters.
2. **Scene count = 4.** Run 3 came back with **5** — the TRANSFORMATION skeleton did not
   hold, and the extra beat was also the one that drifted. Unexplained. Flag it.
3. **Does the hook SHOW the flaw** (close-up on it, she points, camera moves in), or is it
   another neutral portrait?
4. **Any warm/cinematic scene?** The gate now flags this as a `cinematic_grade` chip.
   ⚠️ It does NOT auto-fix — hit REGENERATE yourself before FILM IT.

**After filming, watch for:** camera motion visibly moving in EVERY scene from frame 0 · no
white wash on the hook · the thumbnail looking like the presenter, in her room, not studio-lit.

## 🚀 THREE MERGES TODAY (newest first) — each `git revert -m 1 <sha>`
**`c932dc0`** — Gate now observes `lightingLooksProduced` and flags `cinematic_grade` on
identity scenes; `avatar_state` added to `IDENTITY_MODES` (a hole I shipped hours earlier, on
the exact two beats that had already broken twice). Plus four render fixes, **none of which
were model randomness — all were things we instructed**: camera language was 6 bans vs 1 weak
positive so the model delivered nothing (fixed with a MEASURABLE target, underway at frame 0 —
same lesson `marvin-avatar` already records for lighting); the hook-morph branch fired on scene
index alone and made the model warp the subject to invent a transformation on a single-frame
scene (now gated on actually having two frames); the thumbnail demanded "EXTREME... 
Shock/Surprise/Joy" + studio rim light, the THIRD place the expression rule was missing;
and the hook now SHOWS the flaw instead of mentioning it.

**`e4d2864`** — Expression ceiling at the storyboard AND video layers. `APPEARANCE_LOCK_RULE`
had listed Expression as REQUIRED with three extreme examples. Includes a TEETH RULE and an
explicit override of CINEMATIC VARIETY, which was the loophole. `fastTextModel` → 3.7.

**`77426d1`** — `referenceImage="none"` FORBIDDEN on the person beats of TRANSFORMATION
(filed 2026-07-11, unactioned for five weeks); `venueSlot` finally reaches the scene image via
a new `avatar_state` mode, so uploaded before/after photos anchor real frames; `MODEL_TEXT` →
`gemini-3.7-flash`; fixtures rebuilt on the raw-ugc scaffold + master daylight.

⚠️ **`researchTextModel` deliberately still 3.6** — it feeds the EDL, so the pending watched
run stays single-variable. ⚠️ 3.7 doubles to $1.50/$7.50 on **2027-01-01**.
⚠️ **Do not credit 3.7 for the quality jump yet** — the identity fix shipped in the same deploy.

## ⚠ OPEN — owed, not blocking
- **The AI gate is FLAG-ONLY, it does not reroll.** `imageGate.ts`'s own header claims it
  "drives the only automated reroll"; the producer and CLAUDE.md say the deterministic
  `checkSceneImage` does. **The code is the truth — fix that comment.**
- **Premise-check parse bug is LIVE.** `cleanJson` discards a valid grounded answer ~1 in 6,
  on every model. The 3.7 flip was neutral on this, not a fix.
- **No price in any video beat** is a product decision now. It RETIRES the "offer never
  surfaced" defect. ⚠️ Re-read the `feat/adscript-ab-harness` "drops the offer 4/4" result
  before acting on it — if it counts a missing PRICE as a miss, the harness is wrong.
- **`MODEL_RESEARCH`** (`gemini-3.5-flash`) is referenced by no flow. Dead constant.
- **Cross-model ceiling is real and NOT worth chasing.** Fixtures are gpt-image-2, scenes
  render on Gemini; 100% will never happen. Neil's call: don't force it.

## ⚠ OPEN DECISION — the repo still grows ~400 MB/month
1. **`clients/*/ads/*/clips/`** — heaviest (25 MB each) but **paid Veo generations**. Not
   gitignored on purpose: ignoring them without another home means the defreezer eats them.
2. **`git filter-repo`** to strip 1.5 GB from history. Irreversible, force push, breaks every
   clone. **Never without Neil saying so.**

### Maintain: **overwrite, never append**, last step of any session that changed state, max 90.
Repo artifacts are ENGLISH; ads stay Taglish. Cafe-PC warnings: `cafe_session.md` §A6.
