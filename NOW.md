# NOW - the resume doc
**Stamped: 2026-09-17, workflow cleanup and personal-desktop proposals**

## Current state
Neil now works on his persistent personal Windows desktop, sometimes remotely
from mobile. Cafe-PC wipe/reinstall/sign-out assumptions no longer govern work.
Branch: `codex/workflow-instruction-cleanup`, based on merged main `ee9ad8d1`.
The original prompt-quality A+B+D changes are already merged in PR #139;
post-merge release evidence is preserved on PR #140 / commit `f71f6365`.
Do not repeat that implementation or request its approval again.

## Next action
Review and obtain exact approval for the two ordered candidate patches:
1. `workflows/proposals/workflow-instructions-2026-09-17/cleanup.patch`
2. `workflows/proposals/workflow-instructions-2026-09-17/personal-desktop.patch`
Active instruction files and hook source have NOT been changed yet.
The user's broad instruction-cleanup/personal-desktop request is authorized;
AGENTS.md's exact instruction-diff approval remains the final application gate.
No merge or deployment is authorized. After application, review the actual diff,
run applicable control checks, and handle changed hook trust through normal UI.

## Evidence
`workflows/workflow_instruction_cleanup_2026-09-17.md` contains the assessment,
patch hashes, scope, checks and TypeSafe Jev evaluation with official sources.
The first patch shortens eight descriptions by 66.2% in characters, replaces
line-count and reasoning-keyword rituals, and clarifies independent review.
The second retires active cafe-PC assumptions, reuses persistent setup and local
assets, and makes mobile remote access part of the same desktop workflow.
Native `check:codex`: 31 entrypoints, 0 errors, all 26 tests passed.
Both patches apply cleanly in an isolated Git index.
Candidate hook/readiness tests: 16/16 passed in an isolated test repository.
New startup assertion fails against original cafe hook, passes against candidate.
Independent diff reviews: no actionable findings after two trigger fixes.
Baseline/candidate tabletop: 20 scenarios each, not live automatic-trigger tests.
Candidate YAML parses; non-description metadata preserved. Generic quick validator
rejects existing legacy invocation metadata for two autopsy skills in both
baseline and candidate; that compatibility issue is documented, not bypassed.
No application build/full suite or live/paid generation ran in this task.
No secrets, auth state, production data, OS settings or remote-access config changed.

## Related findings
Original tweet and replies were read in the browser; embedded videos did not play.
Jev is a possible future enum-classification comparison, not a generation swap.
No provider integration, install, account setup, or paid test was performed.
Unapproved prompt-quality C/E/F proposals and other project work remain separate.
Historical cafe runbooks/tools are retained; proposed active overrides retire them.
