---
name: gemini-eval
description: Grade Gemini wizard outputs (script, storyboard JSON, scene images, thumbnail, video prompts) against the tuned ruleset in services/geminiService.ts and flag every violation. Use after a regression run, after a tuned-prompt edit generates its first batch, on beta-user quality complaints, or when the user asks "is this Gemini output right?". NOT for UI fidelity (brand-check) or competitor videos (viral-autopsy).
---

`verify-changes` covers infra (build/tsc/smoke). `brand-check` covers brand fidelity (DESIGN.md). This skill covers the third leg of the check loop: are Gemini outputs honoring the rules they're explicitly tuned against?

The biggest bug class here (per `agent_lessons.md` 2026-05-06) is **wiring bugs masquerading as content bugs** — content rules can be perfect and still produce garbage if the call site never passes the gating parameter. So content-checking comes after wiring-checking, not before.

## Procedure

### Step 0 — Wiring check (before iterating on rule text)

For any rule whose output looks wrong, first confirm the rule actually fires:

1. Grep `services/geminiService.ts` for the rule name (e.g. `IDENTITY_LOCK`, `STILL_FRAME_RULE`, `LANGUAGE_LOCK`).
2. Identify the call site (which `generate*` function, which scene path).
3. Trace the call site back to the component (`Step5Storyboard.tsx`, `InfluencerForge.tsx`, etc.) — is every required parameter actually being passed?
4. The `generateSceneImage` signature has 11 positional args. The known-good reference for a fully-wired call is `InfluencerForge.tsx`. If the failing path passes fewer args than InfluencerForge, suspect wiring before content.

**If wiring is broken:** flag as `WIRING_BUG`, point at the call-site fix, do not propose rule-text edits.
**If wiring is fine:** proceed to content checks below.

### Step 1 — Read the rules

Before each eval, grep + read the relevant rule blocks in `services/geminiService.ts`. Rules drift; always read current text, never trust this skill's summary as the source of truth.

### Step 2 — Walk the checklist for the artifact type(s) the user shared

The user will paste/describe one or more of: SCRIPT JSON, STORYBOARD JSON, SCENE IMAGES, THUMBNAIL, VIDEO PROMPTS. Walk the relevant section(s) below.

### Step 3 — Classify each finding

- `CRITICAL` — rule violated, fixable at prompt or wiring level, blocks beta or breaks user trust.
- `NIT` — minor or stylistic; should fix but doesn't block.
- `KNOWN_LIMITATION` — model-level failure not fixable via prompt tuning. Don't propose grill-me; reference the locked decision instead.
- `WIRING_BUG` — content rule is correct but never fires. Fix the call site, not the prompt.
- `PASS` — rule held.

### Step 4 — Output the verdict

Use the format at the bottom of this file.

## Run as a separate critic (regression batches, post-tuning verification)

For a regression run (Bukidnon Brew, TEMU+TESTIMONIAL, future brands) or the first batch after a tuned-prompt edit lands — do **not** run this eval inline in the context that generated or tuned the output. That context carries assumptions about the work; a fresh critic does not. Tuning a standalone critic to be harsh is tractable; tuning a builder to be self-critical is not. Spawn a separate sub-agent as the evaluator:

- **Spawn it** via the Agent tool with `subagent_type: general-purpose` (a fresh context). Not `Explore` — that is a search agent, not a reviewer.
- **Hand it** the output to eval (script/storyboard JSON, scene images, thumbnail, video prompts), the relevant component path(s), and an instruction to grep the current rule text out of `services/geminiService.ts` itself. Do **not** hand it your read of the rules — Step 1 says rules drift; the critic reads them fresh.
- **A fresh agent runs Step 0 (the wiring check) better** — it has no prior assumption that the call site is wired correctly, so it actually traces the args instead of trusting them.
- **Frame it adversarially:** *"You are an adversarial output critic. Assume rules are violated until proven held. Walk every checklist item for the artifact type. Classify each finding."* Paste the relevant checklist section(s) into the sub-agent prompt.
- **The critic is report-only.** It returns the verdict (`GEMINI_PASS` / `GEMINI_PASS_WITH_NITS` / `GEMINI_FAIL` + counts). It never edits, and it never greenlights a prompt diff in `services/geminiService.ts` — a CRITICAL in tuned territory still routes to `grill-me` → Neil per "After the eval" below.

