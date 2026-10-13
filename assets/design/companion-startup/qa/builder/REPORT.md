# Companion startup builder report

The approved startup change is complete. Product edits are limited to two files.

- `components/CompanionChat/CompanionAvatar.tsx`: the neutral portrait renders only on failure. Loading keeps the full-size iframe mounted at opacity zero and presents an accessible neutral three-dot cue after `DUR.base`. Readiness reveals the rendered iframe immediately and clears the existing 30-second timeout; actual failure and cleanup also clear it. Origin/source checks, retry remounts, reactions, selection protection and valid late-ready recovery remain.
- `components/CompanionChat/companionChat.css`: one opacity-only ready transition uses `DUR.fast`; a zero-duration delayed cue reveal uses `DUR.base`. Reduced motion removes the ready transition and existing dot motion while retaining the delayed cue. No runtime, model, texture, bridge or other UI source was edited.

## Confirmed verification

| Command | Exit | Result |
| --- | ---: | --- |
| `npm.cmd run build` | 0 | TypeScript and production Vite build pass; prebuild PowerShell ASCII check passes. |
| `npm.cmd run test -- --run` | 0 | 118 test files passed, 1,453 tests passed, 32 tests skipped; 44.92 seconds. |
| `git diff --check -- components/CompanionChat/CompanionAvatar.tsx components/CompanionChat/companionChat.css` | 0 | No whitespace errors. |
| `node tools/executor_ledger.mjs` | 0 | Standings read; no Git writes performed. |

Actual command output and exit records are in `build-output.txt`, `build-result.json`, `unit-output.txt` and `unit-result.json`. The build emitted non-failing Browserslist-age and chunk-size warnings.

The tester reported the original `bccbc2dc` baseline failure before editing: a held scene load showed the neutral portrait when no image was expected. Final startup verification passed 13/13 cases and continuity passed 6/6 cases. The independent reviewer reported eight scenarios, 65 assertions and native CSS timing corroboration passing, with no actionable findings. Those browser results belong to their independent reports; the builder did not duplicate them.

## Source integrity

Both hashes match at source freeze, build start and full-unit completion:

| File | SHA256 |
| --- | --- |
| `CompanionAvatar.tsx` | `f3116ee6fd76f87d53a058023d7a67f0476c556e053b98af1a39c87d42aa5d0a` |
| `companionChat.css` | `81697a3d2f1b912419aff69e6d30111c3e034d1d4bbab18951ade3ef720d086c` |

Snapshots are recorded in `source-frozen-hashes.json`, `source-build-start-hashes.json` and `source-unit-end-hashes.json`. `source-diff.patch` displays the product diff: Avatar +28/-10 lines, CSS +4/-0 lines. Git whitespace cleanup normalized report display copies; exact original command output and patch bytes are preserved losslessly in `../raw-run-output.json`, with before/after hashes in `../formatting-normalization.json`. Product and test source were unchanged.

## Deviations

None. The package test entry was used with `--run`, as requested by root, to execute the complete Vitest run without watch mode.

## Limits and handoff

No requested implementation remains incomplete. Physical phone hardware was not tested by the builder; mobile evidence comes from the independent browser viewport checks. No paid/provider calls, application restart, staging, commit or push was performed. Root owns the documentation and Git handoff.
