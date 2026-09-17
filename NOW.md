# NOW - the resume doc
**Stamped: 2026-09-17, workflow and personal-desktop updates merged**

## Current state
Neil uses his persistent personal Windows desktop, sometimes remotely from mobile.
Cafe-PC wipe/reinstall/sign-out assumptions no longer govern work.
PR #141 merged: https://github.com/yopiheart/grifon-command/pull/141.
Merge commit: `5d1b583c2bf8d92cb3968ad0f93780982a1a48e5`.
Local main was fast-forwarded to this commit. Handoff-only branch:
`codex/workflow-release-handoff`; the feature is already on main.
Neil explicitly approved both exact patches; both are now applied to 36 active
files. Do not ask for their approval again. Installs, accounts, dependencies and
assets are reused. Setup is conditional on actual need. Historical cafe helpers
remain under explicit current overrides; mobile disconnects do not force commits.

## Next action
The user explicitly requested the final CI check and merge; both are complete.
Pre-merge CI verify, E2E, artifacts and Vercel preview checks passed on the
independently reviewed head `dec9946a`. Automatic post-merge CI run
`35175238294` was still running at the handoff check; no result is claimed yet.
No additional feature implementation or approval is pending. Changed hook source follows
Codex's normal review/trust UI; tests do not establish current app trust/delivery.
Fresh tasks discover updated skill descriptions; the initial catalog may be stale.

## Evidence
`workflows/workflow_instruction_cleanup_2026-09-17.md` records approved hashes,
scope, proposal evidence, applied verification, and the TypeSafe Jev assessment.
Exact applied-source comparison passed for both ordered patches.
Independent applied review: no actionable findings; all 36 final blobs match;
independent narrow SessionStart test passed.
`npm.cmd run check:codex`: all 26 tests passed.
Build passed, including PowerShell ASCII; existing chunk warnings remain.
Full tests: 113 files / 1,401 tests passed; 9 files / 32 opt-in tests skipped.
Initial concurrent run had one checkAnchors timeout; full rerun passed unchanged.
Bundle-leak, voice-sync, domain-language, artifact-anchor and JS syntax checks pass.
Prior isolated candidate tests: 16/16; new startup assertion failed original hook.
Tabletop scenarios were hypothetical, not live automatic-trigger tests.
Generic skill validator rejects existing invocation metadata in two autopsy skills
in baseline and candidate; neither metadata nor validator was weakened.
Post-merge librarian sweep ran explicitly against `5d1b583c` (the default selects
the previous two-parent merge and misses squash commits). Its broad historical
migration/product hits do not establish new defects or reopen prior work.
No paid run, provider integration, secret/auth changes, OS or remote-access changes,
manual deployment, or hook trust modification occurred.

## Related work
Prompt-quality A+B+D merged in PR #139; release evidence is PR #140 / `f71f6365`.
Do not repeat those changes or request their approval again. Unapproved C/E/F
proposals remain separate. Jev is a possible future classifier comparison, not a
generation replacement. Tweet text/replies were read; embedded videos did not play.
