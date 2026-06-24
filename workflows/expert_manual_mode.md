# Expert Manual Mode / "Script Studio" — design (Initiative B)

> Persisted to the repo because the planning doc lived in `~/.claude/plans/` (defreezer-wiped).
> Initiative A (the 8-step wizard re-skin onto the shared token system) is **DONE and on `main`**
> (commits `2653a71`…`6073e17`). This file is the next build, **not yet started**.

## Resume kickoff (paste this next session)

> "Continue Initiative B — Expert Manual Mode / Script Studio, per
> `workflows/expert_manual_mode.md`. Run a short `/grill-me` on the Script Studio UI
> specifics first, then propose a `/goal`. Build on the Initiative-A token system
> (StepShell/StepFooter/TitledCard/TextField/SegButton). Reuse, don't rebuild:
> `optimizeImagePrompt`, `venueSlot` routing, `manualUploadUrl`, `estimateSpokenSec`,
> `generateVideoPrompts`. Do NOT edit tuned prompts."

## Context

Marketers/experts skip Market Research; they **bring their own script** and want to **control the
storyboard scenes**, on Grifon's guardrails. The only things they control are the script and the
storyboard scenes. Investigation found most of this is **already plumbed** — this is mostly exposing
and composing existing capability, not new AI work.

## Decisions (locked with Neil)

1. **Architecture — sub-path inside Director mode (ADD a door, don't replace).** Director opens with
   a fork:
   - **"AI writes my script"** = the **CURRENT full step-by-step 1–8, untouched** (Market Research
     inject → AI script → storyboard → thumbnail → video prompts). **This door IS the owner/admin QA
     harness** (Neil tests/refines One-Shot output by running Market Research → Director → full 1–8,
     per the `director-smoke` SOP). It also stays a valid user flow. **Expert Mode does NOT remove it.**
   - **"I'll write my own → Script Studio"** = the new slim expert flow (additive).
   - **No 3rd mode.** Two user modes (One-Shot + Director); Director holds both doors. Dev/admin reach
     = existing `grifon_dev_unlock='1'` / `?admin=on` flags (App.tsx ~165, ~1385–1410) — nothing new.
   - **Build-time nicety:** default/remember the "AI writes my script" door (or a direct dev route) so
     the QA flow stays one-click frictionless.
2. **Slim expert intake** — niche + product/asset upload + script format + settings (aspect/voice/
   language) ONLY. Drop the 5 persuasion fields (audience/benefit/painPoint/separator/features); the
   user's script encodes those.
3. **Script editor — hard-cap, fixed scenes per format.** Pick format → fixed scene template; each
   scene box hard-blocks typing past its word cap, with a live word + seconds meter and a ~30s budget.
4. **Sequencing — built after the re-skin (now unblocked).**

## Flow

**Intake (slim)** → **Script Studio (scene editor)** → **Storyboard (per-scene control)** →
**Video prompts (auto)** → **Output**. Market Research skipped.

### Script Studio — scene-structured editor (hard caps)

Format sets the template (canonical, from `api/_lib/prompts.ts`): MrBeast 6 beats · Testimonial ≈ 8 ·
Temu 6–9 · Services 6 · RealEstate 6. Each scene = a beat-labeled hard-capped text box (hook ≤12 words
/ ≤2 sentences; body 7–12 words/line) + live meter (`words ÷ 2.5 + 1.0 s`) + total-vs-30s budget.
Assemble boxes → `script[]` (order preserved) → feed existing `generateStoryboard`.
- Reuse `estimateSpokenSec` (`utils/spokenDuration.ts`, 2.5 w/s + 1s pad).
- NEW `utils/scriptGuardrails.ts` = client mirror of the caps + per-format scene templates, flagged
  "mirror of prompts.ts — keep in sync." **Do NOT edit the tuned server prompt.**

### Storyboard — per-scene control (answers "how do I surface the photo I want?")

`Scene` already carries `venueSlot` (facade/kitchen/interior/exterior/view…), `referenceImage`,
`manualUploadUrl`; `utils/sceneRender.ts:76-95` anchors `servicePhotos.find(p => p.slot === venueSlot)`.
Per scene the expert can:
- (default) let Director auto-generate the visual,
- anchor a specific uploaded photo — expose a reference picker (asset thumbnails → set `venueSlot` /
  reuse existing per-scene `manualUploadUrl`, which works today: `Step5Storyboard.tsx:132-152`),
- "Direct this scene myself" — plain-language box → silently run `optimizeImagePrompt`
  (`services/geminiService.ts:2288`, Nano-Banana; has a no-image "Scene Architect" mode) → store as a
  NEW `Scene.userImagePromptOverride` → `renderSceneImages` uses it. **Never show the optimized
  prompt; show the rendered image.**

### Video prompts + output — no change

`generateVideoPrompts(storyboard, …)` (`services/geminiService.ts:2167`) already derives prompts from
the finished storyboard. Output/export unchanged.

## Reuses (do NOT rebuild)

`optimizeImagePrompt` (geminiService:2288) · `venueSlot` routing (sceneRender.ts:76-95) ·
`manualUploadUrl` per-scene override (Step5Storyboard.tsx:132-152) · `estimateSpokenSec`
(spokenDuration.ts) · `generateVideoPrompts` (geminiService:2167) · dev flags
`grifon_dev_unlock`/`?admin=on` · mode branch `directorMode` (App.tsx:165, ~1385).

## New code (small)

- `Scene.userImagePromptOverride?` (+ end-frame) in `types.ts`; honored in `sceneRender.ts` (~118/138).
- `utils/scriptGuardrails.ts` — client mirror of caps + per-format scene templates.
- Slim expert intake screen + Script Studio editor (scene cards, meters, hard caps) + per-scene
  reference/direction control in the storyboard step. Built on the Initiative-A token system.
- Director-mode entry fork ("AI writes" vs "Script Studio") in `App.tsx` — additive branch.

## Risks / verify at build time

- **R1 dropped fields downstream.** Verify `generateStoryboard` + `generateVideoPrompts` don't
  hard-require audience/benefit/etc. (or `businessInfo.product`). If they do, derive identity from the
  asset description (`describeBusinessAsset` → `productImageDescription`) or add ONE optional
  product-name line — **escalate before adding.**
- **R2 script→scene 1:1.** Ensure expert scene lines land 1:1 as `Scene.scriptLine` (thin adapter /
  pass scene count), not re-distributed by the storyboard AI.
- **R3 guardrail drift.** `scriptGuardrails.ts` mirrors prompts.ts numbers; keep in sync; never edit
  the tuned prompt to match.
- **R4 no tuned-prompt edits.** Reuse `optimizeImagePrompt` + the guardrail *numbers*; do not modify
  any tuned prompt/schema. Changing actual script rules = escalate.

## Verify (end-to-end, when built)

Dev-unlock → Director → "I'll write my own" → slim intake → pick format → scene boxes hard-cap + meter
+ 30s budget → assemble → storyboard preserves lines → per-scene reference picker anchors the chosen
photo → "Direct this scene" → accurate image, optimized prompt never shown → video prompts auto →
full ad renders. Build-gate + Neil live eyeball (OAuth-gated).

---

# BUILT + FIRST SMOKE FINDINGS (2026-06-24)

**Status:** Director's Cut is BUILT and on branch `feat/expert-mode-directors-cut` (slices 1–5 +
code-review fixes). First end-to-end real render PASSED functionally; surfaced render-FIDELITY
findings, **most SHARED with One-Shot + the 8-step wizard** (same `renderSceneImages` →
`generateSceneImage` path). Fixes NOT yet applied — this is the evidence trail + plan.

