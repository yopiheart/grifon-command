# NOW - the resume doc
**Stamped: 2026-10-19; cancellation/transcript fixes verified, paid lab exhausted**

## Active task and boundary
Checkout F:/CodexWorktrees/7471/grifon-command, branch codex/oceanides-voice-lab.
Cancellation/transcript fix follows bc614c01; draft PR206:
https://github.com/yopiheart/grifon-command/pull/206.
Neil approved original10 attempts/USD5, then exactly1 recovery/+USD0.50.
CURRENT LEDGER:11 attempts/USD5.50 reserved, inactive, exhausted/liveReady=false.
No further paid retry, cap increase, refund, reset or reservation reclassification.
Reservations are not confirmed provider charges. No deployment/merge/customer calls.
Neil reports recovery: no audible opening, unsure whether spoken input was heard.
He uses separate Chrome/Edge; root IAB is a different idle test page.
Human local mic meter + speaker tone passed before recovery; basic routing works.
Actual Grok voice, ASR, audible cutoff, accent and emotion remain unverified.

## Preserved actual recovery evidence
GET status before any edits: configured/audioReady/openingSent=true;
inputFrames575, outputChunks1, lastStage=input_audio, operator_stopped;
providerFailure=null. This means input append attempted and one chunk bridged;
it does NOT establish recognition, nonempty speech content or audible playback.
Safe projection saved before HMR at:
.tmp/oceanides-voice-lab/recovery-silent-diagnostics-2026-10-19.json.
Current ledger SHA256:
d5b362a500977c8a96313d91a170049890c23e13d8ba812d1918f771739bea4a.
No raw provider events, audio, IDs, transcript or credentials retained there.
Neil confirms full approved question spoken; transcript showed roughly one word.
He already refreshed; no exported report supplied. Do not infer full recognition.

## Current contract / independent audit findings
Confirmed backend race: server VAD speech_started during pending uncreated opening
sets an unscoped cancelWhenCreated flag; next caller answer can be canceled.
Explorer reproduced zero forwarded caller-answer chunks with no network.
This is NOT established as the historical cause of Neil's actual silent recovery.
Frontend PCM conversion/scheduling has no proven deterministic decoding defect.
Three20ms RMS.03 frames cancel live playback under existing thresholds; local
check bypasses that logic. Noise/echo/early caller speech is a hypothesis only.
Previous browser fakes never emitted response/audio; native test covered tone only.
Success: provider-VAD cancellation cannot poison new reply; known canceled audio
stays suppressed; guarded actual WebAudio render proves fake bridge audio path.
Failure: late audio restarts, new reply disappears, tools overlap, secrets/raw audio
enter diagnostics, paid calls occur, or approved knobs/ledger change.
Verify red-before-fix backend tests, native fake-socket PCM rendering, builds,
full tests, independent diff/smoke review; no provider session in verification.

## Implementation and current verification
fix_pending_cancel owns backend/service/contracts/backend tests.
prove_bridge_playback owns audio/VoiceLab structural telemetry + frontend tests.
Root owns docs/evidence/PR; independent final code review PASS on corrected diff.
No VAD threshold, force_message interruptible flag, prompt or model change allowed.
Agreed PlaybackDiagnostics: bounded nonnegative integer counters only for chunks
received/decoded/scheduled/ended/canceled/dropped, samples decoded/nonzero,
localInterrupts/serverInterruptNotifications. Sends meaningful changes + before Stop.
Server validates exact keys/ranges, copies, retains after Stop; report includes them.
Additional server counters: VAD start/stop, response created/done, client interrupts,
canceled deltas and forwarded PCM bytes; continuous input must not erase milestone.
New guarded native bridge PCM test PASS after root inspected all request guards.
ALL lab API must be fake/default-aborted and bridge sockets mocked before navigation.
Never launch standard E2E webServer on occupied port or stop the owned server.

## Approved spec and business contract remain unchanged
Spec funnels/oceanides-price-page/dev/voice-lab/paid-test-spec.DRAFT.json.
SHA2563c2077baa62f6eddcc70a90f4253af847163cede28659c0683ee0e0202c7e663.
Opening: Magandang araw po! Ako si Michael, AI assistant ng Oceanides. Anong service po ang kailangan n’yo?
grok-voice-3.0, eve, server_vad, PCM24k, unchanged instructions/tools/scenarios.
Cumulative11/USD5.50, one active,3min maximum, USD0.50 reservation before provider.
Recovery script was natural-inquiry first line only, Stop after reply/10s silence.
Approval receipts are ignored; preserve originals plus recovery receipt.
Metro Manila household siphoning: PHP5,000 PER TRUCKLOAD, up to4,000L.
Callbacks daily08:00-17:00Manila. Neil/Zam check Boss Jay for final price/slot;
customer acceptance of that exact version required. Corrections invalidate it.
Human/refusal/failure stop selling. Production lead/ops/tracking excluded.

## Runtime and prior verification
Final check: private2512 and listener were absent; exit cause unknown, no locks.
Mock-only Vite restored at127.0.0.1:5184, exec session46149; live/key/hash unset.
GET inactive/exhausted11/11 confirmed. No new key entry or provider call needed.
Never inspect env files, private console, clipboard, key page or process secrets.
Original owned2324/5592 were stopped; direct Node launcher worked after PS wrapper.
Final backend65/audio-connection22 PASS; full1700 PASS/32 skips, builds PASS.
Root bundle/sync/domain/anchor PASS; native playback1/1 PASS; no visible UI change.
Independent critic53 PASS; all3 findings resolved. Actual Grok still unverified.
Runbook clients/oceanides/VOICE-LAB.md; evidence ignored .tmp/oceanides-voice-lab/.
ElevenLabs eleven_v4_turbo later comparison remains unimplemented/unapproved.
