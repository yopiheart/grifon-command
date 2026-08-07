# Handoff — 2026-05-16 — Brief redesign + GenVid command bar shipped; 4 video-quality P1s parked

Branch: `main` HEAD now contains 2 fresh commits + 1 inherited docs commit. Both UI fixes are clean and live-verified. Veo render quality issues observed today are pre-existing P1s, NOT regressions from this session.

## Shipped this session (2 commits, pushed)

| Commit | Module | What it does |
|---|---|---|
| `f6c02c8` | MarketResearch + OfferOptimizer | Replaced sticky CTA + bottom button with single above-fold Brief card. Page height dropped 3961px → 1136px; primary CTA lands at y=418 of a 900px viewport (was buried at y=756 + duplicated). |
| `d39280d` | GenerateVideo | Sticky pipeline command bar at top of viewport. State-aware CTA morphs: `Render All N` → `Cancel Pipeline` → `SEND TO SIGNAL MODULATOR ↗` based on `renderedCount`. Removes the orphan Phase 5 v2 button, the freestanding rate-limit pill, and the bottom-of-rail Render All. CTA persists at y=12 of viewport even when scrolled to absolute page bottom (4282px page, scrollY=3382/3382). |

Both changes are UI-only — no edits to `services/geminiService.ts`, schemas, model IDs, or autofill flow. Build passes clean (tsc + Vite production). Live-verified with the Glossier sample.

