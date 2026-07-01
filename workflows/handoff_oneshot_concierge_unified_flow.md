# Handoff: Unified One-Shot + Concierge consumer flow (Path B) → smoke test

**Resume in one line:** Build the real consumer flow —
`intake → Running → storyboard approval → First Cut` — using Fable 5's recovered
Running + First Cut screens, so users NEVER see the 8-step wizard. Then run the SIGLA
end-to-end smoke test. Start next session with **`/clear` then `/grill-me`** pointed here.

Created 2026-07-01. Owner: Neil. Related: [concierge_director_plan.md](concierge_director_plan.md),
[oneshot_flow_fixes.md](oneshot_flow_fixes.md),
[handoff_2026-06-09-one-shot-ad-v1.md](handoff_2026-06-09-one-shot-ad-v1.md) (Fable 5's original).

---

## Status as of 2026-07-01 (what's DONE)
- **Fable 5's One-Shot Running + First Cut screens RECOVERED** and previewable with
  **zero API** at `/one-shot-flow-preview.html` (`npm run dev`). On branch
  **`feat/oneshot-firstcut-recovery`** — **PR #41**.
  - `components/OneShotAd/FirstCutScreen.tsx` (review: hero video + reshoot film-strip + flag/free-takes)
  - `components/OneShotAd/RunningScreen.fable5.tsx` (Building screen w/ live scene gallery)
  - `components/OneShotAd/previewMock.ts`, real `osa-*` keyframes in `index.css`
  - `services/autopilotOrchestrator.ts` — **types-only** (`AutopilotRun`)
- **Full Fable 5 autopilot ENGINE preserved** (build-safe, excluded from tsc, NOT wired):
  `components/OneShotAd/_fable5-recovered/` (orchestrator runtime + deps + run store + test + container + README).
- **8-step wizard locked to admin/dev-only** (`App.tsx` `directorUnlocked = devUnlock`).
- `restore-gh.ps1` ASCII bug fixed. `gh` recovery path proven (auth as `yopiheart`).

## The TARGET flow (One-Shot AND Concierge share Running + First Cut)
1. **Intake** — the ONLY thing that differs between modes:
   - **One-Shot** = current `components/OneShotAd/LaunchScreen.tsx`: offer/brand/price/niche/format/strategy
     + assets + presenter + settings + voice → **AUTO market research → AUTO script**.
   - **Concierge** = current `components/ExpertMode/*`: businessType + brand/product + **custom script**
     (ScriptStudio) + **per-scene shot direction** (SceneDirection) + assets + presenter + settings + voice.
     **NO market research, NO auto-script** (user brings the script).
2. **Running** (Fable 5 screen) — pipeline builds live; storyboard scene gallery fills in.
3. **Storyboard approval gate** — user verifies/regenerates the storyboard scene IMAGES and
   **approves BEFORE the expensive video render** (cost + quality gate — Neil's explicit ask).
4. Pipeline continues: thumbnail → video generation → voiceover → edit/assemble → final render.
5. **First Cut** (Fable 5 screen) — finished video: **download / reshoot a scene / make another.**
   Review/feedback lands here (see the `post-delivery-tip-feedback` branch).

## THE CORE REQUIREMENT (Neil, verbatim intent)
Every intake input — **details, assets, settings, voice** — must be **acknowledged / threaded
through every stage**: market research → script → storyboard → thumbnail → video generation →
final edit. Fable 5's orchestrator threads one `AutopilotInput` through all stages by design →
**this is the reason to revive/adapt that engine** (it structurally guarantees nothing is dropped).

## Open decisions to settle in `/grill-me` BEFORE building
1. **Storyboard approval** — its own screen, or a gate-state on the Running screen?
2. **Engine** — revive/adapt Fable 5's orchestrator (threads inputs, resumable, per-scene reshoot,
   in-flow final render — but abandoned; won't compile against current `main` as-is) **vs** extend the
   current `useOneShotGeneration` (works today, but hands to Step 8, no in-flow final render).
   *Lean: adapt Fable 5's — it's purpose-built for this exact flow.*
3. **Two reshoot moments?** Pre-render storyboard-image approval (step 3) AND First Cut clip reshoot
   (step 5) — keep both, or collapse to one?
4. **Concierge pipeline variant** — skip `market_research`, inject the user's custom script + per-scene
   direction; everything downstream identical to One-Shot.
5. **Reshoot economics** — Fable 5 had "2 free takes, then 1 credit." In scope now or later?
6. **Review/feedback placement** — inside First Cut vs a post-download step (tie to the tip-feedback branch).

## After the flow is built: the SIGLA smoke test (already scoped this session)
- **Mode:** Concierge · **Niche:** Product · **Avatar:** Auto-cast · 9:16 · Taglish.
- **Hero asset:** regenerate via the `codex-image` skill (`.tmp/` is wiped each reboot). Prompt:
  *"Photorealistic vertical product hero: a Filipino woman's hand holding a 60ml amber glass wellness
  bottle labeled 'SIGLA / IMMUNITY SHOT / Calamansi-Ginger-Honey / 60ml', handheld, label facing camera,
  bright Filipino kitchen bg with calamansi + ginger, commercial product photography, no text overlays."*
- **Script (hook to formula — [scriptGuardrails.ts](../utils/scriptGuardrails.ts): hook ≤12 words / curiosity gap / no brand):**
  1. Hook (talking-avatar): *"Akala ko normal na 'yung 3PM crash ko."*
  2. Discovery (product-highlight): *"Isang shot pala ng SIGLA — calamansi, luya, pulot."*
  3. Transformation (auto): *"Ngayon, buong araw akong may sigla — walang crash."*
  4. CTA (auto): *"Try mo — SIGLA ka rin. Link nasa baba."*
- **Pre-flight (director-smoke skill):** `scripts/enable-dev-unmetered-video.ps1` → `grifon_dev_unlock='1'`
  → restart `npm run dev`. Drive via the `smoke-tester` subagent (foreground). **Click the Concierge
  MODULE TILE — never the dashboard search bar.** Review scenes on the intended surface — never the
  8-step wizard StepIndicator.
- **Pass:** 1:1 line→scene · product matches hero · per-scene shot intents respected · final MP4
  assembles (trimmed + voice) · `gemini-eval` no Critical · **Neil eyeballs the renders.**

## Lessons banked this session (so we don't repeat them)
- Recovering a deleted-branch commit needs `gh` + auth; commits survive on GitHub even after branch
  deletion (use `gh api .../contents/PATH?ref=<sha>`). This project has **no build-time Tailwind** —
  it's the runtime Play CDN in `index.html`; any dev preview mounting real components must replicate
  that head (existing `dev/adPreview.tsx` dodged it with inline styles).
- **Smoke-tester rules to encode** (recurred this session): navigate by clicking the module tile, not
  the search bar; "show me the flow" ≠ "generate it" (don't fire API calls for a UI walkthrough).
