# Fable 5 One-Shot "Autopilot" engine — RECOVERED REFERENCE (not wired)

These files are the **original One-Shot Ad engine written by Fable 5**, recovered
verbatim from GitHub commit **`91afea9`** on the (deleted) `feat/one-shot-ad-autopilot`
branch. They are preserved here so **none of Fable 5's work is ever lost again** — the
source branch was deleted and the commits were only reachable via the GitHub API.

## Status: PRESERVED, NOT LIVE
`main` replaced this engine with the current `useOneShotGeneration` → Step 8 flow.
These files are **not imported by the app** and are **excluded from the TypeScript
build** (`tsconfig.json` → `exclude`) because they reference service signatures that
have since changed on `main`. They will not typecheck as-is; that's expected. Reviving
them live is a separate initiative ("Path B").

## Files
- `autopilotOrchestrator.ts` — the run state machine (`createAutopilotRun` /
  `runAutopilot` / `reshootScene`); advance → persist → resume → retry-then-flag.
- `autopilotDeps.ts` — `realAutopilotDeps`: the concrete service surface injected into
  the orchestrator (so tests can pass mocks with zero API spend).
- `autopilotRunStore.ts` — client-side resumable run persistence (survives reload).
- `autopilotOrchestrator.test.ts` — the unit test for the state machine.
- `OneShotAd.container.fable5.tsx` — Fable 5's One-Shot container that wires
  Launch → Running → First Cut by run status, plus the `?osaPreview=` dev hook.

Related spec/handoff: `workflows/autopilot_oneclick_spec.md`,
`workflows/archive/2026-06-09-one-shot-ad-v1.md`.

## What IS live / previewable (elsewhere)
The **screens** are recovered and wired into a zero-API preview
(`/one-shot-flow-preview.html`):
- `components/OneShotAd/FirstCutScreen.tsx` — the First Cut review screen
- `components/OneShotAd/RunningScreen.fable5.tsx` — the Running "building" screen
- `components/OneShotAd/previewMock.ts` — mock-run fixtures
- `services/autopilotOrchestrator.ts` — **types-only** (`AutopilotRun`) so the above compile
- The real `osa-*` motion keyframes live in `index.css`

## If you ever revive this (Path B)
1. Move the code files back to `services/`, drop the tsconfig exclude, and fix
   compile errors against the current `geminiService` / `types.ts`.
2. **Use the CURRENT `components/OneShotAd/LaunchScreen.tsx` for intake — NOT Fable 5's
   old LaunchScreen** (per Neil). The container here references the old intake; swap it.
   The intended shape is: current LaunchScreen → Fable 5 Running → Fable 5 First Cut.