## Smoke sample (the "G! timer" run)
- Real Estate · listing archetype · 9:16 · Taglish · Pinay voice · 30s → 6 scenes (Business cap).
- Brand "Verdé Land" / listing "Verdé Heights — Tagaytay". Custom 6-beat script (all within caps).
- Assets (Codex `gpt-image-2`): uploaded Pinay presenter (FULL-BODY) + 5 listing slots
  (facade/living/kitchen/bedroom/view). Scene 4 = B-roll override + "Direct this scene" note.
- Evidence screenshots: `.tmp/dc-smoke/` (presenter + 5 slots, `scenes-grid.png`, `scene-2.png`,
  `scene-6.png`, `result-thumbnail.png`, `result-storyboard.png` [TEXT tab], etc.) — **disposable;
  re-gen from the runbook if wiped.** Runbook: `.tmp/dc-smoke/RUNBOOK.md`.

## What PASSED (don't regress these)
Reached Step 8 review; **6/6 scenes rendered** (Scene 1 = start+end pair, 768×1376 9:16); **no errors,
no 402 quota walls** (dev-unmeter); presenter identity held in the **thumbnail** + Scenes 2/5/6;
**Scene 5 (bedroom, `avatar_venue`) fully recreated — the gold-standard look**; Scene 4 B-roll content
honored in the storyboard text; the 1:1 line→scene mapping held.

## Findings (render fidelity)

