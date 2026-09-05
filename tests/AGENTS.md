# Test instructions

These rules apply to `tests/` in addition to the repository root instructions.

- Vitest owns unit/integration tests: `npm run test` or `npm run test:watch`.
- Browser E2E uses Playwright via `npm run test:e2e`; Vitest ignores E2E files.
- Keep `.js` extensions in imports from TypeScript source. Node ESM runtime
  resolution requires them.
- Mock external systems at public seams and assert behavior at those seams.
- Expected values must come from an independent specification, worked example,
  or known-good literal; do not recompute expectations with the implementation.
- Put new unit tests under `tests/unit/<feature>.test.ts`.
- Live Gemini and real-render suites stay disabled unless the user explicitly
  approves them. In ordinary verification leave `RUN_REGRESSION`, `RUN_BURNIN`,
  and other paid/live switches unset.
- A new regression check must be run against the original broken input and shown
  to fail before it is considered a real guard.
