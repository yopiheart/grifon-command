# Workflow — Figma Motion → Grifon UI handoff

**Layer:** Workflow (WAT). **Owner:** `grifon-creative-director`. **Status:** active.

## When to run

When app UI motion (a micro-interaction, an entrance, a loading state, a modal beat) is being
**designed in Figma Motion** and needs to land as real `motion@12` React code in this repo. This is
the design→code bridge for *our own app's UI* — NOT for the generated ad pipeline (Veo/Kling +
ffmpeg own that; see the Figma Motion evaluation in
[the plan archive] and `api/_lib/renderPresets.ts`).

## Why this exists

Figma Motion (launched 2026-06-24) puts an animation timeline on the design canvas and exports
**MP4/GIF/WEBM/SVG** previews plus **CSS / JSON / React / `motion.dev`** code, inspectable in Dev
Mode and reachable by external coding agents over its **MCP server**. That export path lines up
exactly with what [grifon-creative-director](../.claude/skills/grifon-creative-director/SKILL.md)
already does ("drop a Figma file → how would you build this"). The risk: pasting Figma's raw code
re-introduces the inline-timing drift we just consolidated. This SOP closes that loop — Figma
defines the *motion intent*, our tokens define the *values*.

## Tier note (from the launch brief)

Motion's AI design agent and full design-system library integration are **Paid-plan only**; Starter
gets limited exports, Full Seat gets motion primitives/exports. Plan the workflow around whichever
seat the team actually holds — don't assume the AI agent is available.

## Steps

1. **Design / receive the motion in Figma Motion.** Keyframe it on the canvas, or accept a frame
   Neil shares. Align early via a quick MP4/GIF export rather than describing it in prose.
2. **Inspect, don't trust, the export.** Read the timing in Motion's Dev Mode (or the React /
   `motion.dev` / CSS output, via MCP if wired). Capture the *intent*: which properties animate,
   the rough duration, the easing character (snappy vs expressive vs ambient loop), spring vs tween.
3. **Map intent → tokens.** Translate to [components/ui/motionTokens.ts](../components/ui/motionTokens.ts):
   - duration → nearest `DUR.*` tier (loops → `DUR.ambient.*`)
   - easing → `EASE.out` / `EASE.inOut` / `EASE.expressive` / `EASE.veil`
   - spring → `SPRING.pop` / `standard` / `snappy` / `overshoot`
   If nothing fits and the feel is genuinely new, propose a **new token** in `motionTokens.ts` +
   DESIGN.md's Motion section — do not inline a one-off raw number.
4. **Build the component** with `motion/react`, consuming the tokens. Reuse `components/ui/`
   primitives (GlassPanel/GoldButton). Keep the `useReducedMotion()` guard + `reducedMotion()`
   helper on every animated element.
5. **Verify** per [the verify-changes skill]: `npm run build` (build-gate), then `brand-check`
   (it lints transition values against the DESIGN.md Motion section), then a foreground
   `smoke-tester` pass confirming the animation plays and reduced-motion still disables it.

## Guardrails

- **No raw inline timing.** Every duration/easing/spring resolves to a token (step 3).
- **Vocabulary:** Figma "keyframes" ≠ Grifon `startFramePrompt`/`endFramePrompt` (those are image
  prompts). Don't let Motion's terms leak into the scene data model or
  [UBIQUITOUS_LANGUAGE.md](../UBIQUITOUS_LANGUAGE.md).
- **App UI only.** Generated ad output is out of scope — that paradigm fights the AI-native pipeline.
