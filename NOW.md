# NOW - the resume doc
**Stamped: 2026-10-14; recovery contract regressions verified for draft review**

## Active task and boundary
Checkout: F:/CodexWorktrees/efe4/grifon-command.
Branch: codex/recovery-contract-gaps; base 3fec65156ace4a9b17b432ae05f8e9bae4a6427e.
Neil approved missing crash-window and malformed-response tests first, followed
by minimal fixes for reproduced defects. Keep the existing architecture.
Draft PR lookup: gh pr view codex/recovery-contract-gaps --repo yopiheart/grifon-command.
No merge, manual deployment, paid generation, live billing or production writes.

## Implementation
Scene handle/completion write errors previously vanished in the video pool,
which persisted video as done and skipped unfinished scenes on resume.
Workers now drain siblings, retain completed clips and fail the stage so Retry
can reach recorded handles. Fresh handle-less claims remain recoverable.
Saved-run load validates control structures, identities, approval flags/gates
and core stages before rehydration. Malformed responses retain the run and
show Retry/Back. Supported older snapshots and reference fallbacks are retained.
Two runtime files: services/producerOrchestrator.ts and producerRunService.ts.
Seven crash cases + 36 response/compatibility cases; malformed browser flow
loops eleven response variants at 375px and 1280px. Map now has 20 browser cases.
No tuned content, models, provider settings, dependencies or migrations changed.

## Current evidence
Red before green: five initial crash failures plus immediate-retry failure;
29 malformed-response unit failures, two browser failures and two additional
review/error missing-core-stage failures before their corresponding fixes.
Build PASS; full Vitest PASS 1,616 / 32 existing default skips.
After final assertion additions, affected suites PASS 152/152; runtime unchanged.
Mapped browser recovery PASS 20/20, zero retries.
Strengthened malformed Retry PASS 2/2; exact saved script/image restored.
Companion Stop/Resume + competing-tab checks PASS 2/2, no flaky/skipped cases.
Fresh independent diff review clean, including final test-only recheck.
Independent smoke critic ran browser checks; its helper servers exited.
Codex contracts PASS 26; bundle-leak, voice-sync, eval-prompts, domain,
artifact anchors, PowerShell ASCII via build, and diff whitespace PASS.
Local-only evidence: .tmp/recovery-* logs/JSON and .tmp/recovery-verification/.
Full map report: 2026-10-14T02-21-59-952Z-6qhBDf/summary.md.
Strengthened report: 2026-10-14T02-25-52-972Z-dFXb2f/summary.md.
Tests ran on base plus task diff; reviewed runtime hashes match delivery.
Hosted CI is separate; inspect the draft PR for current status.

## Remaining limits and next action
Stale claims without recorded handles can submit again. Repeated lost handle
writes can cause repeated provider submissions; credit dedupe is not a spend cap.
Real claim RPC/concurrency, live billing, paid quality and browser-storage-loss
recovery remain unverified. Review the draft; merging needs Neil's instruction.
Recovery flow reference: workflows/recovery-feature-map.md.

## Preserved prior delivery
CI optimization merged as PR184; current task base is main 3fec6515.
Accepted film: workflows/assets/grifon-orbital-music-v2_5/grifon-orbital-launch-music-v2_5-v2.mp4.
SHA256 4040ba1763aeb415b8d79a3b9d914959149b11fc89eed52489652da0e69d6405.
Editable score: continuous-fit-plan.json, mix-continuous.mjs, continuous-mix-receipt.json.
Editable picture: workflows/assets/grifon-pluto-adaptation/orbital.json/js/html.
Accepted film/source assets untouched. All historical paid approvals consumed.
