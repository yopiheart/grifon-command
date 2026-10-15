# NOW - the resume doc
**Stamped: 2026-10-15; fixture direction/script/visual-plan/cost review built**

## Active task and boundary
Checkout: F:/CodexWorktrees/61f5/grifon-command.
Branch: codex/ugc-reference-review; base codex/ugc-reference-draft at 0145bcfd.
Neil authorized the next build while gathering assets: review direction, script,
visual plan and estimated cost with fixtures only; no paid generation.
This is the local UI portion of S1, layered on the local S0 draft. No real planner,
provider/model/prompt changes, paid calls, production data changes or deployment.

## Implemented
- Reference brief -> Prepare sample plan -> editable sample review -> local demo
  confirmation. Saved reviews reopen, with an Edit brief path that retains them.
- Direction, three timed scenes with English sample speech/visual descriptions,
  requested output language/adaptation mode, selected voice and audio assumptions.
- Compact illustrative PHP cost ranges and contingency/cap. Optional Edit demo
  estimate controls exercise invalid amounts and confirmation invalidation.
  These are invented test amounts, not provider quotes. Actual spend is zero.
- No-voiceover mode omits speech and the illustrative spoken-audio charge.
- Input snapshots hash media bytes; monotonic input revisions and plan revisions
  bind the demo confirmation to its inputs, plan and quote. Any input edit stales
  the old review; plan/cost edits clear confirmation. Edit-and-revert cannot revive it.
- Old review content remains until explicitly replaced with an updated sample.
  Pending hashing is guarded by chat/account/input scope and navigation protection.
- Conflict copies retain review/revision. Failed writes cannot show a saved
  confirmation. Partial invalid edits persist; validation blocks confirmation.
- Local records do not authorize spend or jobs. Reopen validates stored structure,
  revision and receipt; confirmation recomputes media hashes. Local database contents
  are not authenticated against manual rewriting. Server authority is future work.
- Existing same-browser/device S0 storage remains: one reference video, up to five
  photos and one selected voice. Clearing browser data removes drafts and files.
  Reference links are text only. No real media interpretation/localization occurred.

## Verification and review
Build PASS; final full Vitest PASS: 1,627 passed, 32 existing gated skips.
Focused domain suite PASS: 13/13. New review browser suite PASS: 5/5.
Existing Companion chat/continuity/reference browser regression PASS: 32/32.
New domain verifier failed before the implementation module existed with the test
runner installed, then passed after implementation. No claim of live-media quality.
Bundle-leak, voice-sync, eval-prompts, domain, PS1 ASCII, artifact anchors PASS.
Independent correctness/React review PASS with no actionable findings.
Independent smoke passed desktop/mobile, including actual attachment replacement
staling a confirmed review, account isolation, conflict/save failures and no calls.
Brand PASS_WITH_NITS: 42/50, zero critical. Nonblocking regular-prose icon sizing nit.
Local evidence: .tmp/review-plan-critic/, .tmp/companion-reference-review-results/,
.tmp/ugc-review-build.log, ugc-review-test.log and ugc-review-regression.log.
Evidence is local-only, not a shared PR artifact.

## Delivery and reproduction
Planning PR: https://github.com/yopiheart/grifon-command/pull/188.
First draft PR: https://github.com/yopiheart/grifon-command/pull/190.
Review-build draft PR lookup:
gh pr view codex/ugc-reference-review --repo yopiheart/grifon-command
Review PR stacks on codex/ugc-reference-draft. Do not merge/deploy without Neil.
Previous branch's Vercel automatic preview reported Account is blocked. Recheck
remote checks on this branch; no gates were disabled and no manual deployment ran.
Reuse the safe fixture server on localhost:5173 (parent session91045 while alive).
URL: http://localhost:5173/companion-chat-preview.html.
Safe start: node tools/verify-recovery-server.mjs; no.env or live API middleware.
New suite: npm.cmd run test:e2e -- --config tests/e2e/companion-reference-review.config.ts
Commands and limitations: workflows/ugc_reference_implementation_plan.md.
Dependencies already installed; no setup/secret restoration needed for fixtures.

## Next action
Neil supplies three UGC references and real brand assets; references may be any
language. The fixture demonstrates review mechanics, not creative output quality.
Remaining: cloud-owned media/cross-device drafts, real reference analysis/Recipe
selection and brand research, approved planner/model diffs, verified rate quotation,
server-owned approvals/budget ledger and durable jobs before any paid execution.
Voice upload/consent and real voice compatibility also remain. No prior paid budget
or demo confirmation is authorization for those operations.
Roadmap: workflows/creative_library_roadmap.md. S0-S6 implementation plan:
workflows/ugc_reference_implementation_plan.md. Old presets/accepted work intact.

## Preserved prior delivery
PR184 CI and PR186 recovery fixes are in the base. Recovery limitations remain in
workflows/recovery-feature-map.md; existing checkpoints are not a provider-spend cap.
Accepted film: workflows/assets/grifon-orbital-music-v2_5/grifon-orbital-launch-music-v2_5-v2.mp4.
SHA256 4040ba1763aeb415b8d79a3b9d914959149b11fc89eed52489652da0e69d6405.
Accepted film/score/picture sources untouched; prior paid approvals consumed.
