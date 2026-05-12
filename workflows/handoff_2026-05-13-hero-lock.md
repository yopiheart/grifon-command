# Handoff — 2026-05-13 Session (hero-lock)

**Created so the next-session agent has durable context after the cafe-PC reboot wipes `~/.claude/`.**

This session followed the 2026-05-12 evening session (`handoff_2026-05-12-cozy-flask.md`). That session shipped the beta-merge + 11 polish commits and ended with the Decision Gate test pending. This session ran the Decision Gate test, found 4 architectural bugs, shipped 3 fixes, and parked the 4th for next session.

---

## Where we are

- **Branch:** `main`
- **HEAD:** `6a01516` (pushed, matches `origin/main`)
- **Working tree:** clean (modulo untracked debug PNGs + `.playwright-mcp/` — ignore)
- **2 commits shipped this session:**
  1. `f9a5cff` — `fix(wizard): HERO override priority + autofill cleanup`
  2. `6a01516` — `fix(generate-video): auto per-scene duration in RENDER ALL pipeline`

## Decision Gate findings (4 bugs surfaced, 3 fixed, 1 parked)

| Bug | Status | Root cause |
|---|---|---|
| **HERO vs product NAME priority drift** | ✅ Fixed (`f9a5cff`) + verified | `services/geminiService.ts` `generateSceneImage` had no priority rule between image bytes and text NAME. Strawberry HERO + Ube-Calamansi name → Scene 3 strawberry (followed image) + Scenes 4/5/7 purple (followed name). Inconsistency scene-to-scene was the worst possible outcome. |
| **Misplaced + misleading text helpers** | ✅ Fixed (`f9a5cff`) | "Include size + color + shape + label" helper from yesterday (2026-05-12) compensated for a scale bug but was the WRONG layer of the fix. Correct layer (Step 2 photo Pro Tips + HERO badge) shipped that evening. Old helpers now redundant AND actively misleading after the HERO-priority fix. |
| **Wizard's `clientDetails.offer` gets MarketMind's Big Idea sentence, not user's actual offer** | ✅ Fixed (`f9a5cff`) | `App.tsx:317` mapped `offer ← r.bigIdea` (a marketing thesis). Filipino SMB target audience comes with working offers (₱280 etc.) — they don't want a thesis filling that field. User-typed `priceOffer` from MarketResearch wasn't even persisted. |
| **`clientDetails.brandName` not autofilled at all** | ✅ Fixed (`f9a5cff`) | No `brandName` source field existed anywhere — `r.subject` is the combined product+brand string. Users had to retype brand into Step 1 manually. |
| **RENDER ALL uses single global duration for every scene** | ✅ Fixed (`6a01516`) | `config.duration` is a single state slot. Clicking through chips scene-by-scene only persisted the LAST value. `manualDurationByScene` only tracked flags, not values. RENDER ALL inherited the last value for every scene → 8s × 6 scenes when 4-6s would suffice. |
| **Veo b-roll camera prompt uses Kling-native syntax** | ⏸ Parked as **Phase 4** | `generateVideoPrompts` at `services/geminiService.ts:1496` emits `"Zoom -5, Tilt Up"` / `"Horizontal +4, Roll -2"` style directives — Kling O1's parameter format. Veo 3.1 Lite expects natural language and treats Kling syntax as noise. MrBeast (more b-roll) suffers worse than Testimonial (more talking). TUNED prompt edit, ~30 min, requires Neil approval. |

## What shipped this session (2 commits, 8 files)

### Commit 1: `f9a5cff` — HERO override + autofill cleanup

**Files changed (6):**
- [services/geminiService.ts](../services/geminiService.ts) — added `VISUAL_GROUND_TRUTH_PRIORITY` rule 2 to `PRODUCT_IDENTITY_LOCK` + rule 8 to `DUAL_REFERENCE_LOCK` (TUNED file edit, Neil-approved). Insertions only — no existing rule text deleted. Renumbered surrounding rules.
- [components/MarketResearch.tsx](../components/MarketResearch.tsx) — added `// BRAND_NAME` input field above `// PRODUCT_SERVICE_NAME`; persist `marketMindUserInputs` sidecar in `handleAnalyze` (strips `uploadedImages` to avoid bloat); removed stale "// Physical product? Include size + color + shape + label..." helper.
- [components/Step2BusinessInfo.tsx](../components/Step2BusinessInfo.tsx) — cleared misplaced helper from Service/Product NAME field (it belonged on the DESCRIPTION-style field, not the NAME field).
- [App.tsx](../App.tsx) — MarketMind autofill reads `marketMindUserInputs` sidecar instead of `r.bigIdea`; sets `clientDetails.brandName` + `clientDetails.offer` from user-typed values. Backward-compatible try/catch for legacy reports without sidecar.
- [types.ts](../types.ts) — added optional `brandName?: string` to `MarketResearchInput`. No change to `MarketResearchReport` AI output schema (preserves TUNED contract).
- [workflows/post_beta_roadmap.md](post_beta_roadmap.md) — appended parked item #7 (OfferOptimizer as post-render rescue, not pre-render prefill).

