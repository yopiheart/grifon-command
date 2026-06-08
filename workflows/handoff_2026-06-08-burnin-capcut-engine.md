# Handoff — 2026-06-08 — Burn-in phase: CapCut-grade overlay/caption engine (NOT merged)

> **TL;DR:** Priority 1 (burn-in) is built and verified on Neil's real 8-scene ad. Branch
> **`feat/burn-in-overlays-sfx-music`** is pushed (7 commits), build green, 47 unit tests +
> synthetic + real re-stitch passing, crown-jewel leak 0, zero new test failures.
> **It is NOT merged** — waiting on (a) Neil's SFX/music files, (b) one final re-stitch with sound.

## What shipped on the branch (in order)
1. `8021fef` Slice A: thread EDL → renderer; burn simple drawtext overlays + SFX (`adelay+amix`) +
   ducked background music (`sidechaincompress`). Asset resolver is `existsSync`-guarded (missing
   file → graceful skip). Font/SFX/music live in `api/_lib/assets/` (bundled via `vercel.json`).
2. `8a93189` CapCut overlay engine in `api/_lib/renderFfmpeg.ts` (reworked Slice A's drawtext):
   - **Hook (scene 1):** Inter-Black white, slide-up+fade reveal (0.4s delay, 0.7s), crimson
     wipe-box behind the **whole title**, upper-center safe band.
   - **Scenes 2+:** EDL overlay fades in/out (≥1.5s) → chunked `scriptLine` captions (~3–4 words,
     min 0.7s/chunk, particle-safe, emoji-stripped) in the face-clear band; never overlapping;
     overlay skipped if it ≈ the caption.
   - Safe zone 10/14/22%, auto-fit+wrap, region-aware placement. Pure helpers unit-tested.
3. `7315909` EditVideo threads `scriptLine`/`sceneType`/`isHook`/`captionRegion`; MediaPipe
   face-detect (`services/captionRegionDetect.ts`, graceful → heuristic).
4. `9726422` MediaPipe WASM from jsdelivr CDN (model self-hosted in `public/mediapipe/`, 229KB;
   the 33MB wasm stays out of the repo, gitignored). Graceful fallback covers CDN misses.
5. `b018210` Neil review fix #1: hook box highlights the **whole title** (not last word); strip
   apostrophes from ALL burned text ("TIGNAN MO 'TO" → "TIGNAN MO TO" — apostrophes read as AI).
6. (wipe fix) Neil review fix #2: the hook box now actually **wipes L→R**. drawbox can't animate
   width in this build (no `eval=frame`) → animated via 24 time-gated `enable` slices. See
   `agent_lessons.md` 2026-06-08 ffmpeg entry.

## Verified working (don't re-litigate)
- Real 8-scene re-stitch (35.86s, identical duration → trim/concat/voice untouched): hook
  Inter-Black + crimson box wiping L→R across the whole title + slide-up; chunked captions in the
  bottom band clearing the avatar's face (via heuristic — detection not even needed); overlay→
  caption sequencing; apostrophes gone. Neil approved design/positioning/colors.
- Filtergraph escaping (single-quote, bare filenames + cwd=dir) validated on a Taglish line with
  apostrophe+comma+emoji via the synthetic harness.

## Decisions locked (grill-me, 2026-06-08)
ffmpeg engine (not Remotion); Inter Black; slide-up≈flip; hard shadow (no blur); no letter-spacing;
crimson hook box (config constant) + black caption boxes; captions from `scriptLine`; safe-zone
constants; MediaPipe face-detect (talking-only, graceful) on jsdelivr CDN; same branch single merge.

## Pendings before merge
1. **Neil's SFX + music files** → `api/_lib/assets/{sfx,music}/` per `api/_lib/assets/README.md`
   (10 SFX named == SfxBankId; 3 beds mrbeast/temu/testimonial; commercial-redistribution license).
   Until then the audio layers graceful-skip (captions/overlays still render).
2. **Hook reveal animation is too weak (Neil, 2026-06-08).** Current `anim:'slideup'` reads as a
   plain FADE-IN, not a punchy flip-up/bounce — "not powerful enough to catch attention." Next
   session: make the hook entrance pop. Options within ffmpeg drawtext (animate `y`/`alpha`/
   `fontsize` via `t`, which drawtext DOES eval per-frame — unlike drawbox): an **overshoot/bounce**
   (y springs past the target then settles), a **scale-pop** (fontsize 70%→110%→100%), or a faster
   harder slide with a back-ease. Tune in `buildTextFilter` (the `slideup` branch) + `HOOK_*`
   constants in `renderFfmpeg.ts`. Verify by extracting frames INSIDE the 0.4–1.1s window (see the
   2026-06-08 ffmpeg lesson) and on the moving video.
3. **One final re-stitch with sound** once assets land → Neil watches → merge.
4. Captions in this demo used **placeholder scriptLines** (loose-files test). In a real wizard run
   captions come from `sceneBatch[].scriptLine` (the actual spoken script) automatically — no paste
   needed. Caption *timing* is even-split (not word-synced); Whisper ASR is the deferred upgrade.

## TUNED follow-up (deferred, needs Neil per-diff approval, NO /goal)
Model-picked `hookHighlightWord` in the EDL prompt/schema (`services/geminiService.ts`) so the box
can highlight the true power-word instead of the whole title, if desired. v1 boxes the whole title.

## How to resume / re-verify (free, no $)
- Re-stitch on real clips: put 8 MP4 URLs + `SCENE N.mp3` in `.tmp/`, edit `.tmp/restitch.json`,
  then `$env:RUN_RESTITCH='1'; npx vitest run tests/integration/restitch-real.test.ts`
  → `.tmp/restitch-out.mp4` + frames. (URLs from the last smoke expire ~2026-06-09; ask Neil for fresh.)
- Synthetic (no footage needed): `$env:RUN_BURNIN='1'; npx vitest run tests/integration/burnin-render.test.ts`.
- Tunable constants live at the top of the burn-in section in `renderFfmpeg.ts` (HOOK_WIPE_DUR,
  crimson color, box alpha, safe-zone %s, MIN_CHUNK_SEC, INTER_ADV).
- Upload a local render for a shareable URL: `node .tmp/upload.mjs <tag>` (disposable script).

## Other launch pendings (unchanged from the PR#9 handoff)
TASK 2 One-Click Autopilot; hook scene-1 Kling transition creative pass; Pro video_ads cap parity +
useSubscription status muddle + deploy-enabled gate (need Neil's product calls). See
`workflows/handoff_2026-06-08-pr9-merged-launch-pendings.md`.
