# Hyperframes (HeyGen) — Evaluation Decision

**Status:** DECIDED 2026-07-22 (Neil-approved) — workflow-layer pilot endorsed, product adoption rejected.
**Deciders:** Neil + Claude (Fable 5) + GPT 5.6 Sol (consulted per Neil's request; full memo re-derivable — Sol independently read `omniPresets.ts`, `vercel.json`, the 2026-06-08 burn-in handoff, and Hyperframes' own Vercel template + rendering docs).
**Subject:** [github.com/heygen-com/hyperframes](https://github.com/heygen-com/hyperframes) — Apache 2.0, LLM writes plain HTML/CSS/JS with `data-*` timing attributes; deterministic engine (headless Chrome + FFmpeg) freezes the clock, seeks frame-by-frame, screenshots, encodes MP4. `npx hyperframes init/preview/render`, Node 22+, ships ~19 agent skills, exports **transparent overlays**.

---

## The verdict

| Surface | Decision |
|---|---|
| Product FINAL_RENDER (`api/_lib/renderFfmpeg.ts`) | **NO — frozen.** Tuned + shipped; browser rendering doesn't fit the Vercel lambda (Hyperframes' own Vercel template provisions Vercel Sandbox; their ~11s example ≈ 2 min on 4 vCPUs / 3 Chrome workers; our route is capped at 300s). Also a security wall: LLM-authored HTML/JS in a multi-tenant renderer = executable untrusted content (SSRF, runaway compute). |
| FFmpeg caption engine | **NO — do not reopen** the 2026-06-08 burn-in-over-Remotion decision. The caption system is not just a font renderer (forced-aligned timing, face-safe bands, SFX restraint, loudnorm, fallbacks). |
| Neil's own marketing production (`ai-editor` skill lane) | **YES — pilot.** Sol score: product 1/5, workflow pilot 4/5. Same "HTML as the text/graphics layer" pattern already validated in-repo for stills (`utils/captureToPng.ts` / ImageAdsGen, `tools/render-social.mjs`), extended to motion. |
| Gemini Omni Flash edits | **NOT obsolete — narrowed.** Omni keeps generative-pixel work only (restyle, relight, subject-aware motion, paper-collage). Browser-shaped work (kinetic typography, UI cards, editorial inserts, behind-subject matted captions) is contestable by Hyperframes for free — Omni must earn every paid $0.10/sec. `premium-reel-v2` + `vox-explainer-v1` are the most at-risk presets; test, don't assume. |

Swipe-file evidence backing the workflow fit: **S20 Product-UI-as-hero** (20 corroborations) and **P11 UI pop-up card proof device** are exactly browser-shaped graphics; the stalled `creator-ui-pop-v1` Omni draft (gate-failed on hex leak) is deterministic and free in HTML.

## Pilot plan (not started — no code/install yet)

1. **Move 1 — one real launch/demo video** through the `ai-editor` lane: product-UI-as-hero sequence, exact pricing/offer graphics, one talking-head treatment. Hyperframes renders visual layers → existing FFmpeg layer finishes audio/captions/master (transparent-overlay handoff; FFmpeg keeps final authority).
2. **Move 2 — three-way bake-off** on one 6–8s talking clip: Omni `premium-reel-v2` vs Hyperframes (matted behind-subject type + punch-ins, via their embedded-captions skill) vs FFmpeg baseline. Log per-move ownership verdicts into `workflows/omni_edit_presets.md`.
3. **Move 3 — reusable alpha-motion kit** (UI-card reveal, stat hit, lower third, non-text transition) authored in Hyperframes, consumed as transparent assets by FFmpeg — same pattern as the existing `sweep.png`. **No prices/₱/captions in the kit.** This is the ONLY path by which Hyperframes output may ever (indirectly) reach the product — as static assets, never as a runtime.

**Pass criteria (Move 1) / stop condition:** must beat the current process on finished-video quality, revision count, exact-text integrity, and total founder time — "it rendered" is not a pass. If Move 1 fails these, **drop Hyperframes entirely.**

## Guardrails & traps

- **Name collision:** `workflows/believability_dna.md` uses "hyperframes" as an internal Surface-A caption/motion element — unrelated to HeyGen. Before adoption, rename ours or add an UBIQUITOUS_LANGUAGE disambiguation entry.
- **Defreezer friction:** matting pulls ~168 MB of model weights; tooling leans Bash/`uvx`; fast-moving 0.x dependency. If the pilot passes, add `scripts/restore-hyperframes.ps1` (restore-codex pattern) before relying on it.
- **One design system:** any motion kit consumes DESIGN.md tokens (Grifon Gold `#FFCC00`, zinc-950, Inter Black). `components/ui/motionTokens.ts` stays app-UI-only per its own guardrail.
- **Roadmap note:** if the parked "Remotion Lambda final-render executor" (post_beta_roadmap §10) ever revives, Hyperframes supersedes Remotion as the candidate (plain HTML > framework-specific React for LLM authoring).

## Resume trigger

Next session on this: invoke `/ai-editor`, re-read this file, start Move 1 (or Move 2 if a suitable talking clip + Omni budget are on hand). Install is `npx hyperframes init` in a scratch dir — do NOT add it to the product `package.json`.
