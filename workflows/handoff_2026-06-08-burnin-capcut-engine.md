# Handoff — 2026-06-08 — Burn-in phase: CapCut-grade overlay/caption engine (MERGED to main)

> **TL;DR:** Priority 1 (burn-in) is built, verified on Neil's real 8-scene ad, and **MERGED to
> `main` (merge commit `1275cf2`).** Hook reveal **locked to `flip`** (scale-pop) — verified on
> real footage. Build green, renderFfmpeg unit tests green, zero NEW test failures (the 15
> pre-existing `geminiService`/EDL model-ID failures are untouched by this branch — separate TUNED
> issue). **Audio was DECOUPLED from the merge** (Neil's call): the engine graceful-skips missing
> SFX/music, so the banks drop in later as a trivial data-only commit — no re-merge, no review.
>
> **Open follow-ups (none block anything):** (a) drop the 13 audio files into
> `api/_lib/assets/{sfx,music}/` — curated Pixabay links are in the session log; **all CC0 sites
> (Pixabay/Mixkit/Freesound) sign download URLs server-side, so they CANNOT be hotlinked/auto-
> fetched — manual download, or a Freesound API token, is required.** (b) audio override UI
> fast-follow (see "Audio control" below). (c) TASK 2 One-Click Autopilot. (d) scene-1 Kling
> transition pass. (e) billing/metering.

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
2. ~~**Hook reveal animation is too weak.**~~ **DONE (commit `83d6be2`).** Reworked
   `buildTextFilter`'s `slideup` branch into three `HOOK_REVEAL` styles (`bounce` easeOutBack
   overshoot / `slam` easeOutQuart hard slide / `flip` uniform fontsize scale-grow), alpha now
   **snaps in 0.15s** (decoupled from motion) so it no longer reads as a fade. **Locked to `flip`**
   (Neil's pick, 2026-06-08) — a 45%→100% scale-pop. Verified on synthetic-harness frames inside
   the **0.42–0.60s** punch window (wider samples land post-settle, look identical). Gated on a 30s
   smoke proving drawtext re-evals `fontsize` per-frame (see the new 2026-06-08 `agent_lessons.md`
   entry). Build + unit tests green. STILL PENDING: Neil watches `flip` on **real moving footage**
   (the final re-stitch in #3) before merge — synthetic flat-bg approval only so far.
3. **One final re-stitch with sound** once assets land → Neil watches → merge.
4. Captions in this demo used **placeholder scriptLines** (loose-files test). In a real wizard run
   captions come from `sceneBatch[].scriptLine` (the actual spoken script) automatically — no paste
   needed. Caption *timing* is even-split (not word-synced); Whisper ASR is the deferred upgrade.

## Audio control — product decision (Neil, 2026-06-08)
**AI-auto is the default + a LIGHT override (fast-follow), NOT a sound studio.** How it works
today (ships as-is, merge does not wait on the override): SFX are AI-picked in the EDL
(`sfxCues[].sfxId` from the 10-name `SfxBankId` bank + `anchorSec`), shown read-only in the editor
([EditVideo.tsx:482](../components/EditVideo.tsx)); the music bed is code-derived from the AI's
`edl.meta.scriptStyleDetected` → `mrbeast|temu|testimonial` (default mrbeast,
[EditVideo.tsx:215](../components/EditVideo.tsx)). **Fast-follow slice (post/peri-merge, small,
touches `EditVideo.tsx` → needs a plan+goal):** a music-bed dropdown (**Auto** ✦ / MrBeast / Temu /
Testimonial / None, Auto preselected) + a **master SFX on/off** toggle + optional **per-cue mute**
on the cues already listed. Deliberately NOT: hand-placing SFX or a library browser (different
product, support burden). The asset drop (10 SFX + 3 beds) is identical either way — override is
pure UI over the same banks.

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
