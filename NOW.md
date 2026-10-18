# NOW - the resume doc
**Stamped: 2026-10-18; paid draft approved, mobile audio/key setup pending**

## Active task and boundary
Checkout: F:/CodexWorktrees/7471/grifon-command.
Branch: codex/oceanides-voice-lab; base 3fec6515 (main, PR184).
Neil approved the exact paid-test draft in chat: at most 10 sessions x 3 minutes,
within USD 5. Preserve that approval; do not ask for it again unchanged.
Draft PR 206: https://github.com/yopiheart/grifon-command/pull/206.
No deployment, merge, customer call, ad action or production data write authorized.
No paid provider connection has run; live runtime remains disabled until ready.

## Implementation
Separate Vite runtime in funnels/oceanides-price-page; `npm.cmd run dev:voice`
there serves only loopback 127.0.0.1:5184/voice-lab.html (strict port).
Own entry point, local HTTP/WebSocket bridge, synthetic scenarios, transcript,
tool log, simulated dispatch, result checklist, JSON export and timing estimates.
Production lead/ops/tracking bootstraps are excluded. Their API routes return 404.
Server-only credentials; one-use socket token and same-origin/loopback checks.
Mock tools never write a production database or contact a person.
Metro Manila household siphoning: PHP 5,000 per truckload, up to 4,000 L.
Daily callback window 08:00-17:00 Asia/Manila is not a crew schedule.
Final price/slot require Neil/Zam checking Boss Jay, then explicit customer
acceptance of the current version. Corrections invalidate earlier acceptance.
Refusal, human handoff and workflow failure prevent resuming the selling flow.
Interrupted responses cancel upstream and queued playback; tool continuation
waits for response completion and browser drain. No automatic paid retries.

## Verification
Root build PASS (existing large-chunk warning); full unit suite 1,626 PASS,
32 existing skips across 9 files. All 53 new focused tests PASS across 6 files.
Dedicated Playwright suite 9/9 PASS, independent smoke, live env explicitly off.
Pending-socket-stop regression: original 1 FAIL/2 PASS -> fixed 3/3 PASS.
Stale-start browser regression: late A failure closed B before fix; now PASS.
Funnel typecheck:voice, production build and separate lab build PASS.
Bundle-leak, voice-sync, eval-prompts, domain, artifact anchors, ps1-ascii,
Codex controls 26/26 and diff whitespace checks PASS.
Fresh production dist scans: no lab entry point, model or mock markers.
Independent source review: no remaining substantive correctness findings.
Independent mobile/desktop smoke passed; final mobile evidence refreshed.
Final desktop refresh unavailable because CUA had no browser; earlier checks PASS.
Brand PASS_WITH_NITS, 0 critical/1 nit: English internal technical chrome vs the
client Taglish rule. Customer-facing Taglish remains in the approval draft.
Logs/screenshots are local-only in ignored .tmp/oceanides-voice-lab/.

## Paid test: APPROVED, NOT RUN
Runbook: clients/oceanides/VOICE-LAB.md.
Exact draft: funnels/oceanides-price-page/dev/voice-lab/paid-test-spec.DRAFT.json.
SHA256: 09fc7b4f15acb4b327016c36fc4f31d173030f96647c5050f07a7221653eaeee.
Proposed pinned grok-voice-3.0, stock eve, server VAD, ten synthetic scenarios.
Maximum 10 sessions x 3 minutes, one active, USD 5 local allowance; USD 0.50 reservation
per attempt, persisted before provider open. Failures retain their reservation.
Ledger: .tmp/oceanides-voice-lab/budget.json; never reset to gain allowance.
Crash/unresolved locks fail closed; inspect owner before recovery, keep ledger.
Local reservations are not a provider billing guarantee or account-wide cap.
Required server gates: OCEANIDES_VOICE_LIVE=1, exact approved file SHA in
OCEANIDES_VOICE_APPROVED_SPEC_SHA256, and XAI_API_KEY. Leave unset ordinarily.
Approval verified 2026-10-18 09:19 UTC against the unchanged raw-file SHA above.
Current process lacks XAI_API_KEY; checked only presence, never secret values.
Runtime 5184 is running mock-only, attempts 0 / reserved USD 0 / no active session.
Neil is mobile remote. Awaiting remote app/phone OS and secure API-key location.
The phone browser cannot reach the PC's 127.0.0.1. Existing remote desktop needs
PC sound to phone AND phone mic to PC; check both for free before paid Start.
Current paid Start reserves/connects before requesting mic, so don't use it as
the first microphone check. Remote audio delay is separate from browser metrics.
Any instruction/model/voice/scenario/setting change requires fresh approval.
Real Grok speech, Taglish quality, emotion, acoustic latency, microphone and phone
performance remain NOT RUN. No claim of voice suitability until approved calls.
Phone routing/caller ID/transfers/crew timing are a later independently tested step.
