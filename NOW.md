# NOW - the resume doc
**Stamped: 2026-11-13. Codex instruction reconciliation and recovery handoff**

## Active work
The `codex/reconcile-agent-instructions` branch aligns the standing lessons
and WAT with the current Codex secret, delegation and verification rules.
Review the [instruction changes](https://github.com/yopiheart/grifon-command/compare/main...codex/reconcile-agent-instructions).
PR201 live voice remains paused.

## Producer recovery
[PR226](https://github.com/yopiheart/grifon-command/pull/226) merged the isolated
harness at `37f54d67`. It reproduced duplicate fake-provider submissions after
failed handle writes and a late write from an old scene attempt.

[Draft PR227](https://github.com/yopiheart/grifon-command/pull/227), head
`c01261ba`, contains the runtime fix. It checks scene attempt ownership,
preserves saved handles, and uses Kling's custom ID to look up an uncertain
submission. A handle-less Veo attempt or unconfirmed Kling job stays paused.
The PR records independent review, nine isolated database cases and sixteen
One-Shot browser fixture cases. GitHub reported 44 successful checks and two
skips at that head. Live provider lookup and billing remain unverified.

## Verification
Instruction changes: `npm.cmd run check:codex` passed 26/26 tests. The strict
resume check caught the stale prior stamp. `git diff --check` and the updated
strict resume check passed. The hook suite exercises the checked-in contract.
An in-session probe is still needed for evidence of live desktop hook dispatch.

## ▶ NEXT ACTION
Use PR227 for the Producer recovery review. Before any authorized release,
let active renders finish and plan a refresh for old browser tabs. Live
provider validation requires an approved paid test spec. Use the
[recovery feature map](workflows/recovery-feature-map.md) and
[provider recovery harness](workflows/provider-submission-recovery.md)
to choose verification for subsequent changes.
