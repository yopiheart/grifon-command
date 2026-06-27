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
