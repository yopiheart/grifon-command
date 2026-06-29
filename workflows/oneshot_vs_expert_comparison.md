# One-Shot (auto) vs Expert/Director's Cut (manual) — render comparison + improvement list

**Owner:** Neil. **Date:** 2026-06-25. **Verdict: One-Shot wins.**
**Test:** identical Verdé Heights — Tagaytay RealEstate assets (head-to-chest Pinay presenter + 5 listing
photos: facade/living/kitchen/bedroom/view) run through BOTH modes. Expert = hand-written custom script;
One-Shot = auto (Market Research → AI script → storyboard, Grifon formula/guardrails). Renders on the
Bucket B tuned venue/`avatar_venue` relight (branch `feat/expert-mode-directors-cut`, commit `b3638a3`).

## THE ONE INSIGHT (most important finding)

**Same engine. Same Bucket B relight. The only difference is INPUT DISCIPLINE — and that's the whole game.**

Smoking gun = the balcony handrail:
- **Expert Scene 4** (manually "Directed"): handrail rendered **wood**, background mountains drifted — WRONG.
- **One-Shot Scene 2** (auto, same `view.png`): handrail is the **real black metal**, view 100% matched — PERFECT.

Cause: **"Direct this scene" drops the photo anchor** (the A1 fix — directed scenes recreate from the
user's *words*, not the photo) → it invented a wood rail. One-Shot **anchored the real `view.png`** (venue
mode) → Bucket B relight applied *on top of the real photo* → 100% fidelity.

> **Anchor a photo → perfect. Direct with text → drift.** This single mechanic explains nearly every
> difference between the two renders.

Second factor: **auto-mode used ALL 5 uploaded assets** (7 scenes incl. b-roll). The **custom Expert script
skipped the bedroom** (no beat mentioned it). The AI maps one photo per beat; a human writing freehand
doesn't. **The guardrail advantage, proven on camera.**

Conclusion: **One-Shot isn't a better engine — it's better inputs.** This validates Grifon's core thesis:
controlled inputs + the formula = consistent, professional output every time.

## Per-scene record

### One-Shot (auto) — the winner
1. Facade end-frame — ~95% accurate building, warm relight + slight new angle + people added. Anchored, excellent.
2. Avatar @ balcony/view — view 100% (black metal rail correct), relit. **DEFECT: avatar in profile / half-face.**
3. Avatar @ living room — character consistency perfect, relit, anchored to `living.png`.
4. Kitchen b-roll — 100% faithful to `kitchen.png`, relit. ("Insane / perfect.")
5. Avatar @ kitchen — kitchen anchored 100%, relit; face-consistency slightly uncertain.
6. Bedroom b-roll — near-flat repro of `bedroom.png` (camera-freedom timid here); fine for an establishing shot.
7. Avatar @ facade — character + facade + new angle all strong. ("God mode.")

### Expert (manual custom script)
1. Facade end-frame — new angle + formula relight, but ~80% structural match (camera-freedom vs pixel-lock tradeoff).
2. Talking avatar — PERFECT (consistent avatar + clothing).
3. Kitchen — recreated in new light but fixtures drifted (missing sink/`lababo`, missing stove knob).
4. Directed b-roll — handrail wrong (wood vs real black metal), background drifted (directed → anchor dropped).
5. B-roll flyer — facade 100% accurate (flat repro on a printed flyer = pixel-perfect).
6. Talking avatar — 100% character/clothing; warm interior light (correct per-scene relight, NOT a flaw).
- Bedroom photo unused (custom script never referenced it).

## What made BOTH look good
- **Bucket B confirmed working on both** — avatar relit into each room, new camera angles, identity locked.
- **Photo-anchoring = 100% fidelity** wherever a scene anchors the real upload (One-Shot 1/2/4/6; Expert flyer 5).
- **Character consistency strong on both** — the standardized head-to-chest presenter did its job.

## Improvements — ONE-SHOT (winner; polish only)
1. **#1: talking-avatar scenes must frame the face TOWARD camera (frontal / 3-4).** Scene 2 rendered her in
   profile / half-face → risky for the video stage (face can morph when she turns to camera if the still never
   captured the full face). Most critical for RE (agent credibility). *(Candidate tuned storyboard rule — see below.)*
2. Scene 6 bedroom barely changed angle (near copy). Camera-freedom was timid there — minor; fine for b-roll.

## Improvements — EXPERT / MANUAL (guidance, NOT engine)
The Expert residuals are self-inflicted by the manual path, not engine bugs:
1. **Anchor-photo nudge (non-tuned):** when an expert "Directs a scene" that has a matching uploaded photo, warn
   *"directing recreates from your text — anchor the real photo for an exact match."* (Flyer + One-Shot prove flat-anchor = 100%.)
2. **Use-all-your-assets nudge (non-tuned):** Script Studio flags *"you uploaded a bedroom photo but no beat uses it — add one?"*
   so manual users get auto-mode's asset discipline.
3. **Facade ~80% on new angles** — accepted tradeoff (camera-freedom vs pixel-lock). Leave it.

## CMO take
- **One-Shot is the ₱30K-agency-killer, proven.** Upload photos → pick niche → one tap → 7 consistent, on-brand scenes
  that use every asset, zero scripting skill. **This is the product. Lead with auto-mode as the default.**
- **Expert mode is the power-user lane** — control = responsibility. Output only matches One-Shot when the expert
  anchors photos + uses all assets. So **Expert's job is to TEACH that discipline (the two nudges above)** — not change the engine.
- **Do not touch the engine to "fix" Expert.** Fix the guidance. The engine already won.

## TUNED candidate — FLAG ONLY (needs Neil's explicit go + `gemini-eval` regression)
- A storyboard-prompt rule: *talking-avatar scenes frame the face toward camera (frontal/3-4, full face captured).*
  Lives in the tuned `geminiService.ts` / `api/_lib/prompts.ts`. **Do NOT edit without explicit approval + a
  Bukidnon-Brew-clean + RE/Services `gemini-eval` pass.** Affects One-Shot + Expert + 8-step.

## Bucket B status (unchanged by this comparison)
Bucket B verified working on both renders. Remaining pre-merge gates still open: Bukidnon Brew product no-regress +
a structured `gemini-eval`. See `workflows/expert_manual_mode.md`.