### Commit 2: `6a01516` — auto per-scene duration

**Files changed (2):**
- [components/GenerateVideo/RenderAllRunner.ts](../components/GenerateVideo/RenderAllRunner.ts) — `RenderJob` gains optional `duration?: number`; `runQueue` uses `job.duration ?? opts.config.duration` when invoking `generateVideo`.
- [components/GenerateVideo/index.tsx](../components/GenerateVideo/index.tsx) — `handleRenderAll` computes per-scene duration via `suggestDurationForScript(scene.scriptLine, model, resolution)`; duration chips HIDDEN when scriptLine is present (replaced with `// AI AUTO-DURATION · Xs` read-only hint); chips remain visible + editable in manual mode.

## Verification status

| Phase | Status | Method |
|---|---|---|
| Phase 1 (HERO override) | ✅ Verified | Neil ran facemist 95ml wizard end-to-end. Storyboard rendered with 100% HERO fidelity across all scenes. No drift, no color override. |
| Phase 2 (autofill cleanup) | ⏳ Not user-verified yet | Quick test: run MarketResearch with BRAND_NAME = "Lola Inday's" → SEND TO DIRECTOR AI → confirm Step 1 brandName + offer autofill from sidecar. No Veo credits needed. |
| Phase 6 (per-scene duration) | ⏳ Not user-verified yet | Quick test: open Step 7 GenerateVideo → confirm duration chips are HIDDEN (replaced with `// AI AUTO-DURATION · Xs`). RENDER ALL on a fresh storyboard → check network tab for distinct durations across scenes. No Veo credits required for the UI check; credits only kick in when render actually fires. |

## Key architectural insights confirmed this session

1. **HERO image is the visual ground truth for product appearance.** Product name controls only wordmark text + variant naming + product-type confirmation. The new `VISUAL_GROUND_TRUTH_PRIORITY` rule makes this explicit in both `PRODUCT_IDENTITY_LOCK` (`referenceImageMode: 'product'`) and `DUAL_REFERENCE_LOCK` (`referenceImageMode: 'both'`).

2. **MrBeast and Testimonial use IDENTICAL product-lock rules.** Confirmed via Explore agent. The `consistencyRules` block in `generateSceneImage` is selected by `referenceImageMode` (avatar/product/both/none), NOT by `scriptType`. The visible difference in output between MrBeast vs Testimonial comes from scene-mix ratio (MrBeast = more b-roll = more Kling-syntax camera paths), not from different lock rules.

3. **Pick-your-angle picker is production-wired (not cosmetic).** State `directorAngleBrief` → `chosenAngleBrief` → `ADSCRIPT_USER_CHOSEN_ANGLE_BLOCK` at `api/_lib/prompts.ts:315-319` with hard directive *"Do NOT ignore this brief"*. Different picks produce different scripts. No fix needed.

4. **OfferOptimizer is a rescue tool, not a default autofill source.** Filipino SMB target = users with working offers already. Forcing the wizard to display a Hormozi Grand Slam offer when they didn't ask for one is hostile UX. The "build stronger offer first →" CTA on MarketResearch (shipped 2026-05-12) gives an opt-in path. Post-beta, OfferOptimizer should surface as a rescue suggestion when ads underperform (low CTR / low conversions) — parked as item #7 in `post_beta_roadmap.md`.

5. **Camera-prompt syntax mismatch is the real bug behind "static videos."** `generateVideoPrompts` b-roll directive uses `"Zoom -5, Tilt Up"` Kling syntax. Veo expects natural language. Talking template was already fixed yesterday (Phase 4g.1) to use natural-language directives; b-roll was never touched. Phase 4 in the parked list ships the symmetric fix.

6. **Smart duration math works, but RENDER ALL bypassed it.** Phase 4g.2 calibrated `words/2.5 + 0.3s` formula is intact and correct. The bug was `config.duration` being a single state slot inherited by every queue job. Phase 6 (this session) routes per-scene duration through `RenderJob.duration` so each scene gets its own AI-computed value.

## Operational issues observed (NOT code regressions)

- **`401 Unauthorized` on `/api/gemini/text`** — Supabase JWT expired after hours of session idle. Silent refresh handles most cases but the WebSocket subscription path threw `CHANNEL_ERROR` and disconnected.
- **`429 Too Many Requests` on `/api/gemini/video`** — Gemini Veo hourly rate limit hit (`"57m to resume"`).

Fix path for both: hard-refresh browser → re-auth automatically → wait for quota reset OR upgrade tier. Not code bugs.

## Pending / Next-Session Priorities (in order)

### P0 — Phase 4 b-roll camera fix (~30 min, no Veo credits to ship)