| # | Where | Observation (eyeballed) | Root cause (grounded) | One-Shot shared? | Fix bucket |
|---|-------|--------------------------|------------------------|------------------|------------|
| 1 | Scene 2 | Living room reproduced ~same angle as `living.png`; presenter dropped in, slightly flatter light → **composite/photoshop feel** | `avatar_venue` mode keeps "rotation MODERATE" + `LUMEN_SYNC` (keeps upload's light); avatar not relit to scene. geminiService.ts:1995–2002 | **YES** | B (tuned) |
| 2a | Scene 6 | Building is **re-created, NOT the uploaded facade** (drifted off the real property) | venue/`avatar_venue` `PLACE_IDENTITY_LOCK` under-applied → invents a look-alike building | **YES** | B (tuned) |
| 2b | Scene 6 | Avatar **face drifted** from the uploaded presenter | uploaded presenter was **FULL-BODY → face too small to lock** | **YES** | A (non-tuned: upload guidance) |
| 3 | Scene 3 | Beat names 3 places ("living, kitchen, bedroom") but **only kitchen rendered** | **1 scene = 1 image** (hard pipeline limit); storyboard AI picks one venueSlot. Prominent in Expert Mode (user writes multi-subject beats) | partial (AI-written beats avoid it) | A (guidance) + optional B (hero-pick) |
| 4 | Scene 4 | The B-roll **"Direct this scene" note was neutralized** — venue copy-paste won over the override prompt | scene was venue-routed; `PLACE_IDENTITY_LOCK` overrode `userImagePromptOverride` | Expert-only | **A (non-tuned)** |
| 5 | Scene 1 end | End/reveal frame looked like the uploaded hero **copy-pasted**, no new angle | venue/end-frame reveal reproduces the reference | **YES** | B (tuned) |
| 6 | General | **Inconsistent** scene-to-scene: some hug the upload (composite), some over-recreate (drift); avatar lock fragile with a far source | the above, compounded | **YES** | A + B |

**Minor / to-verify:** Step 8 "// SCRIPT" tab showed an empty body in one snapshot — code renders
`finalScript.join('\n')` and the tab only shows when populated, so likely a snapshot artifact, not a
data bug (storyboard text tab + export `.ZIP` carry the lines). Confirm before treating as real.

## Fix plan (NOT yet applied — Neil-gated)

**Bucket A — non-tuned, within bounds (ship after Neil's go):**
- A1. **Directed scenes drop `venueSlot`** so "Direct this scene" recreates from the user's prompt
  instead of copy-pasting the venue photo (Finding 4). Add to the hook beside the morph-frame drop.
- A2. **Head-to-chest avatar upload sample + hint** ("bright, clear, close, iPhone — face fills the
  frame") in Expert intake; **verify/fix One-Shot's sample to match** (Finding 2b).
- A3. **Script Studio "one shot per beat" guidance** + a soft amber flag when a beat lists multiple
  places (commas + venue-words) → "shows one image; split or pick the hero shot" (Finding 3).
- A4. *(optional)* pre-upload quality nudge (warn on dark/blurry).

**Bucket B — TUNED (`services/geminiService.ts`), Neil's EXPLICIT go + `gemini-eval` regression
(Bukidnon Brew + a service brand) before shipping — affects One-Shot + 8-step too:**
- B1. Unify `venue`/`avatar_venue`: enough **camera freedom for a real new angle**, **relight the
  avatar to the scene**, a **consistent cinematic grade** — while KEEPING `PLACE_IDENTITY_LOCK`
  (anti-drift, Finding 2a) and `TIER_TRUTH` (no fake luxury). The "enhance, don't fabricate" line.
- B2. *(optional)* Auto picks the **first-named/hero subject** for a multi-subject beat (Finding 3).

**Already shipped (code-review fixes, commit `061969c`):** directed scene → single image (drops AI
hook-morph frames); filler scenes carry a prompt so they render; `overrideVideoPromptTypes`
scriptLine-fallback; parallelized `optimizeImagePrompt`.

**CMO/CD frame:** "enhance, don't fabricate" — normalize upload quality (clean bright relight,
cinematic unify) WITHOUT faking the property (real-estate misrepresentation = trust + legal risk).
Gate bad uploads at intake with a good-vs-bad sample.

## Is One-Shot/8-step "better"? (Neil's Q — important nuance)

**Same render ENGINE for all three** (`renderSceneImages` → `generateSceneImage`). One-Shot looks
better because of **GUARDRAILS (controlled inputs)**, not a different engine — and Expert Mode removed
those guardrails, so it's more exposed:
- **Script:** One-Shot's AI writes **one-visual-per-beat** → no Finding-3 multi-subject mismatch.
  Expert = user-written → can pack 3 places in one beat.
- **Avatar:** One-Shot AUTO-cast = AI-generated, clean **head-to-chest, purpose-built** → tight lock.
  Expert = user upload (full-body here) → Finding-2b face drift.
- **Context:** One-Shot's Market Research fills audience/benefit/painPoint/etc. → richer storyboard
  prompts. Expert leaves them **blank** (the script encodes them).

**The venue findings (1, 2a, 5, and 6's venue half) are One-Shot-shared ONLY for Service/RealEstate
verticals.** One-Shot **Product** ads (the common case) use **product-lock** mode (recreate AROUND the
product hero), which does NOT hit the place copy-paste/drift — so most One-Shot output is clean. This
smoke used Real Estate, the vertical that exposes the shared venue behavior.

**NOT yet A/B-verified:** the definitive check is the **F1 consistency-parity test from the orig plan**
— run the SAME Verdé Heights assets through **One-Shot (Real Estate)** and compare side-by-side. That
render was NOT run. The comparison above is reasoned from code + input differences, not an A/B.

---

# ▶ NEXT SESSION — START HERE (resume the fixes)

Context got too high to fix in the build session (2026-06-24). Everything needed to resume is in THIS
file — no re-discovery required. The defreezer wipes everything except the git repo, so:

**State to reload:**
- Branch **`feat/expert-mode-directors-cut`** (9 commits, `ad9f0a8`→`061969c`): Director's Cut BUILT,
  build+tests green, brand-checked, **zero tuned-file edits**. First smoke PASSED functionally.
- **Nothing is fixed yet** from the Findings table above — that's the next-session work.
- Evidence screenshots in `.tmp/dc-smoke/` are **gone after a reboot** (disposable); re-generate the
  INPUT assets from `.tmp/dc-smoke/RUNBOOK.md` if you need to re-smoke. The findings are captured in
  WORDS in the table above — you do NOT need the screenshots to do the fixes.

**Do, in order:**
1. **Bucket A (non-tuned, ship first — no escalation):**
   - **A1** directed scenes drop `venueSlot` (hooks/useExpertGeneration.ts — beside the existing
     morph-frame drop where `userImagePromptOverride` is set). Fixes Finding 4.
   - **A2** head-to-chest avatar upload sample + hint in `components/ExpertMode/IntakeScreen.tsx`
     (presenter tile); **verify/fix One-Shot's sample** (`components/OneShotAd/LaunchScreen.tsx`
     presenter intake) to match. Fixes Finding 2b.
   - **A3** Script Studio "one shot per beat" hint + soft amber flag when a beat lists multiple places
     (`components/ExpertMode/ScriptStudio.tsx` + a heuristic in `utils/scriptGuardrails.ts`). Finding 3.
   - **A4** *(optional)* pre-upload quality nudge.
2. **Bucket B (TUNED — `services/geminiService.ts` venue/`avatar_venue` rules ~L1975–2002): DRAFT the
   minimal edit, get Neil's EXPLICIT go, then `gemini-eval` regression on Bukidnon Brew + a service
   brand BEFORE shipping.** Affects One-Shot + 8-step too. Goal: camera freedom + relight avatar to
   scene + cinematic grade, KEEP `PLACE_IDENTITY_LOCK` (anti-drift) + `TIER_TRUTH` (no fake luxury).
   **Never edit this file without Neil's explicit approval (crown-jewel tuned prompt).**
3. **Verify via the parity test:** run the same assets through One-Shot Real Estate; confirm which
   findings are truly shared. Smoke = `smoke-tester` subagent (foreground); needs **dev-unlock**
   (`localStorage.grifon_dev_unlock='1'`) and, to avoid quota walls, **`GRIFON_DEV_UNMETERED='true'`**
   in `.env` (defreezer-wiped → re-add per session; the auto-classifier blocks the enable script, so
   add the line via an Edit with Neil's explicit authorization).

**Kickoff message (paste next session):**
> Continue Director's Cut render-fidelity fixes per `workflows/expert_manual_mode.md` → "NEXT SESSION
> — START HERE". Branch `feat/expert-mode-directors-cut`. Do Bucket A (non-tuned: A1 venueSlot-drop on
> directed scenes, A2 head-to-chest avatar guidance + One-Shot parity, A3 one-visual-per-beat
> guardrail). Draft Bucket B (tuned venue relight/camera-freedom) for my approval — do NOT edit
> geminiService.ts without my go. Commit each slice; build-gate + brand-check.
