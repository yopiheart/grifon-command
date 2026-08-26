# tests/ — vitest Unit Tests

Run via `npm run test` (one-shot) or `npm run test:watch` (watch mode). vitest is the unit/integration runner (no Jest, no Cypress). Browser e2e lives separately in [`e2e/`](e2e/) and runs on **Playwright** via `npm run test:e2e` — vitest is configured to ignore `tests/e2e/**`.

## Current Coverage (refreshed 2026-07-08)

- **`unit/`** — 46 test files. Major clusters: Gemini schemas + proxy
  ([`unit/geminiService.schemas.test.ts`](unit/geminiService.schemas.test.ts),
  [`unit/geminiService.proxy.test.ts`](unit/geminiService.proxy.test.ts)); render pipeline
  ([`unit/renderFfmpeg.test.ts`](unit/renderFfmpeg.test.ts),
  [`unit/edit-decision-list.test.ts`](unit/edit-decision-list.test.ts),
  [`unit/drawPlan.snapshot.test.ts`](unit/drawPlan.snapshot.test.ts),
  [`unit/sfxVariants.test.ts`](unit/sfxVariants.test.ts), captions/transitions/presets);
  billing + quota + rate-limit ([`unit/paymongo.test.ts`](unit/paymongo.test.ts),
  [`unit/rateLimit.test.ts`](unit/rateLimit.test.ts), `quota.*`, `credits`, `modelCosts`,
  `omniBilling`); the `omni*` One-Shot cluster (~11 files); voice/timing (`voiceSelect`,
  `sceneVoiceRoute`, `spokenDuration`); telemetry (`metaPixel`, `omniTelemetry`);
  the pre-launch curtain ([`unit/launchGate.test.ts`](unit/launchGate.test.ts) — invite-code
  matching shared with `api/gate.ts`, redeemed-pass TTL/forgery, and invite-link scrubbing);
  producer checkpoint concurrency
  ([`unit/producerCheckpointConcurrency.test.ts`](unit/producerCheckpointConcurrency.test.ts) —
  the P3 parallel stage pairs against the REAL `producerDeps.persist` + a fake
  `saveRunCheckpoint` that reproduces `api/producer/run.ts`'s optimistic-revision
  semantics exactly; mocks only the transport, asserts at the checkpoint seam).
  The artifact anchor gate
  ([`unit/checkAnchors.test.ts`](unit/checkAnchors.test.ts) — runs the REAL
  `tools/artifacts/check-anchors.mjs` against a REAL throwaway git repo in a temp dir,
  with the three cited sources reduced to stand-ins holding just their anchor strings.
  Mocking git was not an option: all three false-greens this script has had were wrong
  beliefs ABOUT git, and a fake would have encoded the same belief and passed. The
  headline cases assert a control — the naive git command reports success on the very
  state the script must reject).
- **`integration/`** — 3 real-ffmpeg render harnesses (`burnin-render`, `demo-rerender`,
  `restitch-real`), gated behind `RUN_BURNIN`.
- **`regression/`** — [`regression/script-gen.regression.test.ts`](regression/script-gen.regression.test.ts),
  the live-Gemini nightly regression, gated `RUN_REGRESSION=1`.
- [`e2e/boot.spec.ts`](e2e/boot.spec.ts) — Playwright boot/render smoke: boots the app against dummy Supabase env and asserts the public pre-auth routes (`/`, `/pricing`, `/terms`, `/privacy`) mount and render without the ErrorBoundary crash fallback. Zero quota — never reaches auth or Gemini.

**Coverage gap:** components remain untested and the e2e is boot-only (no wizard walk). The bigger
proven gap is not unit coverage at all — per `agent_lessons.md`, the dominant escaped-defect class
is "CI green, broken live" (renders, audio mixes, console config), which only live smokes catch.
Don't let this list drift again: when a new cluster lands, update the line here in the same PR.

## Patterns

- `import { describe, it, expect } from 'vitest';`
- Import the unit under test with **`.js` extension**: `from '../../api/_lib/paymongo.js'`. TypeScript ESM resolution requires the `.js` even though source is `.ts`. **Don't strip the `.js`** — it will compile but fail at runtime.
- Mock external dependencies via `vi.mock()` — see [`unit/rateLimit.test.ts`](unit/rateLimit.test.ts) for Supabase RPC mocking.
- Assertions: `toBe`, `toEqual`, `toBeGreaterThan`, etc. — vitest matches the Jest API.

## Tests From Goals (not implementation)

Tests written *after* the implementation just confirm the implementation's choices — they don't catch bugs. Write tests that encode the **intent** of the feature:

- **Schema flows:** assert the JSON shape matches the declared TypeScript type, regardless of which prompt produced it.
- **Invariants:** encode the rule itself (e.g., "no motion verbs in framePrompt", "no brand names in product scenes when reference shows plain bag", "Identity Lock fields preserved across scene image prompts").
- **State machines:** assert all valid transitions and reject invalid ones (e.g., `OdysseyDay.status` LOCKED → PENDING → SYNTHESIZED).

Two additional rules (adapted from Matt Pocock's `tdd` skill, evaluated 2026-07-08):

- **No tautological tests.** Expected values must come from an **independent source of truth** — a
  known-good literal, a worked example, the spec — never computed by re-running the same logic the
  test exercises (a test that derives its expectation from the implementation always passes and
  catches nothing).
- **Test at seams.** A **seam** is the pre-agreed public boundary where behavior is observable —
  here that's the `/api/gemini/*` proxy boundary, an exported function's return shape, or the
  rendered file. Mock at seams, assert at seams; don't couple tests to internal collaborators, so
  the implementation can change entirely while the tests survive.

## Adding a Test

1. Place under `tests/unit/<feature>.test.ts`.
2. Mirror the structure of [`unit/paymongo.test.ts`](unit/paymongo.test.ts).
3. For Gemini-flow tests: mock `@google/genai` at the proxy boundary (the `/api/gemini/*` fetch), feed canned JSON, assert on parsed shape.
4. Run `npm run test` — green before commit.