**Escape hatch:** a single one-off output the user pastes with a quick "is this right?" — inline eyeball is fine; skip the sub-agent. The separate critic is for regression batches and post-tuning verification, where self-grading bias compounds across many scenes.

---

## Checklist by output type

### SCRIPT (JSON)

- **Hook placement** — hooks land in `hook1`/`hook2` fields, not in `body[]`. Probabilistic flake — TESTIMONIAL's `0.` numbering vs MrBeast's `1.` confused the parser historically. If hook is in body, flag and recommend regenerate, not rule edit.
- **LANGUAGE_LOCK** — grep `services/geminiService.ts` for `LANGUAGE_LOCK` and check Taglish phrases against the bracketed mappings (e.g. "cafe-quality goodness → parang barista ang lasa," not "barista level kape"). Each violation cites the line in geminiService and the actual script line.
- **MANUAL-TAGALOG (added 2026-08-02 — Neil: *"Pakisama narin yan sa EVAL or checker para if ever walang makakawalang mintis"*).** Grade every Taglish line against §LANGUAGE LOCK in [`_shared/taglish-voice.md`](../_shared/taglish-voice.md). The defect this catches is **vocabulary, not ratio**: dictionary-correct Tagalog that no person says out loud. Flag `detalye · rehistrado · awtomatiko · kumpirmahin · napagkakasunduan · naitatala · nakatala · pahintulot · naka-imbak · naserbisyuhan · opisyal · ipatama · mapaparadahan · magdedesisyon · teksto`, and any 6+ syllable passive/potential verb form. Two guards on this check, both learned the hard way:
  1. **Do NOT flag a line for being pure Tagalog.** The KM-003 hook (*"Kapag nagbubuhos ka na ng timba para lang bumaba, hindi na yan barado."*) is 100% Tagalog and holds 98.5% retention at 0:03 across 7,047 viewers. Zero manual words = passes.
  2. **Do NOT propose English as the fix by default.** The tuned prompt BANS English for spec terms; `presyo → price` would be a regression. The correct fix is whichever word a real person would *speak* — sometimes English (`i-confirm`), sometimes simpler Tagalog (`nagkakasundo`).
- **Tagalog grammar** — linker `na` dropped before adjectives (`matabang kape` should be `matabang na kape`). Forced English-Tagalog hybrids (`ro-roast` → `i-roast` / `na-roast`). Voice mismatch (`nila` third-person plural in first-person testimonial line).
- **Audience as register, never as content.** `businessInfo.audience` should affect HOW the model talks (vocabulary/idiom register), not WHAT it says. If audience is named literally back to viewer ("for Filipino moms 25–40 who shop on TikTok Shop..."), flag CRITICAL — see `script_input_wiring_brief.md`.
- **Offer/separator slotting.** Per `script_input_wiring_brief.md` matrix: offer → CTA scene only (Scene 7), separator → proof scene only (Scene 5 MrBeast / Scene 6 TESTIMONIAL). If offer leaks into hook or separator leaks into CTA, flag CRITICAL.
- **Price** — never mentioned in script body. Offer STRUCTURE (scarcity, urgency, value adds) only. Bare prices = CRITICAL.

### STORYBOARD JSON

