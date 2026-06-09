# Handoff — 2026-06-08 — PR #9 (#10 video pipeline) MERGED to main; launch pendings queued

> **TL;DR:** The #10 final-render pipeline is **shipped to `main`** (merge `1c975bc`) and **live-smoke
> verified**: a full Director run (The Ordinary, Taglish Testimonial, 8 scenes) produced a clean **35.86s
> MP4** — 100% lip-sync + brand voice, **dead-air eliminated** (confirmed objectively via `silencedetect`:
> only the intended 0.3s soft-word pad remains at scene ends). Five real defects were found + fixed during
> the smoke (all on `main` now). The original `launch_readiness` #10 gate is **GREEN**. This handoff lists
> what's left to be launch-ready.

## What shipped to `main` (PR #9, merge `1c975bc`)
- **#10 final-render executor:** voice consolidation → server-side ffmpeg trim/concat → one MP4
  (`api/render/final.ts`, `api/_lib/renderFfmpeg.ts`, `services/finalRenderService.ts`,
  `services/voiceConsolidationService.ts`, `api/voice/consolidate.ts`). Async fire-then-poll.
- **5 fixes found+fixed live this smoke:**
  - `60d1cee` Vite `.tmp`/`.tools` watch-ignore (EBUSY crash hardening — downloads/tooling into the repo
    tree were killing the dev server).
  - `b505786` AI-Editor crash guard — `BatchEditMode` threw on a missing EDL field
    (`meta.formulaApplied` / `scene.keepSegments`) and ErrorBoundary'd the whole final-render panel.
  - `627ccb2` **TUNED** product-mode guard (`services/geminiService.ts` `generateSceneImage`): a handheld
    hero with a western hand made the image model hallucinate a western person into product-only frames;
    guard = "reproduce only the product, ignore people in the reference." Neil-approved per-diff.
  - `72edf95` trim each scene to the **actual VO end** (silencedetect on the VO MP3) instead of a
    word-count estimate — fixed scene-2 over-trim (cut VO) AND scene-8 under-trim (dead air). General for
    any script/product.
  - `ad8d6f8` `parseTrimSec` now detects trailing silence that ffmpeg **closes at EOF** (it only handled a
    dangling `silence_start` before) — this was the residual dead-air at scene ends.
- Earlier PR #9 work (pre-this-session): 16-word Taglish hook cap (`capHookArray`), Phase 1 deterministic
  trim + double-voice-spend fix + the SEND-TO-AI-EDITOR path, Phase 2 camera-calm.
- Gates at merge: `npm run build` green; `npm run test` 71 passed (the **15 failures are the documented
  pre-existing `geminiService.schemas`/`edit-decision-list` baseline**, unrelated); crown-jewel leak = 0.

## Verified working (don't re-litigate)
- Final MP4 renders end-to-end; lip-sync 100%; single voice pass (zero ElevenLabs TTS before Consolidate);
  hook 16-word cap (8-word hooks); Taglish carried through script→storyboard→VO; **dead-air gone**; product
  reveal end-frame clean (no leaked face); avatar correct Filipino.

## LAUNCH PENDINGS (prioritize next session)
1. **Burn-in phase (biggest ad-quality lever).** The renderer is **trim+concat only** by design; the EDL
   (`EditDecisionList` in `types.ts:401`) already *plans* but does NOT render: **overlay text**, **auto-
   captions** (`overlayText.style:'subtitle'`), **SFX** (`sfxCues[]` + 10-sound bank), **transitions**
   (`transitionIn`). **Background music is NOT in the schema yet** (add a `musicTrack`/ducking field).
   Work = ffmpeg `drawtext`/ASS + `amix` + `xfade` in `api/_lib/renderFfmpeg.ts`, timed off the EDL/VO, plus
   a small **asset library** (10 SFX files + a few licensed music beds). `generateEditDecisionList`
   (`services/geminiService.ts:1054`) is a live Gemini call.
2. **TASK 2 — One-Click Autopilot** (the original deferred goal). Branch `feat/headless-autopilot-v1`
   (admin-only, unmerged). Plan: (a) rebase onto the new `main`; (b) wire `renderFinalVideo` as the final
   **stitch stage** in `services/autopilotService.ts` (mirror `EditVideo.tsx` handleConsolidate+handleRenderFinal)
   so it outputs ONE MP4; (c) admin live-smoke; (d) resolve the 3 open judgment calls in
   `workflows/handoff_2026-05-29-headless-autopilot-v1.md`; (e) ungate → paid tier. **New/architectural →
   start with `grill-me` → `EnterPlanMode`** (CLAUDE.md). Spec: `workflows/autopilot_oneclick_spec.md`.
3. **Hook transition quality.** Scene-1 Kling Omni morph reads "cheap/sloppy" in the first 3s (the conversion-
   critical window). Creative pass — punchier hook visual / different transition. Separate from trim.
4. **Deferred billing/metering (need Neil's product calls):** Pro `video_ads` cap parity (`api/_lib/quota.ts`
   MONTHLY_LIMITS + `utils/planGate.ts` PLAN_LIMITS + `config/planFeatures.ts`); the metering muddle
   (`useSubscription` shows `plan_id` ignoring `status`); deploy-enabled-at-7/8 storyboard gate; Veo
   occasionally speaks a different line (needs forced alignment / lip-sync model — future).
5. **Cleanup:** branch `fix/hook-endframe-product-only` is **superseded** (the real fix is the tuned guard
   `627ccb2` now on main) — close/delete it.

## How to resume on a fresh cafe PC
`git fetch && git checkout main && npm install`; recreate `.env` from `.env.example` with real keys **AND
`GRIFON_DEV_UNMETERED_VIDEO=true`**; `node scripts/check-elevenlabs-voice.mjs` (expect TTS 200 +
STS_AVAILABLE, else STOP — billing); `npm run dev` (crash-safe on `.tmp`/`.tools`/`.mp4` now). Use the
`director-smoke` skill before driving the wizard (hero-FIRST, Market Research before Director, never
hand-type Step 1/2). Pace Gemini calls (per-key 429 risk). `gh` is NOT authed on cafe PCs (no token,
interactive login blocked) — **merge via a throwaway `git worktree` off main + `git push`** (that's how
PR #9 was merged), or have Neil click merge in the GitHub UI.

## Hard rules (carry forward)
- **TUNED files need Neil's per-diff approval:** `services/geminiService.ts` (prompts/schemas/model IDs),
  `api/_lib/prompts.ts`. Render/transport logic (`renderFfmpeg.ts`, components) is fair game.
- **Commit early AND push** — local commits die with the cafe-PC defreezer; only the GitHub repo persists.
- Writing into the repo tree at runtime (downloads, `.tools`, screenshots) can EBUSY-crash Vite — keep them
  in the already-ignored `.tmp` / `.playwright-mcp` / `.tools`.
- Verify Gemini image output by suspecting the **reference image + IDENTITY_LOCK mode** before the prompt
  text (a leaked face = an attached reference, not the wording). See `agent_lessons.md` 2026-06-07.

## Durable
All code + this handoff are on `main` (`1c975bc`). The final smoke MP4s were on Supabase signed URLs
(24h-expiring; re-render if needed). The `.tmp/analyze.mjs` silencedetect harness is gitignored (re-create
from this handoff if needed). Memory: `~/.claude/projects/.../memory/hook-endframe-face-leak.md`
(ephemeral — superseded by the tuned guard; the durable lesson is in `agent_lessons.md`).
