# NOW - the resume doc
**Stamped: 2026-10-15; browser-independent local fixture jobs built**

## Active task and boundary
Checkout: F:/CodexWorktrees/61f5/grifon-command.
Branch: codex/ugc-background-fixtures; base codex/ugc-fixture-queue at bbf8607c.
Neil authorized fixture jobs that continue after browser closure and reopen in
chat. No paid generation while real references/brand assets are being gathered.
This is local worker/restart proof before cloud S2, not production durability.
No tuned prompt/model changes, new dependencies, paid calls, production writes,
manual deployment or merge. Actual spend remains PHP 0.00; no media/Assets entry.

## Implemented
- Opt-in Companion preview ?background=1: confirmed sample plan -> Open background
  fixture job -> Start. Existing app/local demo queue behavior is preserved.
- Exact submission intent saved in IndexedDB before POST. Stable owner/chat/plan
  identity deduplicates starts and reconciles lost acknowledgements by GET.
- Separate Node worker advances synthetic steps into an ignored SQLite journal.
  GET never advances work; browser closure/navigation does not stop the worker.
  Transitions commit before the next step is scheduled. Same journal resumes
  after worker restart without recounting attempts or clock-based catch-up.
- One targeted retry preserves successful steps. Cancel/invalidate stops current
  intent despite worker revision races; retry retains revision protection.
  Command errors remain visible across automatic status polls.
- Stop acknowledgement and local save precede editing. Edit-and-revert cannot
  revive a stopped plan. Conflict copies observe their original job read-only.
- Fixture owner/chat validation, transactional multi-worker serialization,
  idempotent command receipts and pre-start cancellation tombstones.
- Preview-only same-origin /__companion-fixture-jobs transport, simulated accounts
  only. Host reads no .env, blocks live API calls and denies HTTP access to .tmp.
- Local intake/review still preserve reference, five photos, voice, plan and quote.
  Reference language can differ from output language; samples do not analyze media.

## Verification and independent review
Build PASS; full Vitest PASS: 1,647 passed, 32 existing gated skips.
Focused protocol/journal/real-worker tests PASS: 15/15.
New Playwright suite PASS: 13/13, no skips/flakes/page errors/forbidden calls.
Existing Companion chat/continuity/intake/review/local-queue suites PASS: 54/54.
Closed whole owned Edge process at 390/1280, read SQLite before any reopening/GET:
jobs completed while browser was closed, then same profile/chat/request recovered.
Lost-start-response case also completed before reopening with no second POST.
Coverage: save-before-POST, failed save -> zero dispatch, duplicate tabs, copied
chat, targeted retry, cancellation race, edit acknowledgement/revert, offline and
late response/account isolation. Real worker tests cover crash/restart and two
workers. Actual spend zero; decorative font traffic blocked/recorded separately.
Meaningful REDs preserved: missing implementation/entry and forced cancel race;
same assertions passed after fixes. No paid/live flags or skipped failed gates.
Bundle-leak, voice-sync, eval-prompts, domain, PS1 ASCII, artifact anchors PASS.
Independent correctness/React review PASS; final follow-up PASS, no findings.
Independent smoke PASS; final BRAND_PASS 45/50, zero critical/nits after icon fixes.
Mobile 375/390, desktop 1280, focus and 200% crops inspected; no overflow.
Evidence local-only: .tmp/ugc-background-*.log, .tmp/companion-background-final.json,
.tmp/companion-background-evidence-summary.json and .tmp/ugc-background-critic/.
Generated unrelated snapshot line-ending noise restored; no snapshot diff included.

## Delivery and reproduction
Planning/intake/review/queue draft stack: PR188 / PR190 / PR191 / PR192.
New background draft PR and remote checks: pending final backup this session.
Safe preview: http://localhost:5173/companion-chat-preview.html?background=1.
Current owned host session64372, host PID19340, worker PID14440 while alive.
Journal: .tmp/companion-background-live/jobs.sqlite; keep this path for restart.
Replaced only our old 5173/5174 hosts after tests; existing browser origin retained.
Post-handoff HTTP checks: preview200, live API503, journal download403.
Narrow 5173 closed-browser rerun PASS1/1; full 13-case suite passed on 5174.
Start: node tools/verify-recovery-server.mjs --reference-jobs --port 5173 --jobs-db .tmp/companion-background-live/jobs.sqlite --worker-status .tmp/companion-background-live/worker.json
Browser suite defaults5174; set COMPANION_BACKGROUND_URL for another local port.
Commands and limits: workflows/ugc_reference_implementation_plan.md.

## Next action
PC and worker must remain on for progress. Restart with the same intact journal
to resume; no automatic worker supervisor or cross-device recovery is claimed.
Before paid integration: cloud-owned media, authenticated durable workers,
atomic reservations/submission reconciliation/budget ledger, real research and
analysis under approved tuned diffs, verified provider/voice contracts and an
approved exact-input paid pilot. Local demo confirmation grants no spend authority.
Roadmap: workflows/creative_library_roadmap.md; detailed S0-S6 plan linked above.
Accepted orbital film/music and existing legacy presets remain untouched.