- **STILL_FRAME_RULE** — grep the rule. `imagePrompt` / `startFramePrompt` / `endFramePrompt` must contain no motion verbs (suspended, frozen, mid-fall is OK; pouring, spilling, splashing is not). Frames = stills.
- **APPEARANCE_LOCK_RULE** — avatar scene prompts contain action / expression / gaze / hands / props / pose / spot / lighting only. NO clothing, hair, body, face, ethnicity descriptors. If avatar scene re-describes appearance, flag CRITICAL — model is fighting IDENTITY_LOCK.
- **ENVIRONMENT_SYNC** — avatar scenes share residence, vary spot. Kitchen → dining → counter is fine. Kitchen → office → beach is CRITICAL.
- **AVATAR_CAMERA_ANGLES intent-awareness (P0 from 2026-05-06)** — `AVATAR_CAMERA_ANGLES` rotates angles by variationIndex but is applied unconditionally including to non-avatar b-roll scenes. If a product b-roll scene has a "talking-head close-up" framing, flag CRITICAL with note that the parked split-the-angle-pool fix is the right path.
- **TEMU `RAW_OUTPUT_RULE`** — when `scriptType === 'TEMU'`, every scene prompt must explicitly forbid embedded text/captions/prices/labels/logos. If a TEMU scene prompt asks the model to render text, flag CRITICAL.
- **TEMU `NO_HUMAN_RULE`** — TEMU storyboard: no faces, no full bodies. Hands only on Scene 4 (in-use beat). If avatar/face appears in any non-Scene-4 TEMU scene, flag CRITICAL.

### SCENE IMAGES (visual — user pastes screenshots or describes what he sees)

For each avatar scene + b-roll scene, walk these:

- **IDENTITY_LOCK held?** Face / skin / hair / wardrobe / body locked across all avatar scenes. Drift between two scenes (e.g. mustard sweater → blue chambray) = CRITICAL.
- **VARIES correctly?** Expression / gaze / pose / hands / props vary per scene per prompt. If scene 2's prompt said "looking down, brow furrowed" but scene 2 inherits the reference's smile, that's a CRITICAL signal that IDENTITY_LOCK is overriding scene-level intent.
- **Spot variation?** Different rooms in same residence per ENVIRONMENT_SYNC. Same room across all avatar scenes = NIT (boring) or CRITICAL (rule failure depending on scene count).
- **Camera angle variation?** AVATAR_CAMERA_ANGLES should produce different framings per scene (close-up, medium, head-on). If all scenes are intimate close-up, suspect wiring (variationIndex not passed, see Step 0).
- **Hand hallucination on multi-prop shots** — `PRODUCT_IDENTITY_LOCK` enforces "anatomical accuracy (2 hands, 5 fingers each)" but model violates this on multi-prop compositions (Step 6 thumbnail showed three hands). Flag as `KNOWN_LIMITATION` with note "model fights its own rule on multi-prop; thumbnail+Step6 historically affected."
- **Garbled logo/text** — Gemini Flash Image cannot reliably render typography. If a generated image contains "Coffee TWEN LADET FOUM" hallucinated text, flag `KNOWN_LIMITATION` — CMO call locked: defer to gpt-image-1 hybrid in Pro+ tier post-beta. Do NOT propose grill-me on this.
- **Hallucinated humans on b-roll** — non-Filipino faces, hands, or full bodies appearing in product-only scenes. Root cause is `AVATAR_CAMERA_ANGLES` injection into non-avatar scenes (P0 from 2026-05-06). Flag CRITICAL with pointer to the parked BROLL_CAMERA_ANGLES split.

### THUMBNAIL

