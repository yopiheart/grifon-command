# Session J handoff — 2026-05-24 — Glossier Smoke + GenerateVideo Bug Fixes

> **TL;DR.** Live Playwright-driven smoke test of the Phase 1b AI Editor pipeline on a real Glossier Soothing Face Mist ad got 7/8 scenes rendered before Scene 7 hit a Veo 429 hourly cap. Mid-flight Neil flagged 4 bugs. Two fixes shipped as `ecb688f` on `main` (pushed). Two remain (Bug 2 deferred for artifact-grounded fix, Bug 4 is operational by-design). EDL JSON validation deferred to a follow-up session with the fixed prompts already in place.

---

## Session arc

1. **Plan A** — manual smoke-test plan written + approved (canned 4-line MrBeast English fixture, Section 2 walkthrough, 5 assertions on exported EDL JSON).
2. **Pivot** — Neil redirected to driving the test via Playwright MCP using **real Glossier brand data** + uploaded product image (`.tmp/Glossier hero product.jpg`). This actually aligns with the original Session I handoff (Glossier was the canonical Phase 1b test fixture per Session I line 60).
3. **MarketMind ran clean** → "Overworked Metro Manila Professional" avatar + "dehydration reset" Big Idea.
4. **SEND TO DIRECTOR AI** → Step 1 prefilled correctly, Step 2 had a `[object Object]` leak in the Target Audience field (P2 — captured below).
5. **Custom script angle** (Pattern Interrupt) + **Taglish** (Neil's deliberate language choice — earlier I mis-flagged this as a bug).
6. Step 3-7 walked cleanly. Storyboard generated **8 scenes** (over the 4-scene plan budget; Neil approved the extra spend).
7. **RENDER ALL** — queue auto-routed: 3 Kling (scenes 1, 4, 6), 5 Veo (scenes 2, 3, 5, 7, 8).
8. **Scenes 1-6 + 8 rendered DONE.** Scene 7 FAILED on a Veo 429 hourly cap. Manual Re-render on Scene 7 fired another 429 immediately.
9. **Neil paused** to flag 4 bugs found in the rendered output.
10. **Plan B** (this session's commit target) — Glossier Smoke Bugs plan written + approved. Two surgical fixes designed.
11. **Bug 1 + Bug 3 fixes shipped** as `ecb688f` after Neil's explicit TUNED-prompt sign-off on Bug 3.
12. **Smoke test continuation deferred.** Browser closed during Vite restart; rebuilding wizard state to re-trigger Scene 7 + drive Signal Modulator + AI Editor would have cost another session-hour. Cleaner to ship what's done and validate EDL in a fresh session with the fixed prompts.

---

## What's in commit `ecb688f` (+7 / −2, 2 files)

| File | Change | TUNED? |
|---|---|---|
| [components/GenerateVideo/index.tsx](../components/GenerateVideo/index.tsx) | `handleRerender` now applies `autoRouteModelForType(scenePrompt.type, config.model, sceneIdx)` so single-scene re-render uses the routed model (Kling Omni for hook, Kling V3 for b-roll, Veo Lite for talking). Falls back to `config.model` when `previewItem.sceneIdx` is undefined (one-shot preview path). | No |
| [services/geminiService.ts](../services/geminiService.ts) | Option B (Talking) at line 2100 — removed `rack focus (emphasis), ` from camera-move palette + removed obsolete `Apply realistic lens breathing on focus pulls.` trailing instruction. Three camera moves remain: dolly-in, parallactic shift, aggressive handheld. | **Yes — Neil approved diff before apply.** |

Verification: `npm run build` clean (710ms). Existing tests unchanged. Live Playwright validation deferred (browser closed during Vite restart; will validate on next fresh wizard run that the model picker visibly switches per scene type on Re-render and that new `generateVideoPrompts` output contains zero "rack focus" strings).

---

## Bugs filed

### Bug 1 — `handleRerender` model routing → SHIPPED
- **Root cause:** [components/GenerateVideo/index.tsx:1122-1128](../components/GenerateVideo/index.tsx#L1122) inherited the global `config.model` (default `Veo_3.1_Lite` at [index.tsx:85](../components/GenerateVideo/index.tsx#L85)) on Re-render regardless of scene type. RENDER ALL's bulk loop already auto-routes via [autoRouteModelForType in RenderAllRunner.ts:39-49](../components/GenerateVideo/RenderAllRunner.ts#L39); per-scene Re-render didn't.
- **Symptom:** clicking Re-render on Scene 1 (hook) would have used Veo Lite instead of Kling Omni O1. Clicking Re-render on a b-roll scene would have used Veo Lite instead of Kling V3. Neil's Scene 7 Re-render today happened to be a talking scene so Veo was the correct routing — but the bug was latent for any hook/b-roll re-render.
- **Fix:** apply the same `autoRouteModelForType` call in `handleRerender`. 5-line patch. Non-TUNED.

### Bug 3 — "rack focus" in Option B (Talking) → SHIPPED (TUNED, Neil-approved)
- **Root cause:** [services/geminiService.ts:2100](../services/geminiService.ts#L2100) listed `rack focus (emphasis)` as one of 4 camera-move options for talking scenes. Flash picked it ~25% of the time. Veo 3.1 interpreted `Rack focus pull using an 85mm lens` as a literal defocus instruction → visible blur in renders.
- **Symptom (observed today):** Scenes 5 + 8 — both talking-head shots with "Rack focus pull" in the generated video prompt — had unwanted blur effects. Neil flagged both. Sample prompt from Scene 5 today: `"Ito ang sikreto para ma-reset ang balat mo, Glossier." Rack focus pull using an 85mm lens moving from the office background to the Glossier Soothing Face Mist bottle…`
- **Fix:** removed `rack focus (emphasis), ` from the camera-move option list + removed now-obsolete trailing instruction `Apply realistic lens breathing on focus pulls.` Three camera moves remain — sufficient palette. Negative-phrase alternative considered + rejected.
- **TUNED sign-off:** Neil approved the exact diff verbatim 2026-05-24 before apply.

### Bug 2 — Scene 1 hook prompt vs Start/End frame mismatch → DEFERRED
- **Neil's observation:** "The video prompt for the hook is not accurate from the generated Start frame to end frame image that triggers to make the video generated looks slop/failure."
- **Rendered MP4 URL:** `https://varoqxjccqmskzeejagn.supabase.co/storage/v1/object/sign/gemini-videos/9fa5a50d-8ba5-430e-9010-ad185dac3074/53a7ef27-dbd8-4755-bb1a-875672885bef.mp4` (signed URL — token may expire; re-render via the wizard if expired).
- **Scene 1 storyboard intent:** hook scriptLine = `"Pagdating ng 3 PM, mukha ka na bang tuyot?"` (Taglish — "By 3 PM, do you look dried up?"). Storyboard narrative: `A close-up of a digital wall clock hitting 3:00 PM, with a blurred office window background showing afternoon sunlight, a smartphone screen reflecting the light.` Visual prompt: `A close-up of a modern wall clock with the hands frozen exactly at 3:00, soft office lighting → A smartphone resting on a sleek office desk, screen illuminated, showing a time notification, morning sunlight hitting the desk surface.`
- **Hypothesis A — un-morphable frame pair:** the wall-clock → smartphone-on-desk pair has no obvious shared anchor element (silhouette, texture, color mass) that Kling Omni's anchor-bridge morph can interpolate cleanly. The storyboard prompt at [api/_lib/prompts.ts](../api/_lib/prompts.ts) Scene 1 rules may need tightening to force the storyboard to pick *morphable* Start/End frame pairs (e.g., same object transforming, same texture morphing into product, etc.).
- **Hypothesis B — prompt prose default:** despite the Option A-Hook directive at [services/geminiService.ts:2076-2083](../services/geminiService.ts#L2076) mandating anchor-transformation-first language, Flash may have defaulted to camera-motion prose because the frames don't share an obvious anchor. Could be tightened by requiring Flash to literally describe the Start Frame and End Frame content in the opening clause.
- **What's needed for fix:** the actual Flash-generated prompt text for Scene 1 (the one Kling Omni saw) + the actual Start/End frame images. The prompt and frames were in React state when the wizard was loaded; that state is lost now (browser closed). **Action for next session:** re-run the wizard up to Step 5, capture `storyboard[0]` + `seedPrompts[0]` via DevTools / `browser_evaluate` BEFORE Step 7, then design the fix (storyboard prompt strengthening vs Option A-Hook strengthening — likely both).
- **Don't bundle with the Phase 2 Remotion grill-me PRD — separate session.**

### Bug 4 — Scene 7 Veo 429 hourly cap → OPERATIONAL ONLY (no code)
- By-design per [agent_lessons.md 2026-05-13](../agent_lessons.md). Veo 3.1 enforces an hourly per-key cap.
- Queue handles 429 correctly with 1-hour cooldown (`RATE_LIMIT_WINDOW_SEC = 3600` at [RenderAllRunner.ts:66](../components/GenerateVideo/RenderAllRunner.ts#L66)).
- **Operational path next session:** wait for cooldown (window expires ~6:48 PM if hit at 5:48 PM — confirm in Vercel/Google quota dashboard before retrying). Then click Re-render on Scene 7. Once DONE, the queue's `allDone` derivation flips and SEND TO AI EDITOR ↗ appears in Signal Modulator.

### Bug 5 (P2, separate) — `[object Object]` in Director AI prefill of Target Audience
- After SEND TO DIRECTOR AI from MarketMind, the Step 2 Target Audience field auto-prefilled as `The Overworked Metro Manila Professional — [object Object]` — a stringified object leak.
- Likely root cause: the Director AI prefill code in [App.tsx](../App.tsx) is concatenating a string field with an object field somewhere without explicit `.name` / `.description` access. Look for the prefill assignment that produces the Target Audience seed value from the MarketMind report.
- **Workaround used today:** manually cleared + retyped the field via Playwright.
- **Fix scope:** small, isolated to the prefill function. Non-TUNED. Defer to a separate cleanup PR — not blocking.

---

## Carry-forward (priority order for next session)

### 0. Verify Bug 1 + Bug 3 fixes work end-to-end
Run a fresh wizard pass with any product, get to GenerateVideo, then:
- Click Re-render on Scene 1's preview → model picker should visibly switch to `Kling_O1` (was `Veo_3.1_Lite` before commit).
- Click Re-render on a b-roll scene → picker switches to `Kling_3_0`.
- Click Re-render on a talking scene → stays `Veo_3.1_Lite` (unchanged).
- After Step 7 (re-run video prompts) → grep the generated prompts for `rack focus` → should be 0 hits.

### 1. Complete the EDL JSON validation
The original Session J goal. Once Bug 1 + Bug 3 verify, re-run the smoke test (any brand — Glossier or fresh) through to Signal Modulator + SEND TO AI EDITOR. Validate the 5 brief-required assertions on the exported `edit-decision-list-<timestamp>.json`:
- `meta.scriptStyleDetected` matches intent (MrBeast / Temu / Testimonial).
- Overlay text language matches script language (Taglish for today's Glossier; English for an English script).
- `sourceVideoUrl` echoes input verbatim (defensive patch working — no `"scene_X.mp4"` placeholders).
- `sourceAudioUrl` echoes Signal Modulator's TTS URLs.
- JSON parses, top-level keys correct, `scenes.length` matches scene count.

This is the actual Phase 1b validation that today's session was meant to deliver and didn't. Cost estimate: ~$0.50 if using a 4-line canned fixture (cheaper than today's 8-scene real run).

### 2. Bug 2 — Scene 1 hook morph audit (grill-me)
Per Bug 2 section above. Two hypotheses to grill before designing fix: un-morphable frames vs camera-motion-default prompt prose. Capture artifacts FIRST, design SECOND. Likely touches both [api/_lib/prompts.ts](../api/_lib/prompts.ts) storyboard prompt AND [services/geminiService.ts:2076-2083](../services/geminiService.ts#L2076) Option A-Hook — both TUNED.

### 3. Bug 5 — fix `[object Object]` Director AI prefill
Small isolated patch in [App.tsx](../App.tsx) prefill logic. Non-TUNED. Bundle into any docs/cleanup PR.

### 4. Phase 0 — Vertex AI GCP paperwork
**Not started today.** Plan called for parallel-track during Veo render idle time (~12 min) but I was driving Playwright the whole time and didn't surface it back as a clean ask. Neil still needs to walk Section 4 of the original smoke plan (6 Cloud Console pages) — see `~/.claude/plans/resume-the-grifon-command-structured-fox.md` Section 4. 2-5 business day lag, so the sooner the better. Required for talking-head lipsync (Phase 0 → Vertex AI → Veo audio support → STS lipsync survival).

### 5. Phase 2 Remotion executor — grill-me PRD
Same status as Session I handoff. Locked at Tier A — Lean MVP. Out of scope until Phase 1b validates end-to-end (item 1 above) AND Phase 0 lands.

### 6. Original Fix 2 from Session H
Strip audio/SFX directives from `generateVideoPrompts`. Still pending. After Phase 0 lands, becomes more important. Separate session per Session H handoff.

### 7. Stale tests
10 pre-existing failures in `tests/unit/geminiService.schemas.test.ts` (9) + `.proxy.test.ts` (1). Unchanged. Track separately.

---

## What today actually delivered

✅ Two real bug fixes shipped + pushed to origin (`ecb688f`).
✅ Phase 1b EDL brain SURVIVED 7 scene renders + TTS + Signal Modulator handoff — pipeline is structurally sound through render queue. EDL call itself was never made (Scene 7 blocked Signal Modulator's `allDone` gate).
✅ 3 latent bugs surfaced (Bug 1 patch saves users from re-render model regressions; Bug 3 fix removes a 25%-frequency blur; Bug 2 surfaced + ready for proper fix; Bug 5 surfaced for cleanup).
✅ Comprehensive handoff for next session.

❌ Did NOT validate the 5 EDL assertions end-to-end (browser closed mid-flow; not enough session budget left to drive through cooldown + restart).
❌ Did NOT capture Scene 1 hook prompt + frames as React-state artifacts (browser closed before extraction — needs fresh wizard run next session).
❌ Did NOT start Phase 0 GCP paperwork (parallel-track action was missed).

---

## Tone-check note (self-critical)

Burned ~30+ min on installing ffmpeg to frame-extract the 3 rendered MP4s for Bug 3 validation when (a) Neil's observation alone was sufficient — `Rack focus pull using an 85mm lens` is deterministically a defocus instruction; the Bug 3 fix is mechanically correct from the prompt content alone; (b) the cafe internet was too slow to download ffmpeg in a reasonable time. Should have trusted Neil's observation faster and shipped the fix sooner. **Lesson for next session: when user reports a symptom AND root cause is deterministic from prompt content, ship the fix first, validate with extracted frames only if the fix doesn't take effect.** Adding this to [agent_lessons.md](../agent_lessons.md) on the next docs commit.

---

## First files to read in the next session

1. This handoff doc.
2. [`CLAUDE.md`](../CLAUDE.md) — project rules + Plan→Goal pipeline.
3. [`services/CLAUDE.md`](../services/CLAUDE.md) — TUNED-file hard rules.
4. [`agent_lessons.md`](../agent_lessons.md) — including any new entry added with this handoff.
5. `git show ecb688f` — see today's fixes.
6. The prior plan file at `~/.claude/plans/resume-the-grifon-command-structured-fox.md` — read Sections 1-3 to know the EDL smoke procedure for picking up validation next session.

If next session targets Bug 2 fix:
- Wizard up to Step 5 with any product (Glossier or simpler), capture `storyboard[0]` + `seedPrompts[0]` via `browser_evaluate` before Step 7 fires.
- Read [services/geminiService.ts:2076-2083](../services/geminiService.ts#L2076) Option A-Hook + the storyboard prompt in [api/_lib/prompts.ts](../api/_lib/prompts.ts).
- Use grill-me skill before drafting any TUNED prompt edit.