Full Glossier wizard walkthrough (Steps 1–7) verified in this session — all 6 BusinessInfo fields prefill from MarketMind autofill ([App.tsx:320-328](../../App.tsx#L320-L328)), Step 4 avatar renders at 768×1376 (correct 9:16), Step 5 generates 8/8 scene images (Scene 1 start+end frame, Scenes 2–7 static shots), Step 6 thumbnail + Step 7 video prompts auto-generate, Step 8 → GenerateVideo enters pipeline mode cleanly.

## What blocked the audio gen test — and what to do about it

Tried to walk through to Phase 5 v2 audio gen (Glossier ad). Render All hit two upstream problems that gate the Phase 5 v2 button (`renderedCount === seedPrompts.length`):

1. **Scene 01 morph rejected with `400 INVALID_ARGUMENT`** — Veo 3.1 Lite preview model doesn't accept `startFrame + endFrame` pair mode for the Q4 morph. Only Scene 01 has both frames (b-roll morph); Scenes 02–07 are STATIC_SHOT and rendered fine.
2. **Scenes 06+07 hit Veo 429 RATE LIMIT after Scene 05** — [RenderAllRunner.ts:37](../../components/GenerateVideo/RenderAllRunner.ts#L37) sets `RATE_LIMIT_WINDOW_SEC = 3600`. Queue correctly paused for 60 min and is `await`-ing the timer. If the page stays open, they auto-resume.

Net: stuck at 4/7 rendered. Phase 5 v2 button never appears. Audio gen test parked.

## Video-quality observations (Neil reviewed 4 successful renders)

Two NEW issues surfaced — both are **pre-existing P1s already on [launch_readiness.md](../launch_readiness.md)**, surfaced live for the first time:

### 1. Lip-sync mismatch on talking-avatar scenes

Already tracked in launch_readiness as: *"Speaking-scene `FACING_CAMERA_REQUIRED` rule — eyes-closed/looking-away despite delivering script lines breaks lip sync if voiced. v1.x P1."*

Root cause: **architectural, not camera-angle.** Veo invents mouth movements based on prompt text; ElevenLabs generates audio separately; merge = invented motion ≠ actual waveform = mismatch. Camera distance is a **visibility multiplier**, not the cause. Tight close-up = obvious mismatch; wide shot = barely noticeable.

**Fix path (Path A, recommended):** Surgical TUNED edit to [services/geminiService.ts](../../services/geminiService.ts) `generateStoryboard` visual anchor — force mouth-closed framing on talking scenes ("avatar reacts non-verbally — expressive eyes, gestures, mouth CLOSED. No active speech motion."). Preserves the Phase 5 v2 architecture; eliminates the mismatch entirely; avatar becomes the "reactor" while ElevenLabs voiceover carries the dialogue. ~30 min including verify.

Alternatives considered + dropped:
- **B. Post-process lip-sync** (Sieve, HeyGen, D-ID, Wav2Lip) — adds vendor + $0.10-0.50/scene + latency. Defer.
- **C. Use Veo's native audio+lip-sync** — defeats the "one Filipino voice across all scenes" Phase 5 v2 pattern that just shipped.

### 2. Camera motion from prompt not visible in Veo Lite output

Commit [`0db5424`](#) (mandatory motion) **already anticipated this exact failure mode** in its own message:
> *If even strengthened prompts still produce static Veo Lite output, that's a model-capability limit — the real fix is Phase 5+ Vertex AI migration per [post_beta_roadmap.md](../post_beta_roadmap.md) item #5.*

Veo 3.1 Lite is the cheapest tier and is documented to interpret motion prompts loosely. The prompt is already as strong as it can reasonably get without becoming unmaintainable.

**Fix path (A, recommended for v1.x):** Per-scene model picker UI in GenerateVideo's SCENES rail. User can pick `Fast` for talking scenes (better motion compliance) and keep `Lite` for static b-roll. UI-only, no TUNED-prompt risk. ~1 hr work. Fast = ~3× Lite cost per scene, but user controls the spend per scene.

Alternative dropped:
- **B. Default-upgrade Veo to Fast** for all renders — 3× cost for all beta users on every scene. Wrong default.

## P1 backlog for the next session (ordered by impact/effort)

| # | Item | Effort | TUNED risk |
|---|---|---|---|
| 1 | **Lip-sync Path A** — `generateStoryboard` visual anchor enforces mouth-closed framing on talking scenes | ~30 min | Yes — TUNED edit to `geminiService.ts`. Requires explicit Neil approval before editing prompt content. |
| 2 | **Scene 01 morph 400 auto-fallback** — defensive retry in `geminiService.ts`: if Veo returns `400 INVALID_ARGUMENT` AND request had `endFrame`, retry once without `endFrame`. Single scene degrades gracefully instead of permanently failing. | ~20 min | Yes — TUNED. |
| 3 | **Per-scene model picker** — UI chip per scene in GenerateVideo SCENES rail; lets user route talking scenes to Veo 3.1 Fast for motion + (eventual) lip-sync, keep b-roll on Lite. UI-only. | ~1 hr | No |
| 4 | **Rate-limit window decision** — `RATE_LIMIT_WINDOW_SEC = 3600` (60 min) is brutal for beta workflow. Either drop to a shorter retry, or add a manual "Retry now" override in the command bar. | ~30 min | No |

Order #1 first — it directly fixes the user's loudest live complaint. Then #2 to unblock multi-frame morph scenes from permanent fail. #3 and #4 are quality-of-life on the GenVid module proper.

## Verification plan for next session (avoid Render All re-do)

After landing fixes #1 + #2:

1. **Don't click Render All** — that re-renders all 7 = ~$7-14 Veo spend.
2. Open Glossier session, GenerateVideo loads with Scene 01 FAILED + Scenes 02-05 DONE + Scenes 06+07 (auto-resumed during cooldown).
3. Hit individual `GENERATE SCENE 01` to verify the morph fallback now produces a clip (will be missing endFrame morph but won't fail).
4. Pick ONE talking scene (e.g., Scene 06) and hit `GENERATE SCENE 06` to verify mouth-closed framing came through. If yes, the fix is good for the rest of the talking scenes.
5. Each individual retry costs ~$1-2 Veo. Total verify spend: ~$2-4. No Render All needed.

Once 7/7 are rendered, Phase 5 v2 SEND TO SIGNAL MODULATOR button surfaces in the new command bar. Click → Scene Pipeline tab pre-selected → GENERATE ALL → ~$0.15 ElevenLabs for the full ad's voice.

## What's verified vs what still needs live confirmation

- ✅ Q1 MR/OO Brief redesign — live walked, screenshots banked
- ✅ GenVid sticky command bar — live walked, sticky persists across full page scroll
- ✅ Wizard Steps 1–7 prefill from MR autofill — live walked with Glossier sample
- ⏸ Glossier audio gen via Phase 5 v2 — parked (Veo cooldown + Scene 01 morph + Scene 06/07 rate-limit blocking)
- ⏸ Lip-sync Path A — fix path identified, not yet edited
- ⏸ Per-scene model picker — proposed, not yet built

## Cafe-PC reboot reminders

- `npm install` if reboot wiped node_modules
- `npm run dev` (likely :5173)
- `.env` GEMINI_API_KEY confirmed present today
- Git identity restore: `powershell -ExecutionPolicy Bypass -File scripts/restore-git-identity.ps1`
- Playwright MCP auto-loads via project-scope `.mcp.json`
- Veo daily quota — track usage via `[grifon:gv:submit]` lines in dev server log. Today's session burned ~$3-6 (4 successful Lite renders + 1 failed) before hitting the hourly rate limit at Scene 06.

## Do NOT re-do

- Don't re-render the wizard from Step 1 — Glossier session is resumable via Step 8 → GENERATE VIDEO NOW
- Don't click Render All again with same prompts + same model — same output, same Veo spend
- Don't edit `services/geminiService.ts` prompts without explicit Neil approval (TUNED)
- Don't auto-default Veo to Fast/Quality for all renders — that's a per-scene user choice
