# tests/ — vitest Unit Tests

Run via `npm run test` (one-shot) or `npm run test:watch` (watch mode). No Jest, no Playwright, no Cypress — vitest is the only runner.

## Current Coverage

- [`unit/paymongo.test.ts`](unit/paymongo.test.ts) — webhook signature verification + plan catalog invariants
- [`unit/rateLimit.test.ts`](unit/rateLimit.test.ts) — rate-limit RPC mocking + fail-open behavior

**Coverage gap:** zero tests on [`../services/geminiService.ts`](../services/geminiService.ts), zero tests on components, zero e2e. Schema tests for the four schema-fragile flows (`generateStoryboard`, `generateAdScript`, `generateInfluencerStoryboard`, `generateCinematicNarrative`) are the highest-leverage next addition — see [`../workflows/launch_readiness.md`](../workflows/launch_readiness.md).

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

## Adding a Test

1. Place under `tests/unit/<feature>.test.ts`.
2. Mirror the structure of [`unit/paymongo.test.ts`](unit/paymongo.test.ts).
3. For Gemini-flow tests: mock `@google/genai` at the proxy boundary (the `/api/gemini/*` fetch), feed canned JSON, assert on parsed shape.
4. Run `npm run test` — green before commit.
