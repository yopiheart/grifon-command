# NOW - the resume doc
**Stamped: 2026-09-28, recovery verification tooling**

## Current state
Neil approved a critical-flow map and reusable verification command for One-Shot
saved-work recovery. Implemented on `codex/recovery-flow-verification`, based on
PR146 `codex/oneshot-recovery` at `485708c4`. PR146 is still open; main remains
`5d1b583c`. This follow-up adds tooling and documentation, not product changes.
No tuned prompt/model, engine-default, billing, hosting or dependency changes.
No real generation, production writes, merge or deployment performed.

## Deliverable
- `workflows/recovery-feature-map.md`: consumer entry points, expected screens,
  file ownership, seeded vs exercised behavior and explicit recovery limits.
- `npm.cmd run verify:recovery`: runs the existing 18 recovery browser cases.
  `--list` lists nine flow IDs; `--flow <id>` checks that flow at 375px and 1280px.
- JSON/Markdown reports link screenshots/traces and record SHA, dirty state,
  timestamps, child exit code, and PASS/FAIL/NOT RUN coverage. Unselected is NOT RUN;
  missing, stale, skipped or inconsistent evidence cannot produce overall PASS.
- Dedicated fixture frontend server does not load local .env or live API handlers.
  Child environment is restricted, paid/live RUN switches are rejected, and an
  existing server on port 5173 is never reused or stopped by the command.
- Desktop workflow entrypoint links the map. New unit tests check the verifier,
  including discovery of the exact 18 real Playwright cases without a browser.

## Verification
- Negative control: temporarily restored `ProducerFlow.tsx` from original main.
  `verify:recovery -- --flow saved-run-error` failed at both viewports, exit 1.
  Original fixed file restored byte-for-byte; no product diff remains.
- Full new runner: 18/18 passed, exit 0 (final attachment rerun: 1.5 minutes).
- Full existing E2E: 74/74 passed, exit 0 (2 workers, 2.3 minutes), before the
  five attachment-only additions; final 18-case rerun covers those additions.
- Build PASS; final new-config TypeScript check PASS. Existing bundle warnings.
- Full unit: 115 files / 1,414 passed; 9 files / 32 opt-in tests default-skipped.
- check:codex 26/26, hook harness 25/25, bundle-leak, voice-sync, domain-language,
  PowerShell ASCII (prebuild), artifact anchors, design lint, script syntax PASS.
- Independent correctness review: no remaining actionable findings. Two map
  wording issues (NOT RUN and per-flow vs overall PASS) corrected and rechecked.
- Independent fresh-agent smoke PASS: saved-plan 2/2, eight NOT RUN, evidence
  links/dimensions verified, invalid ID and live switch rejected, occupied-port
  refusal leaves the owned helper alive. Browser behavior checked via Playwright;
  manual CUA unavailable. Existing full-page screenshots now attached and linked;
  independent reviewer cleared the five attachment-only additions.
- No component edits; brand review is not applicable to this tooling-only diff.

## Evidence on this desktop
Full run: `.tmp/recovery-verification/2026-09-28T13-48-37-136Z-Jrs2HW/summary.md`.
Original-defect failure: same root, `2026-09-28T13-40-12-324Z-1Tc7zr/summary.md`.
Logs: `.tmp/recovery-flow-*.log`; reports and browser evidence remain ignored.
Reports accurately show the tested base SHA plus dirty=true for the new files.

## Boundaries and remaining delivery
Recovery means returning to saved work in the same browser storage context.
Default-engine partial work does not automatically continue. Producer polls
recorded jobs after reopening; Storyboard approval and First Cut remain gates.
Provider jobs may continue externally, but a complete closed-browser pipeline
and notifications remain separate work. Fixtures do not certify live billing,
provider quality, database concurrency, real auth or production deployment.
Final-render retry can start another final render; scene-job recovery is distinct.
The draft PR will target `codex/oneshot-recovery`; regular GitHub CI currently
only targets main, so fresh main-target checks are still needed after PR146 lands.
Do not treat local checks or absent stacked-PR CI as production release clearance.
No hosting-account change or merge is authorized by this implementation request.

## Unrelated work retained
Motion stack PR143 -> PR144 -> PR149 remains on its own branches. Approved V08
and its review are preserved there; this branch does not integrate that work.
Existing untracked attachment/media directories were not staged or removed.
