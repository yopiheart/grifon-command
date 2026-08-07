# Handoff — 2026-06-09 — One-Shot Ad (One-Click Autopilot) v1

> **TL;DR:** One-Shot Ad v1 is BUILT + design-approved by Neil ("wow I love the design"),
> on branch **`feat/one-shot-ad-autopilot`** (4 commits, pushed, NOT yet merged — `gh` isn't
> authed, Neil merges in the GitHub UI). Engine + 3 screens + brand-check pass. Build green,
> tsc clean, 10/10 orchestrator tests, no NEW test failures (the 15 red EDL/model-ID tests are
> the known pre-existing tuned issue). The live $ smoke was deliberately NOT run.

## What's on the branch
- **Engine (Slice 1):** `services/autopilotOrchestrator.ts` — headless, client-side, RESUMABLE
  state machine chaining the existing tuned services (market research → autofill → script →
  storyboard+images → video → voices → EDL → final render). Fully dependency-injected
  (`services/autopilotDeps.ts` binds the real services; `services/autopilotRunStore.ts` =
  IndexedDB persistence). Retry-then-flag (a bad scene flags for one-tap reshoot, never
  hard-stops). `reshootScene` powers the First Cut reshoot. 10 unit tests, all mocked (no $).
- **Module (Slices 2–5):** `components/OneShotAd/` (index container + Launch/Running/FirstCut +
  `motion.tsx` primitives), wired as `activeModule 'one_shot_ad'` in `App.tsx` behind the
  `grifon_admin` gate (a `MORE_MODULES` tile in `Dashboard.tsx`). Gold-beam signature motion
  (`osa-*` keyframes in `index.css`), all within DESIGN.md. brand-check: 0 criticals.
- **DEV-ONLY preview hook (STRIP BEFORE MERGE):** `components/OneShotAd/previewMock.ts` + a
  `?osaPreview=launch|running|firstcut` branch in `components/OneShotAd/index.tsx` + a top-level
  bypass in `App.tsx` (search "DEV-ONLY"). Lets Neil view the 3 screens with mock data, no
  auth, no $. Open `http://localhost:5173/?osaPreview=launch` (etc.) after `npm run dev`.
  **Remove all three before the branch merges.**

## Neil's feedback (2026-06-09) — fix tomorrow, both in the Customize drawer (LaunchScreen.tsx)
1. **Voice ID field is too technical.** Replace the raw `voiceId` text input with a friendly
   NAMED voice picker — pull display names from `components/SignalModulator/pinoyReady.ts`
   (`RECOMMENDED_VOICE_IDS`) / `fetchVoices`, show "Pinoy/Pinay — <vibe>" labels, default
   silently. The user must never see or type an ElevenLabs voice id.
2. **"Real-talk / Hype / Bold" is confusing.** This is the script STRATEGY (Testimonial /
   MrBeast / Temu). Per the locked decision it should be AUTO-DETECTED, not user-picked — so
   either hide the picker entirely (pure auto) OR keep it as an override with a plain-language
   one-line description under each. Lean auto. (The true auto-detect classifier is a TUNED
   change → Neil per-diff approval, NO /goal — for now a sensible default + clear labels.)

## Known issue caught (read-only, before any spend) — fix before any live smoke
- **Orchestrator video duration is invalid for Veo.** `pickSceneDuration` returns a flat `5`
  and the runQueue config uses `duration: 5`, but `VIDEO_MODEL_ROUTING` (geminiService.ts):
  Veo_3.1_Lite @720p valid = **[4,6,8]** (5 throws on talking scenes); Kling_3_0/O1 = **[5,10]**.
  Fix: per-model valid pick (Veo→6, Kling→5) + reconcile `resolution`/`aspectRatio` with
  GenerateVideo before the live render smoke. A live run today dies at the first talking scene
  AFTER paying for research+script+storyboard+images.

## Remaining for One-Shot Ad before it leaves admin-gate
- The 2 drawer UX fixes above. - The duration/resolution fix. - Gemini Vision hero check
  (currently copy-based warn). - LIVE $ SMOKE (you-and-me, director-smoke pre-flight: handheld
  hero w/ readable brand label, derive brand from label, Filipino avatar, watch each scene at
  the First Cut gate before "done"). - Then: metering + Autopilot-tier gating (separate billing
  slice, needs Neil's product calls).

## Other launch pendings (unchanged, per the 2026-06-08 burn-in handoff)
Audio override UI (bed dropdown + master SFX toggle + per-cue mute in EditVideo.tsx); Whisper
word-sync; hook scene-1 Kling transition pass; billing/metering; TUNED EDL SFX-discipline +
offer/CTA sharpening (Neil per-diff, no /goal).
