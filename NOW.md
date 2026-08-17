# NOW — the resume doc
**Stamped: 2026-08-17** (session 28)

## ▶ NEXT ACTION — wire `sceneGrade.ts` into the render, behind its flag

The module is built, calibrated and pushed ([`api/_lib/sceneGrade.ts`](api/_lib/sceneGrade.ts)).
It is **NOT wired**. That is the whole next job.

**Why it needs a two-pass loop.** `chromaTarget` is the MEDIAN of every scene, so
every scene must be measured before any scene is built. Today's loop
(`renderFfmpeg.ts:1005`) downloads and builds one scene per iteration. Split it:
pass 1 downloads + `measureSceneChroma`, pass 2 computes `chromaTarget` once and
builds. Insertion point for the filter is `renderFfmpeg.ts:740`, right after
`sceneNormalizeFilter` and **before** any drawtext, so captions keep `#FFCC00` exact.

Flag `SCENE_GRADE_ENABLED` (runtime-read, no `VITE_` twin, ships dark). Then a
render with it ON vs OFF, Neil's eye decides. Owed: a unit test for the pure
`chromaTarget` / `planSceneGrade` pair — none exists yet.

## 🎨 WHY SCENE 4 CAME BACK WARM — root cause, read off the code

[`prompts.ts:1742`](api/_lib/prompts.ts#L1742) puts *"Lighting/mood for that spot"*
in the **REQUIRED** list of every avatar-scene prompt, and its own worked example
ends *"warm afternoon sunlight from the window."* Each beat is **instructed** to
author its own light; the identity lock holds the face and nothing else.

So **regenerate cannot fix it** — Neil rolled 3× on 2026-08-17 and every roll came
back warm. A re-roll is a fresh dice throw, not a repair. Stop rolling. 4th
corroboration of the colour-grade drift already logged in
[`sample_run_before_after_2026-08-16.md`](workflows/sample_run_before_after_2026-08-16.md).

🔴 **Neil chose the deterministic route (A), not the prompt edit (B).** B is the
real root fix but is a TUNED edit needing his explicit go, and `agent_lessons.md`
bans exactly that shape of blanket prompt change.

⚠️ **A grade cannot fix a different ROOM.** S4's bathroom differs from S3's. If the
room bothers him more than the colour, that is a different fight.

## 🧪 THE MEASUREMENT THAT KILLED THE FIRST DESIGN

Grey-world (fixed 128 target) was written, then **measured and thrown away**. An
untouched fixture frame reads `uavg=122.0 vavg=134.8` — 8.5 units off "neutral"
while looking correct, because a frame full of face and warm tile is not supposed
to average to grey. It corrected a good scene to its cap and closed 15% of a real
cast. The sibling-median version closes **73%** and plans **null** for agreeing
scenes (byte-identical render). Do not re-propose grey-world.

## 🔊 ON MAIN — audio, shipped and deployed-pending
`fc1baa5`. **`glitch` retired** → remapped to `swish` in `resolveSfxFile`, the only
choke point both the preset map and the AI-authored EDL pass through. **+5% on all
gains** (SFX 0.6→0.63 / 0.55→0.5775 / 0.5→0.525, music bed 0.18→0.189, lead
0.85→0.8925). ⚠️ **~0.4 dB, at the edge of audible** — if it still sits low, say
"20" and it is a two-number change. Neil has NOT heard either change yet.

## ⏸ THE RUN — stopped at the storyboard gate, zero film spend
`before_after` / Hiraya Glow. Gates 1–3 PASSED (4 scenes · beat 0 is the BEFORE
with no product · same woman throughout). Stopped on the S4 grade only. Inputs and
the full gate list: [`sample_run_before_after_2026-08-16.md`](workflows/sample_run_before_after_2026-08-16.md).
⚠️ REGENERATE has no undo — 3 rolls burned, the coolest roll is the one to keep.

**Before the next render:** confirm Vercel PRODUCTION deployed `fc1baa5` or later,
or the old audio is what gets tested.

## 🌿 BRANCH `feat/hook-layout-system` (`1245d14`, pushed, NOT merged)
Four real hook LAYOUTS. **Font decision made 2026-08-17: ship the 8 on the branch,
add nothing.** The sameness was a code bug (accent-by-word, now by-LINE), not a
font shortage; new faces would cost `advRatio` + `sizeFrac` re-tuning before launch.
Queued for AFTER launch, only if the real render still reads samey: **hype →
Titan One**, **bars → Passion One Black** (Poppins Black carries 3 of 7 hooks today).

14 font samples rendered through the real drawtext path: `.tmp/font-preview/`
(disposable — regenerate with the six OFL statics listed in the session log).
🔴 Still awaiting Neil: the metallic gradient he approved 2026-06-10 is OFF
everywhere; no swipe reference carries one. Machinery kept.

## ⚠ OPEN — owed, not blocking
- `resume_doc_check.mjs` off-by-one fixed (`c872d5f`) — the cap was really 89.
- **Music is ElevenLabs now**, keyed `${userId}/music/${seed}-${style}.mp3`, so it
  never repeats per user or per ad. Pro/Business only, else the static bed.
- **`hookFallbackText`** builds the title from the SPOKEN line, which the
  `text-hook-machine` skill bans. **AI gate is FLAG-ONLY.** **Premise-check
  `cleanJson` drops ~1 in 6.** **`MODEL_RESEARCH` dead.** Repo +400 MB/month.
- `npm run design:lint` fails: the `design.md` CLI is defreezer-wiped. Not a regression.

### Maintain: **overwrite, never append**, last step of any session that changed state, max 90.
Repo artifacts are ENGLISH; ads stay Taglish. Cafe-PC warnings: `cafe_session.md` §A6.