Single TUNED prompt edit at [services/geminiService.ts:1495-1496](../services/geminiService.ts#L1495). Translation table from Kling syntax → Veo-friendly natural language documented in the prior plan + Phase 4 section. Requires Neil approval per `services/CLAUDE.md` TUNED-file rule.

### P0 — Decision Gate re-run (~$5-10 Veo credits, ~30-60 min)

After Phase 4 ships, do RENDER ALL on a fresh wizard run (facemist OR Tita Marie OR a new brand). Grade:
- **Q1 voice consistency** across all scenes → decides Phase 5 voice consolidation priority (per `workflows/phase5_voice_consolidation.md`)
- **Q4 behavior-cue emotion** workaround (posture/gesture cues bypassing IDENTITY_LOCK face constraints)
- Bonus: Phase 6 per-scene duration savings should be visible in credit consumption vs prior runs

### P1 — Phase 3 Step 3 Script UX two-phase view (~1-2 hrs)

[components/Step3AdScript.tsx](../components/Step3AdScript.tsx) refactor. Add `step3Mode: 'pick' | 'review'` state. After script generates, swap to review view with `← TRY DIFFERENT ANGLE` button. No script-prompt changes. Pure UI improvement.

### P2 — Parked items (do NOT start without explicit signal)

- **Phase 5 voice consolidation** — gated on Q1 result from Decision Gate re-run
- **Phase 5 Kling 3.0 as premium tier** — post-beta only
- **Photos 2 & 3 multimodal bytes (Q3 fail)** — Phase 5.2 per `handoff_2026-05-12-cozy-flask.md` fact #5
- **OfferOptimizer-as-rescue post-render trigger** — parked item #7 in `post_beta_roadmap.md`, needs performance-tracking surface as prerequisite
- **Autofill-priority refactor** — both useEffects share `wizardPristine` guard; OfferOptimizer's autofill effectively never fires today. Will need consolidation when OfferOptimizer becomes the rescue surface.
- **Vercel route consolidation / mobile testing** — still blocked on Hobby 12-function cap
- **Step 7 model+resolution UX hint** — *"Veo 3.1 Lite at 1080p locks all clips to 8s"* — minor polish, surface when user picks that combo

## Cafe-PC reboot reminders

- `node_modules/` may need reinstall — `npm install`
- Dev server: `npm run dev` (typically binds `:5173`)
- `.env` `GEMINI_API_KEY` confirmed present this session
- ~20+ untracked `.png` screenshots + `.playwright-mcp/` are debug artifacts — `git status` will show them, ignore
- If git identity fails ("Author identity unknown"): `powershell -ExecutionPolicy Bypass -File scripts/restore-git-identity.ps1`
- `~/.claude/plans/...` files DIE on reboot — this handoff doc is the durable record
- Vercel: first-time setup still pending; mobile testing still blocked on Hobby 12-function cap

## Opening prompt for the next session

Paste this into the next conversation's first message:

```
Continuing from 2026-05-13 hero-lock session.

Branch: main HEAD 6a01516 (pushed, working tree clean).
Read FIRST: workflows/handoff_2026-05-13-hero-lock.md (full session record).

Top-line:
- Decision Gate test ran on facemist 95ml + Tita Marie marmalade. Found 4 architectural bugs.
- 3 shipped today: HERO image override priority (services/geminiService.ts VISUAL_GROUND_TRUTH_PRIORITY rule), autofill cleanup (MarketResearch BRAND_NAME field + userInputs sidecar replaces bigIdea→offer), auto per-scene duration in RENDER ALL (storyboard scriptLine drives per-job duration; chips hidden in pipeline mode).
- 1 parked as Phase 4: Veo b-roll camera prompt still uses Kling-native "Zoom -5, Tilt Up" syntax (services/geminiService.ts:1496) — needs translation to Veo-friendly natural language. ~30 min TUNED edit, requires Neil approval.

Phase 1 (HERO) verified ✅ on facemist test. Phase 2 (autofill) + Phase 6 (per-scene duration) shipped but not user-verified yet — no Veo credits needed to test, just walk the MarketResearch → SEND TO DIRECTOR AI → Step 1 flow + check Step 7 chips are hidden.

Strategic insight locked in: Grifon's target is Filipino SMB owners with working offers — OfferOptimizer is a RESCUE tool (parked item #7 in post_beta_roadmap.md), not a default autofill source.

P0 NEXT (recommended): Phase 4 b-roll camera fix → then Decision Gate re-run to grade Q1 voice consistency + Q4 behavior-cue emotion with clean output.

P1: Phase 3 Step 3 Script UX two-phase view (~1-2 hrs UI refactor in components/Step3AdScript.tsx).

Cafe-PC reboot:
- npm install if needed
- npm run dev (likely :5173)
- .env GEMINI_API_KEY confirmed present today
- If git identity fails: powershell -ExecutionPolicy Bypass -File scripts/restore-git-identity.ps1
- Vercel still blocked on Hobby 12-function cap; mobile testing deferred

DO NOT auto-execute RENDER ALL or Vercel deploy. Both need user-driven action.
```