- **Aspect-ratio match** — thumbnail tile and modal must use the user's `aspectRatio` selection. If 9:16 thumbnail letterboxes inside a wider container, that's the Step 6 tile aspect bug — open punch list item.
- **No avatar in TEMU thumbnails** — product hero only. If TEMU thumbnail contains avatar, flag CRITICAL and suspect wiring (avatar shouldn't be passed at all).
- **Text rendering** — same `KNOWN_LIMITATION` as scene images. Thumbnail overlay should be data, not baked.

### VIDEO PROMPTS

- **Kling motion vocabulary** — Kling 3.0 for product motion (zoom, rotation, parallax), Kling 2.6 for keyframe pairs (Scene 1 hook only). Human verbs on product b-roll = NIT (model artifact, regen usually fixes).
- **Start/end frame product continuity (P1 from 2026-05-06)** — start and end frames are independent generation calls (`variationIndex` vs `variationIndex + 100`) so prop drift is structurally allowed. If user notes the mug changed color between start and end, flag as `KNOWN_LIMITATION` with the note that this is the same drift class as character drift, applied to props — fix path is shared-reference between paired frames, not prompt tuning.

### CROSS-SCENE CONSISTENCY

- **Reference-image-passthrough suspicion** — if Scene 4 product shot looks suspiciously identical to the user-uploaded hero shot, the model may be echoing the reference rather than re-rendering. Recommend a follow-up regen with a plain-background reference to confirm whether `PRODUCT_IDENTITY_LOCK` is doing surgical extract-and-replace.
- **Director Critique coherence** — if formula is MrBeast or TESTIMONIAL, the Director Critique should tie pacing + features + persuasion-stack reasoning. Generic self-praise = NIT (parked Strategic Audit prompt rewrite).

---

## Output format

```
gemini-eval: <brand> · <formula> · <date>
WIRING (n): <call-site / param issues; fix code, not prompt>
  - Step5Storyboard.tsx:158 — variationIndex not passed; IDENTITY_LOCK never fires
CRITICAL (n): <rule violations, fixable at prompt level>
  - Scene 2 — wardrobe drift (mustard sweater → blue chambray); IDENTITY_LOCK rule 1 violated (services/geminiService.ts ~L1413)
  - Scene 1 hook end-frame — motion verb "spilling" in startFramePrompt; STILL_FRAME_RULE violated
NIT (n):
  - Scene 7 prompt ambiguity ("pointing down" — interpretable as look-down or finger-direction); regen rate could drop with tighter phrasing
KNOWN_LIMITATION (n): <not fixable via prompt; do not re-grill>
  - Step 6 thumbnail — garbled logo text; Gemini Flash Image typography limitation; CMO-locked deferral to Pro+ tier
PASS (n): IDENTITY_LOCK held cross-scene · ENVIRONMENT_SYNC held · LANGUAGE_LOCK held in Scenes 1-5
VERDICT: GEMINI_FAIL — 1 wiring, 2 critical, 1 nit, 1 known-limitation
```

Verdict scale: `GEMINI_PASS` (no CRITICAL/WIRING) → `GEMINI_PASS_WITH_NITS` (NITs only) → `GEMINI_FAIL` (any CRITICAL or WIRING). KNOWN_LIMITATION never blocks the verdict — it's informational.

---

## After the eval

If a CRITICAL pattern repeats across two regression runs of the same formula, surface it for promotion to `agent_lessons.md`. Recurring failures are the inner-loop signal.

If a CRITICAL is in a CLAUDE.md-tuned area (`services/geminiService.ts`), the next step is `grill-me` before any prompt edit — never go straight to surgical-edit.

---

## Out of scope

- **Build / tsc / smoke** — `verify-changes`.
- **Brand fidelity (DESIGN.md, GlassPanel/GoldButton, gold accent)** — `brand-check`.
- **Copy voice / hooks / CTA strategy / offer construction** — `grifon-cmo`.
- **UI rendering of Gemini outputs (Step5/6/7/8 layout, ImageModal portal, etc.)** — `brand-check` + manual smoke.
- **Generic Gemini API errors (PROXY_TIMEOUT, 429, etc.)** — infra; transient or quota; not a content eval.

## When this skill is the wrong tool

- User asks "does the build work?" → `verify-changes`.
- User asks "is this design on-brand?" → `brand-check`.
- User asks "is the CTA selling?" → `grifon-cmo`.
- User asks about a single one-off Gemini output with no rule context → quick eyeball is fine; reserve gemini-eval for regression batches and post-tuning verification.
