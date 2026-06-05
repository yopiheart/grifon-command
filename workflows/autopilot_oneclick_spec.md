# Spec: One-Click Autopilot ("Just make me an ad")

> **CORRECTION (2026-06-05): a v1 ALREADY EXISTS — do NOT build from scratch.**
> "Headless One-Click Ad v1" was built on branch **`feat/headless-autopilot-v1`** (commit
> `e257a57`, ~1,162 lines: `components/HeadlessAutopilot/index.tsx` + `services/autopilotService.ts`
> + tests), with handoff `workflows/handoff_2026-05-29-headless-autopilot-v1.md` (on that branch).
> It is **code-complete, build-clean, unit-tested, admin-only, NEVER merged, NEVER live-smoked.**
> It already implements this spec's one-checkpoint model (deterministic self-check + ONE approval
> before render) and reuses the tuned functions. **The from-scratch framing below is SUPERSEDED —
> the task is to FINISH/GRADUATE the existing v1, not rebuild it.**
>
> **Key unblock (today):** v1 deferred the stitched single video to "Remotion Phase 2" and ships
> only a bundle + per-scene clips. The **#10 ffmpeg final-render pipeline fixed today**
> (`api/render/final.ts` `renderFinalVideo` + Phase 1 deterministic trim) IS that missing final
> stage — wire it as autopilot's last step instead of waiting for Remotion → real "one finished
> video" deliverable.
>
> **Finish plan (next session):** (1) merge PR #9 to main; (2) rebase `feat/headless-autopilot-v1`
> onto main to pick up the #10 final-render + hook/camera fixes; (3) add a stitch stage in
> `services/autopilotService.ts` calling `renderFinalVideo` after per-scene render; (4) admin
> live-smoke (`?admin=on` → Dashboard → "One-Click Ad", MrBeast, saved MarketMind report) +
> `gemini-eval`; (5) resolve the 3 open judgment calls in the v1 handoff (hide wizard? reaper cron?
> AI-judge self-check?); (6) ungate from admin → wire the paid "Autopilot" tier.
>
> Sections below are the original (now redundant) from-scratch spec, kept only as a feature-
> requirements reference. Defer to the existing v1's design where they conflict.

---

**Status:** v1 EXISTS on `feat/headless-autopilot-v1` (admin-only, unmerged). Finish next session
after PR #9 merges + Gemini quota resets. (Original line below superseded by the correction above.)
Approved direction (Neil, 2026-06-05). Build next session once PR #9
(final-render pipeline) is merged and Gemini quota has reset.

## Goal
Let a subscriber get a finished video ad **without clicking through the 8-step Director
wizard**. They give minimal input; Autopilot runs the whole pipeline with smart defaults and
**one approval checkpoint** before the expensive render.

## Key decisions (made 2026-06-05)
- **Scope:** the MAIN Director flow (not the Influencer-Forge/Odyssey-as-Cron tier — that's a
  separate parked roadmap item in `post_beta_roadmap.md`).
- **Gate model: ONE checkpoint.** Auto-run Research → script → avatar → storyboard images →
  thumbnail, then **PAUSE** and show the user the script + avatar + storyboard + thumbnail with
  an **"Approve & Render"** button (plus per-asset Regenerate). On approve → render all scenes →
  consolidate voice → final MP4. Rationale: a fully-unattended run would spend ~$3-5 of Veo/Kling
  + voice before the user could catch a bad auto-pick. The checkpoint is cheap insurance and still
  feels one-click (one form in, one approve, done).

## Why it's feasible (it's orchestration, not new AI)
Every stage already exists; Autopilot is a thin orchestrator + a minimal-input form + a progress
screen + the checkpoint UI. Reuse map:

