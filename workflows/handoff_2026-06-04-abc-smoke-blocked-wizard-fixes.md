# Handoff — 2026-06-04 — #10 render-smoke (ABC Coffee Roasters) blocked on Veo quota + 2 approved wizard fixes

> **TL;DR:** Drove a full Director wizard smoke (brand **ABC Coffee Roasters**, Taglish Testimonial,
> 9 scenes) to validate the **#10 final-render pipeline (PR #9, branch `claude/effort-estimation-AhHqn`)**.
> Got **5/9 scene videos rendered**, then hit **Veo's hourly quota** (429). The #10 FINAL_RENDER panel
> is hard-gated on **all 9 done**, so the smoke could not complete. **This batch is written off** (lost
> API budget — Neil's call). Two real wizard-quality bugs were found, scoped, and **approved by Neil**;
> apply them next session, then re-drive for a clean smoke. The #10 *executor* itself is NOT implicated —
> lip-sync/accent/camera/voice all rendered fine per Neil's review.

## Status of the #10 gate (unchanged from `render_pipeline_voice_10.md`)
- PR #9 / Phases 1–3 **built + pushed**; **all automated gates green on the cafe PC** this session:
  `npm run build` exit 0, `renderFfmpeg.test.ts` + `sceneVoiceRoute.test.ts` = **23/23 pass**.
  (15 pre-existing `geminiService.*`/`edit-decision-list` failures remain — unrelated, expected.)
- The **only** open gate is still the **PC-gated manual render-smoke**: Consolidate Voice → Render
  Final Video → watch the MP4 (lip-sync ≤50ms, no dead-air tail, `sceneIdx` order). **Not yet run** —
  blocked upstream by provider quota, not by #10 code.

## What happened this session
1. Added + committed the **`director-smoke`** pre-flight skill (`d5bf8dc`) — auto-triggers the
   hero-FIRST / Market-Research-before-Director / never-manually-type-fields discipline. Durable.
2. Ran the pre-flight correctly: sourced a handheld hero with a TTS-safe label → **ABC Coffee Roasters**
   (cold-brew). Market Research → Send to Director → Step 1/2 **auto-prefill verified** → hero uploaded
   → Testimonial + Taglish → 9-scene storyboard → video prompts (**5 talking / 4 b-roll**).
3. Video render (GenerateVideo "Render All"): **5/9 done** (scenes 1,3,5,6,9). Blockers, both
   environment/billing (NOT #10):
   - **Kling 402 Payment Required** → Neil topped up → Kling renders fine now.
   - **Veo 429 hourly quota** → app auto-pauses, "auto-resumes in ~58m". Scenes 2,4,7,8 still queued.
4. **Architectural gotcha (important):** the path to the AI Editor FINAL_RENDER panel is
   GenerateVideo (all 9 videos) → **Voice module / SignalModulator** → **"SEND TO AI EDITOR ↗"**, which
   is gated on **`allDone`** ([`components/SignalModulator/ScenePipelineTile.tsx:73,338`](../components/SignalModulator/ScenePipelineTile.tsx#L73)).
   No partial-batch shortcut — you need **9/9** before the panel unlocks. The dashboard "Edit" tab stays
   disabled until `onSendToAiEditor` fires (`editorBatch` is null until then — [`App.tsx:1168`](../App.tsx#L1168)).

## Two APPROVED wizard fixes (Neil approved both "as written" 2026-06-04) — apply NEXT session
These touch **TUNED** scene/prompt-gen logic — already greenlit, but re-confirm the diff before editing.
**They change generated output, so verify by re-driving the wizard (Scene 6 must render b-roll; hook 5s).**

### Fix A — mouth-obstruction → b-roll (kills the Scene-6 drinking/talking morph)
- **Where:** [`services/geminiService.ts`](../services/geminiService.ts) ~line 2111, inside `generateVideoPrompts`
  **TYPE ASSIGNMENT RULES** (client-side classifier; NOT a crown-jewel server flow — leak check stays 0).
- **Add a first-priority bullet** right after `- SCENE 2+: Decide by lens engagement + script delivery context.`:
  ```
  - **MOUTH-OBSTRUCTION OVERRIDE (decide this FIRST):** If the description shows the avatar's
    mouth covered or occupied by the product or an action — drinking, sipping, mid-sip, taking a
    sip, eating, biting, applying product to lips/mouth/face, or a bottle/cup/hand at the mouth —
    classify "b-roll" REGARDLESS of lens engagement or script line. Lip-sync would morph the face
    through the obstruction; the voice-over carries the line.
  ```
- **Why anchored on action words:** `agent_lessons.md` (2026-05-26, Bug 19) — the storyboard emits
  "mid-sip"/"drinking", never lip-motion language, so the rule must match *those* words.

### Fix B — cap the hook to 5s (so the morph completes; #10 trim can't chop it)
- **Where:** [`components/GenerateVideo/index.tsx`](../components/GenerateVideo/index.tsx) — the
  Render-All job builder sets each `RenderJob.duration` from `suggestDurationForScript(...)`
  (per-scene; suggestion logic at ~L209-214). The hook always routes to **Kling_O1** (`[5,10]` valid).
- **Change:** force `sceneIdx === 0` → **5s** (deterministic cap, NOT the tuned `words/2.5+0.8` heuristic):
  `duration: job.sceneIdx === 0 ? 5 : suggestDurationForScript(...)` (snap via `getValidDurations` to be safe).
- **Why a code cap, not a prompt tweak:** `agent_lessons.md` (2026-05-29) — prefer a deterministic
  fallback over trusting the model to obey "5–8 word hook". Root cause: the 11-word Taglish hook line
  → `~5.2s` target → snaps UP to Kling's 10s. MrBeast hooks (5–8 words) snap to 5s. Not style-coded.

## Findings that need NO action
- **Transitions MrBeast vs Testimonial:** not style-coded — both draw from the same Scene-1 VFX menu
  (`api/_lib/prompts.ts`); Gemini picks per hook (ABC picked "Object Materialization"). No bug.
- **Deep-scroll:** **already merged to main** (`2e12825`, 2026-05-29) — global 2-col grid + capped
  scroll on Step5Storyboard + Step6VideoPrompts (not MrBeast-only). Our branch has it. If still seen,
  it's a *different* scroll region than those two steps — verify live which component renders it.

## Resume plan (next session — "fix now")
1. Branch `claude/effort-estimation-AhHqn`; `npm install` (ffmpeg-static); `npm run dev`. Sign in Pro/Creator+.
2. **Apply Fix A + Fix B** (above) → `npm run build` (cite exit 0) → render unit tests green → crown-jewel
   leak check 0 → commit + push.
3. **Re-drive the wizard** via the `director-smoke` pre-flight (ABC hero is at `C:\Windows\Temp\grifon-hero\hero-abc.jpg`
   if the PC didn't reboot; else re-source per the skill). Confirm at Step 7 that **Scene 6 = b-roll** and
   the **hook clip = 5s**.
4. **Render All** (Kling funded; do it on fresh Veo quota to avoid the 429) → **9/9**.
5. Voice module → **SEND TO AI EDITOR** → FINAL_RENDER → pick voice → **Consolidate Voice** →
   **Render Final Video** → watch MP4 (lip-sync, no dead-air, `sceneIdx` order). Record first-render wall-time.
6. If `jobId` returns but poll never hits `done` (only on a Vercel deploy) → flip `api/render/final.ts`
   to the synchronous fallback. Else → update `render_pipeline_voice_10.md` Status + smoke checklist, **merge PR #9**.

## Durable already (safe across a defreeze)
- PR #9 code + green gates; `director-smoke` skill (`d5bf8dc`); this handoff. The 5 rendered MP4s persist
  in Supabase (24h signed URLs) but will likely be re-rendered fresh next session anyway.
