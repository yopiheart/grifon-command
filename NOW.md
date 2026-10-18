# NOW - the resume doc
**Stamped: 2026-10-18; approved opening applied, live listening pending**

## Active task and boundary
Checkout F:/CodexWorktrees/7471/grifon-command; branch codex/oceanides-voice-lab.
Base3fec6515 (main/PR184); draftPR206:
https://github.com/yopiheart/grifon-command/pull/206.
Neil approved maximum10 sessions x3minutes, one active, withinUSD5; no reset.
He now explicitly approved this EXACT opening, same voice, then tests for
interruptions, thinking pauses and emotion:
Magandang araw po! Ako si Michael, AI assistant ng Oceanides. Anong service po ang kailangan n’yo?
No merge/deployment/customer calls/ad changes/production writes authorized.

## Implemented runtime and contract
Separate funnel Vite runtime, npm.cmd run dev:voice from funnels/oceanides-price-page.
Strict loopback http://127.0.0.1:5184/voice-lab.html; production routes excluded.
Synthetic scenarios, transcript/tool log, mock dispatch, timing/checklist/JSON export.
Server-only credentials, same-origin/loopback guards, one-use session token.
Metro Manila household siphoning: PHP5000 PER TRUCKLOAD, up to4000liters.
Callbacks daily08:00-17:00 Asia/Manila; crew availability is unconfirmed.
Neil/Zam consult Boss Jay for final price/slot, then customer accepts that version.
Corrections invalidate acceptance; refusal/human/failure stop selling.
Opening now uses one interruptible force_message AFTER configured+audio_ready.
Browser sends ready only after capture starts, with session/audio identity guards.
Duplicate ready/config cannot repeat greeting. Caller-first suppresses late greeting.
No added response.create for opening; pending lifecycle blocks overlapping turns.
Stop/interruption cancel queued playback; canceled IDs suppress late audio.
Tool continuation waits for response.done plus playback_drained.
Success: exact opening once, only with ready audio; no overlap/stale playback.
Failure: early/duplicate opening, canceled audio returns, secret or budget regression.
Verify: original-failing unit/browser regressions, full mock suite, independent review.
Actual accent, emotion and acoustic behavior require human live listening.

## User listening observations and scope
Neil reports foreign accent on xAI playground opening with several stock voices,
then Filipino delivery after his first spoken turn. He reports the Hi po variant
worked; the newly requested Magandang araw po variant still needs live evaluation.
Do not diagnose general Filipino incapability from that opening-only observation.
No fixed response delay/emotion switch added. Existing warm/calm instructions stay.
Use existing interruption/thinking-pause/price-objection scripts and manual ratings.
After Grok, user wants ElevenLabs v4 comparison. Current official docs list
real-time eleven_v4_turbo and Filipino; voice/account/config/cost still unspecified.
Runbook records comparison scope; no Eleven adapter, generation or subscription yet.

## Verification
Focused oceanidesVoice101/101 PASS across7files; typecheck:voice PASS.
Independent changed service/spec suites38/38 PASS; no actionable review findings.
Original implementation failed11 unit regressions; original frontend failed the
new positive audio_ready browser regression, then fixed source restored.
Dedicated Playwright11/11 PASS including new mic-ready/Stop races and390px flow.
Funnel production build (voice/layout gates), separate lab build, root build PASS.
Full root unit suite1674 PASS,32 existing skips;134 passed/9 skipped files.
Root build has existing Browserslist/large-chunk/plugin-timing warnings.
Bundle-leak, voice-sync, eval-prompt sync, domain, artifact anchors, PS1 ASCII PASS.
Fresh production scan173files: zero lab/model/mock/opening markers.
No UI copy/style/control change; approved customer greeting is the only new copy.
Independent review PASS; real listening results not inferred from mock tests.
Local evidence logs/screenshots stay ignored .tmp/oceanides-voice-lab/.

## Exact approval, budget and desktop continuation
Spec funnels/oceanides-price-page/dev/voice-lab/paid-test-spec.DRAFT.json.
New approved rawSHA256:
6d66cbfe539b9dc6fc5aa35193511e1378d51245d7a147c7cd6f0f4c2769e0cf.
Only spec change is openingMessage. All original JSON fields byte-value equivalent:
grok-voice-3.0/eve/server_vad/audio/instructions/tools/scenarios/acceptance/limits.
Prior approved SHA09fc7b4f15acb4b327016c36fc4f31d173030f96647c5050f07a7221653eaeee.
Original ignored paid-approval.json preserved; new immutable receipt is
.tmp/oceanides-voice-lab/paid-approval-opening-2026-10-18.json.
Ledger .tmp/oceanides-voice-lab/budget.json:5 attempts/USD2.50 reserved, inactive.
SHA373821251124007837096f9360259e82f2e5779ede6d278427a151885adead2e unchanged.
Reservations are not provider billing; never reset/refund/delete ledger or locks.
Three existing scenarios would consume3 reservations/USD1.50, reaching8/USD4.
Four earliest starts failed on malformed key; human re-entry passed free validation.
Sanitized phase/status/allowlisted-code diagnostics and explicit free key check exist.
Private live Vite16028/launcher28424 intentionally stopped inactive for mock tests.
Updated ignored start-approved-voice.mjs pins new SHA, same caps and free preflight.
node--check and --validate-only PASS,5/USD2.50, no key/network/provider/spawn.
New private launcher PID2324 is open awaiting human raw-key entry; no server yet.
Key stays only in owned server memory. Never read private console/clipboard/keypage,
process secret environment, or env files; tool processes do not inherit its key.
Next: human pastes secret privately; check public status/newSHA/unchanged budget.
Then leave Live/03 Repeated interruptions ready for manual listening. Export each
report before moving to04 Thinking pauses, then02 Price objection for emotion.
No paid attempt started by agents. Real greeting delivery, interruption, pauses,
emotion, mic/acoustic timing and telephone/crew performance remain unverified.
