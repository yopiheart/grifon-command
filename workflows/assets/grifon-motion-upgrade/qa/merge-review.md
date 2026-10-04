# Independent merge review - 2026-10-04

Reviewer: independent Codex agent `motion_merge_review`.
Scope: PR156 at ead3abe9, then main integration29feca9c and the subsequent
voiceover/generate.mjs completed-case refusal plus README clarification.
Code/workflow review only; no auditory assessment or rights clearance.

## Finding and resolution

The original voice runner's attempt ledger lived under each worktree's ignored
`.tmp`. Restoring the same approved spec/assets into another worktree could
therefore submit a second paid take despite the already consumed approval.

The reviewer evaluated the actual original module with an in-memory filesystem
and intercepted provider requests. First checkout: one mocked POST; repeat in
that checkout: refused; second checkout: another mocked POST. Both simulated
unknown outcomes remained consumed only in their individual local ledgers.
Real provider calls and real filesystem writes: zero.

The fixed historical runner refuses every `--generate` invocation at main entry,
before credentials, asset validation, provider access or output writes. Its
approved prompt/model/settings and completed media are unchanged.

Reviewer reran the actual patched module in two simulated restored worktrees:
both generation attempts exited1 with the completed-case refusal, with zero
environment reads, requests or writes. Default offline mode exited0 with the
same zero-side-effect counts. This proves the original defect and the repair;
it does not prove paid provider behavior or authorize another synthesis.

## Remaining verification

- 30 new JavaScript modules parse.
- Recovery ZIP hash/CRC and all42 entry hashes pass.
- Mixer dry run validates nine source assets and51 cues.
- Integration preserves all motion deliverables and current main application,
  tuned content, packages, agents and configuration; only NOW.md conflicted.
- Parent also ran the actual local voice offline input/alignment check: PASS.
- Final verdict: no remaining actionable finding in reviewed scope.
- Final committed-head CI is a separate merge gate, recorded in PR156.

The accepted film remains a private creative baseline; commercial source rights
are unchanged. No provider call, render, new credit spend or public release was
performed for this review.
