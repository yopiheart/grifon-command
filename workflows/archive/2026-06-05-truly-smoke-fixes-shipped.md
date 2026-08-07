# Handoff — 2026-06-05 — Truly #10 smoke: clean MP4 achieved, 4 fixes shipped, re-smoke blocked on Gemini 429

> **TL;DR:** Re-drove a full Director smoke on **`claude/effort-estimation-AhHqn` (PR #9)** with a new brand
> (**Truly — Jelly Booster Pigment Body Potion**, Taglish Testimonial, 8 scenes). **#10 produced a clean,
> watchable 40.1s MP4** (1080×1920, H.264+AAC) with **100% lip-sync and 100% brand-voice fidelity** (Neil
> confirmed). The smoke surfaced 4 real defects — **all fixed, built, tested, pushed**: the recurring 16-word
> Taglish hook, double ElevenLabs spend, inconsistent dead-air trim (+ hook over-trim), and unwanted camera
> effects (blur/jitter/parallactic background-change). A live **re-smoke to verify the fixes is NOT done** —
> blocked by a **Gemini upstream 429** (the API key's RPM/daily quota, exhausted by this long session). **Do
> NOT merge PR #9 until the re-smoke passes.**

## Branch / commits (all pushed)
- **`136cf0b`** `fix(adscript)` — **16-word Taglish hook** → `capHookArray` in `api/_lib/prompts.ts`
  `parseAdScriptResponse`: the model split one hook across 2 array elements (8w each); the UI joins them →
  16w. Now join-then-cap each hook array to ONE ≤12w line. **TUNED file, Neil-approved.** Verified on the
  wire (8w hooks) + UI.
- **`a56b890`** `fix(render)` **Phase 1** (deterministic, no tuned prompts):
  - **Double voice-spend:** Signal Modulator's "GENERATE ALL VOICES" (TTS) is 100% discarded — `EditVideo`
    ignores `editorBatch.audioOverlays` and re-consolidates. Added a **direct GenerateVideo → AI Editor**
    path (primary `// SEND TO AI EDITOR ↗`); Signal Modulator demoted to `// VOICE STUDIO (OPTIONAL)`.
    One paid voice pass now. (`App.tsx`, `components/GenerateVideo/index.tsx`)
  - **Dead-air trim:** the EDL `keepSegments` were never passed to the renderer, so it fell back to
    `silencedetect`-on-voice — which **under-trims talking scenes** (Veo filler is audible, not silent) and
    **over-trims the short-TTS hook** (`-shortest` cut the product reveal). Replaced with a deterministic
    **per-type cap** the client computes: hook (scene 0) `keepFullClip` (renderer keeps full clip + `apad`s
    the short VO); every other scene `targetDurationSec = estimateSpokenSec(line)` (words/2.5 + 1.0 pad) →
    hard `-t` cap that cuts filler regardless of silence-vs-sound. New `utils/spokenDuration.ts`; additive
    `FinalRenderScene.{targetDurationSec,keepFullClip}` threaded `EditVideo → finalRenderService →
    api/render/final (zod) → renderFfmpeg`; new exported pure `chooseTrim()` + `apad` branch in `buildScene`.
  - **Vite EBUSY crash:** Vite watched `.playwright-mcp/` and died on the downloaded final `.mp4` (this was
    the `EDL_ERROR: Failed to fetch` root cause). `server.watch.ignored` now covers `.playwright-mcp/**` +
    `**/*.mp4`. (`vite.config.ts`)
  - Tests: `tests/unit/spokenDuration.test.ts` (5) + `chooseTrim` cases in `renderFfmpeg.test.ts` (6).
- **`fe29164`** `fix(video-prompts)` **Phase 2** (TUNED, targeted-removal, Neil per-diff-approved):
  `services/geminiService.ts` `generateVideoPrompts` (client-side prompt, NOT a crown-jewel flow):
  - `AVATAR_CAMERA_ANGLES`: dropped "lens breathing / micro-handheld jitter / handheld sway" → steady framings.
  - OPTION B (talking): removed parallactic-shift + aggressive-handheld; keep ONE gentle dolly-in/push-in;
    ban parallactic/background-reveal/shake/jitter/lens-breathing/rack-focus; "keep background stable";
    softened "STATIC SHOTS ARE FORBIDDEN" → "minimal, smooth motion".
  - OPTION A-REGULAR (b-roll 2+): dropped "aggressive push-in" + "counter-roll" → slow gentle moves.
  - **Left untouched on purpose:** OPTION A-HOOK (Scene-1 morph is intended) and the storyboard VIRAL VFX
    MENU. **Veo duration left as-is** (Phase 1 trim already removes the filler tail; tightening risks Taglish
    truncation — agent_lessons 2026-05-26).

**Gates green on `fe29164`:** `npm run build` exit 0; `npm run test` = **65 passed** (11 new), **15
pre-existing `geminiService.schemas` failures unchanged** (documented baseline); **crown-jewel leak check
= 0** (correct needles: MarketMind/DIRECTOR_CRITIQUE/STILL_FRAME_RULE/VIRAL VFX MENU/etc.).

## What's verified vs NOT
- **Verified (this session, live):** the #10 final MP4 renders end-to-end; lip-sync + brand-voice perfect;
  hook-length fix (8w) on the wire + UI; STS-vs-TTS resolved — **STS voice-changer fires at the Final Render
  CONSOLIDATE step by design** (Signal Modulator only does TTS; that's why the earlier "STS never fired"
  alarm was a false read). Phase 1+2 pass build/test/leak.
- **NOT verified (the re-smoke):** that Phase 1+2 produce the intended *result* in a fresh render — single
  voice pass, trimmed tails on all scenes, hook reveal intact, no blur/jitter/parallactic. **This is the one
  open gate before merge.**

## Resume plan (next session — finish the re-smoke, then merge)
1. `git checkout claude/effort-estimation-AhHqn && npm install`; recreate `.env` (+ `GRIFON_DEV_UNMETERED_VIDEO=true`).
2. `node scripts/check-elevenlabs-voice.mjs` (expect TTS 200 + STS_AVAILABLE). `npm run dev` (now crash-safe on mp4).
3. **Re-drive fresh** via `director-smoke` (the Truly localStorage draft is wiped by the defreeze). Hero:
   re-source a handheld product photo with a readable label (last run used Truly Jelly Booster —
   trulybeauty.com lifestyle shot). Market Research → Send to Director → render 8/8.
4. **Use the NEW default path: `// SEND TO AI EDITOR ↗`** on GenerateVideo (skips Signal Modulator).
   Confirm **zero `/api/elevenlabs/text-to-speech` before CONSOLIDATE** (single voice pass).
5. CONSOLIDATE VOICE → RENDER FINAL. Verify: (a) `ffmpeg -af silencedetect` shows **no trailing tail / no
   mid-scene dead-air >~0.5s**; (b) **hook end-frame (product reveal) intact**; (c) talking scenes **no
   blur/jitter, stable background, no sunlight-reveal transition**; (d) lip-sync still 100%.
6. If clean → mark `workflows/render_pipeline_voice_10.md` smoke gate **GREEN** and **merge PR #9**.
7. **Gemini 429 caution:** this session exhausted the key's text-quota window. Space out the wizard, or wait
   for the RPM/daily window to reset before the re-smoke (the regenerate of Step-7 video prompts is what hit
   the wall). ffmpeg final-render itself makes no Gemini calls.

## Deferred (need Neil's go-ahead — do NOT start without it)
1. **Pro `video_ads` cap parity** — raise `MONTHLY_LIMITS` (api/_lib/quota.ts) + `PLAN_LIMITS` (utils/planGate.ts,
   deep-equal'd by `quota.parity.test.ts`) + marketing copy (config/planFeatures.ts). Product decision.
2. **Metering muddle** — `useSubscription` shows `plan_id` ignoring `status`, while server `getUserPlan` gates
   on `status ∈ {active,trialing}`; workflows-vs-video_ads conflation in the wall.
3. **Veo wrong-script** — Veo hallucinated a different line in one talking scene (and filler words like
   "titin yanga"); STS faithfully carries it. NOT fixed by Phase 1/2 (they only trim the tail / calm the
   camera). Deeper fix = forced alignment or a dedicated lip-sync model. Future scope.
4. **Deploy-enabled-at-7/8** — Storyboard `CONFIRM & DEPLOY` lit at 7/8 synthesized (a transient image-gen
   502 left one scene ungenerated); a distracted user could ship a gap. Gate on all-N or auto-retry.

## Durable
- All code on PR #9 (`136cf0b`, `a56b890`, `fe29164`). This handoff. The dev meter bypass is documented in
  `.env.example`. The rendered Truly MP4 from this session is at `C:\Users\Administrator\Desktop\grifon-final-truly.mp4`
  (local — wiped by the defreeze; re-render next session). Wizard draft is localStorage (also wiped).