| Stage | Existing unit to call |
|---|---|
| Market Research | `generateMarketResearch` (flow `marketmind`) — services/geminiService.ts; UI `components/MarketResearch.tsx` |
| Director prefill | the MarketMind→Director handoff in `App.tsx` (`MARKETMIND_LOADED`, auto-prefill Steps 1-2) |
| Script | `generateAdScript` (flow `adscript`) — incl. the new `capHookArray` (commit 136cf0b) |
| Avatar | `generateAvatar` — geminiService.ts / `components/Step4Avatar*` |
| Storyboard + scene images | `generateStoryboard` (flow `storyboard`) + `generateSceneImage`; batch loop in `components/Step5Storyboard.tsx` (`handleGenerateAllScenes`) |
| Thumbnail | `generateThumbnail` — `components/Step6Thumbnail.tsx` |
| Video prompts | `generateVideoPrompts` — geminiService.ts (now camera-calm, commit fe29164) |
| Render all scenes | `runQueue`/`handleRenderAll` in `components/GenerateVideo/index.tsx` (per-scene model routing already auto) |
| Voice consolidate | `consolidateVoices` — services/voiceConsolidationService.ts → `api/voice/consolidate.ts` |
| Final MP4 | `renderFinalVideo` — services/finalRenderService.ts → `api/render/final.ts` (+ Phase 1 deterministic trim) |

## Smart defaults (settle exact values at build-time grill)
- **Minimal input:** hero product photo (handheld, readable label) + product/offer + price. Derive
  brand from the hero label (same as the `director-smoke` discipline). Description optional.
- **Language:** default Taglish for PH cohort (or a single toggle EN/Taglish on the input form).
- **Script strategy:** default Testimonial (or a single toggle Testimonial/MrBeast). Auto-pick
  hook variation 0 (contrarian) at the checkpoint, user can switch to hook 1.
- **Avatar:** derive gender/ethnicity/age from the MarketMind `winningAvatar` audience.
- **Aspect:** 9:16. **Voice:** "Pinay Spokesperson" (or first Filipino-library voice).
- Use the new **direct GenerateVideo→AI Editor** path (Phase 1) so voice is consolidated once.

## Architecture sketch
- New module `activeModule === 'autopilot'` (App.tsx switch) + `components/Autopilot/`:
  - **Input form** (minimal fields + hero upload + EN/Taglish + Testimonial/MrBeast toggles).
  - **Orchestrator** (a hook/service that runs the stages sequentially, persisting run state so a
    refresh/auth-blip can resume — reuse `wizardSessionStore` patterns; the 8-step state already
    lives in App.tsx, so Autopilot can drive the same state setters rather than duplicating).
  - **Progress screen**: stage list with live status (Research ✓ → Script ✓ → Avatar … ).
  - **Checkpoint screen**: script (pick hook), avatar, storyboard grid, thumbnail + Approve & Render.
  - **Render screen**: reuse the GenerateVideo pipeline progress + the Final Render panel.
- **Failure handling:** per-stage `retryWithBackoff` already exists; add resumability + a per-scene
  auto-retry on the 502/transient (the deploy-at-7/8 gap is relevant here — Autopilot must not
  proceed to final on a partial render). **Pace Gemini calls** (sequential + backoff) to avoid the
  per-key 429 that blocked the 2026-06-05 re-smoke.
- **Cost/metering:** one run = 1 `reports` (marketmind) + 1 `workflows` (adscript) + image gens +
  N `video_ads` + voice. Gate Autopilot to the appropriate tier (Pro+/Business/Autopilot) via the
  real `useSubscription` plan check (NOT `localStorage.grifon_admin`). Add a pre-run cost summary.

## Open questions for the build-time grill-me
1. Exact minimal input set (is price required? auto-derive brand from label always?).
2. Language + strategy: fixed defaults vs a 2-toggle form vs auto-detect.
3. Which tier(s) get Autopilot, and the cost guard / monthly cap interaction.
4. Partial-failure UX at the render stage (auto-retry N times, then surface which scene failed).
5. Does the checkpoint allow editing the script text, or only regenerate/approve?

## Dependencies / sequencing
1. **Merge PR #9 first** (the final-render pipeline + Phase 1/2 fixes Autopilot depends on).
2. Then plan Autopilot via `grill-me` → `EnterPlanMode` (it's a new module = architectural).
3. Build as a vertical slice (input → orchestrate → checkpoint → render → final), reusing the
   functions above. Estimate: ~2-4 days for v1 (mostly orchestration state + the 2 new screens).

## Verification
Drive Autopilot end-to-end with a real hero (director-smoke discipline): minimal input → confirm
auto-Research/script/avatar/storyboard/thumbnail → checkpoint shows correct assets → Approve →
8/8 render → single voice pass → final MP4 (lip-sync, trimmed, hook intact). Confirm tier gating +
cost summary + resumability (refresh mid-run resumes).
