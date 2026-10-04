# NOW - the resume doc
**Stamped: 2026-10-04, evaluation prompt parity safeguard**

## Current authorized work
Neil authorized one proven improvement for a recurring correction, using the
existing PR review workflow. Branch: `codex/eval-prompt-parity`, based on
main `8deaee9b`. Implementation: `7c776d7b`, committed and pushed.
PR158: https://github.com/yopiheart/grifon-command/pull/158.
Checkout: C:/Users/ADMIN/.codex/worktrees/6596/grifon-command.

## Result
`npm.cmd run check:eval-prompts` compares six declared shared template pairs
between production geminiService and the two image evaluation tools. It uses
static source parsing; it never imports or runs those evaluation tools.
Missing, duplicate, malformed or changed blocks fail; CRLF and line-edge
whitespace are normalized. CI invokes the check; 18 regression tests cover it.
The existing agent lesson now links the implemented safeguard and its limits.
No application, tuned prompt, model, dependency-version or paid-operation changes.

## Verification
- Current parity check: PASS, all six pairs.
- Actual historical before-fix source at `f927f589`: expected FAIL for the
  avatar shared template, normalized line 2. After-fix `bb0cf7e1`: PASS, six pairs.
  Sources were read with git show and passed to checkEvalPromptSync; no eval ran.
- `npm.cmd run build`: PASS (existing bundle-size/Browserslist warnings).
- `npm.cmd run test`: PASS, 116 files, 1432 tests; 9 files/32 tests skipped by
  existing suite gates. Live/paid test switches remained unset.
- `npm.cmd run check:codex`: PASS, 32 skill entries and 26 contract tests.
- Bundle-leak, voice-sync, domain-language, artifact-anchors and design lint: PASS.
- Initial sandbox checks hit subprocess EPERM; required checks passed outside
  the sandbox. Artifact tracking was confirmed by Git, then the checker passed.
- Existing desktop dependencies reused through a local ignored node_modules
  junction. Test-generated snapshot line-ending change was restored.
- Independent Codex review: no actionable findings on the five-file safeguard
  diff against `8deaee9b`; reviewer also ran the six-pair checker successfully.
- Browser and paid output evaluations: NOT RUN; no application behavior changed.

## Limits
This checks declared source sections, not full generated prompts, dynamic
interpolation values, models, other harnesses, live providers or image quality.
It detects drift; it does not authorize automatically syncing tuned content.
Output impact of the historical typo remains unmeasured.

## ▶ NEXT ACTION
Neil authorized merging PR158. Check its live status: if open, merge once CI
passes; if merged, use the parity guard on main. Deployment was not requested.
Keep user image attachments untracked. Reuse this correction loop for future work.

## Other work retained
PR154's evidence-handoff workflow and PR155's short-request planning agreement
are merged. Recovery PR146/150 remain on-return recovery, not closed-browser
production. Motion and Oceanides release work remain separate.
