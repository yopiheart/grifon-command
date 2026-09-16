# NOW - the resume doc
**Stamped: 2026-09-16, evaluation fidelity fix**

## Current state
Branch: `codex/eval-fidelity`, based on current main (`4acbaefc`).
Implementation and independent review complete; draft PR creation follows commit.
No production application, tuned prompt, schema, model or generation setting changed.
No paid runs, Actions dispatch, production-data changes, merge or deployment.

## ▶ NEXT ACTION
Read the draft PR and its CI before deciding to merge; keep it draft.
After evaluation fidelity is accepted, triage actual failed outputs before proposing
specific prompt corrections. A live verification needs an approved exact-input/cost
spec; sharing production retries can add calls relative to the old mirror.

## Implemented
- Script regression uses a shared adapter calling real FLOW_REGISTRY.adscript.
  Client request/fake auth, fixtures, assertions and paid guards are preserved.
  Production classification, hook/transformation retries and resolved format now
  reach the evaluator; persistent telemetry is mocked in the shared adapter.
- Nightly reporting distinguishes setup, assertions, incomplete execution evidence,
  missing-key skip, success, cancellation and artifact-upload failure.
  Reports actual step names and links artifacts only after upload returns an id.
  Schedule, provider switches and fixture set unchanged.
- SOP records current suite boundaries and variable classifier/retry call counts.
  Image evaluation tools remain unchanged: stale four-angle copy and historical
  vs current-production provenance are documented for a separate approved diff.

## Verification
Original mirror failed all 3 new parity cases before replacement: transformation
retry, Temu classification and resolved-format return. Original reporting failed
setup-stage classification and absent-artifact tests before replacement.
New adapter tests: 19 passed; reporter tests: 18 passed. Final focused rerun: 37/37.
Full suite: 1,394 passed, 32 gated skips, 113 files passed / 9 skipped.
Build passed (2,580 modules, main JS gzip 589.79 kB).
Bundle-leak, voice-sync, domain, PS ASCII, artifact-anchor and check:codex passed
(26 Codex tests; 31 skill entrypoints, zero structural errors).
Workflow YAML parsed; whitespace checks passed.
Independent correctness review: no actionable findings. Import convention cleanup
completed. Independent offline contract smoke: 37/37 passed.
No browser smoke needed: no UI/API implementation changed. Paid provider behavior
and real Actions execution remain untested; auth/quota/HTTP schema ladder are
outside the flow-level regression harness. Build retains existing size warnings.
Generated snapshot line-ending noise was restored; no snapshot change is intended.

## Audit evidence
Sept. 14 nightly run 34898931978 failed npm ci: ffmpeg-static binary download HTTP
500. Gemini tests never ran; its generic regression issue does not prove a prompt
failure. See workflows/nightly_regression.md for source link and image audit.
Compared REALISM_INSTRUCTION and SAFETY_SETTINGS copies match; negative-text
constraint differs by whitespace. HIGH_ANGLE_SELFIE remains only in the model-eval
copy, despite its approved July 25 production removal. Do not auto-resync tuned
copies or treat historical outputs as current-production evidence.

## Other work remains separate
Website PR #129 is merged on main; the previous local handoff was stale.
Hero film is paused at Neil's request; its latest handoff is on PR #134, stacked
on #132. Gemini migration is draft PR #131; ASMR fidelity is draft PR #127.
This task does not resume, merge or modify those projects.
Use workflows/codex_desktop.md and Node 24/npm 11; never commit secrets/session state.
