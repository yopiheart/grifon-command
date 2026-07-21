---
name: img2threejs-lab
description: The 3D asset foundry — turn a product photo or brand mark into an
  interactive procedural Three.js scene via the upstream img2threejs staged
  pipeline (clone-on-demand), for landing-page centerpiece prototypes,
  client-flex interactive product artifacts, and turntable b-roll experiments.
  Use when Neil says "make this 3D", "spin it", "3D the griffin/product", or
  wants an interactive WebGL asset. NOT a product feature lane (users never get
  this), NOT for generating/editing 2D images (codex-image), NOT for analyzing
  ads (static-autopsy).
disable-model-invocation: true
---

# img2threejs Lab — the 3D asset foundry

Internal WAT-layer skill (same class as `ai-editor` / `codex-image`): produces
3D assets for Grifon's OWN marketing and for client-flex deliverables. It wraps
the upstream **img2threejs** pipeline (github.com/hoainho/img2threejs, MIT,
adopted at v1.2.0 on 2026-07-21), which rebuilds the object in a reference
image as **code-only procedural Three.js** — staged sculpting passes, quality
gates, and agent-vision review. Not photogrammetry, not a hosted API.

**Architecture truth** (concierge_director_plan.md §2): each conversion is a
multi-stage agent session. The production app can NEVER call this skill —
there is no "user uploads photo → gets 3D viewer" path through here. If a
product-facing image-to-3D feature is ever wanted, it goes through a hosted
API evaluation (parked in `workflows/post_beta_roadmap.md`) via grill-me →
Neil → code-executor.

## Setup (clone-on-demand, defreezer-proof)

Nothing is vendored. Upstream churn can't break our repo; this doc survives in
the repo, the clone is disposable:

```bash
git clone --depth 1 https://github.com/hoainho/img2threejs .tmp/img2threejs
```

Then **read `.tmp/img2threejs/SKILL.md` and follow it as the operating
manual** — intake probe → pre-spec assessment gate → detail inventory →
sculpt spec (+ strict validation) → locked build passes (blockout → structure
→ form → material → lighting → interaction → optimization) → screenshot
review gate per pass. Scripts are Python 3.10+ stdlib only (`forge/…`), run
from the clone root. If upstream's SKILL.md contract looks materially changed
from v1.2.0, flag it to Neil before relying on it.

## Grifon rules (layered on top of upstream's gates)

1. **Isolation first.** The reference must be the subject alone on a clean
   white/transparent plate before intake — floor clutter and backgrounds
   poison the spec. If the source isn't clean, cut it out via `codex-image`
   (cafe PC) or a Gemini image-edit pass; already-clean assets (e.g.
   `public/griffin-emblem.png`) skip this.
2. **Multi-angle for complex geometry.** Anything non-symmetrical or
   hardware-like needs overhead + perspective references, not one glamour
   shot. One image = state per-region confidence, don't fake hidden sides.
   Honesty rule inherited from upstream: "this cannot reach the requested
   fidelity from this image" is a valid result; say **stylized** when it's
   stylized.
3. **Renders go through `smoke-tester`** (foreground) — never drive Playwright
   in the main loop. The subagent loads the demo page, captures the review
   screenshots at the requested viewpoints, and returns only findings +
   image paths.
4. **Delivery = Artifact.** Bundle the scene self-contained (e.g.
   `npx esbuild --bundle --minify` with `three` from a scratch
   `node_modules`, inlined into one HTML — CSP blocks CDNs). If the page
   gets unwieldy, fall back to a screen-recorded turntable mp4 via
   `SendUserFile`. Never put client-confidential material in an artifact
   without Neil's OK.
5. **Bundle firewall.** `three` NEVER enters `package.json` or the app bundle
   from this skill. A landing-page integration is a separate Neil-approved
   plan (lazy-loaded, landing-route-only, CSS fallback, must pass
   `check:bundle-leak` and `brand-check`) delegated to `code-executor`.
6. **TUNED freeze.** Never touch `services/geminiService.ts`,
   `api/_lib/prompts.ts`, `api/_lib/renderPresets.ts` from this skill.
7. **Commit what's durable** (cafe-PC defreezer): the sculpt spec, generated
   factory `.ts`, and demo HTML for a keeper asset go to
   `assets/3d-lab/<object-slug>/`; `.tmp/` artifacts are disposable. Brand
   assets follow DESIGN.md's world (zinc-950 canvas, Grifon Gold #FFCC00
   lighting accents) unless the client's brand says otherwise.

## Use cases (value order)

- **Landing centerpiece prototype** — candidate 3D hero (e.g. the griffin
  mark), eyeball-gated via Artifact BEFORE any integration plan exists.
- **Client-flex product artifact** — "here's your product, spin it": an
  interactive orbit/zoom scene of a client's product as a sales wow.
- **Turntable b-roll** — screen-record the scene for ad b-roll experiments
  (hand off to `ai-editor` for the edit lane).

## Out of scope / wrong tool

- Generating or editing 2D images → `codex-image`.
- Analyzing competitor stills/videos → `static-autopsy` / `viral-autopsy`.
- Any product-code integration → gated proposal + Neil + `code-executor`.
- Driving the app wizard for tests → `director-smoke`.
