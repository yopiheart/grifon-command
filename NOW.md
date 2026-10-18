# NOW - the resume doc
**Stamped: 2026-10-18; corrected credential validated, desktop live test ready**

## Active task and boundary
Checkout: F:/CodexWorktrees/7471/grifon-command.
Branch: codex/oceanides-voice-lab; base 3fec6515 (main, PR184).
Draft PR206: https://github.com/yopiheart/grifon-command/pull/206.
Neil approved the exact paid draft: maximum 10 sessions x 3 minutes, within USD5,
one active session. Do not request that approval again for unchanged inputs.
No merge, deployment, customer calls, ad actions or production writes authorized.

## Implemented lab
Separate Vite runtime: funnels/oceanides-price-page, npm.cmd run dev:voice.
Strict loopback http://127.0.0.1:5184/voice-lab.html; no public exposure.
Scenario selector, Start/Stop, transcript, mock tools, simulated dispatch,
result checklist, JSON export and timing estimates. Synthetic details only.
Production lead/ops/tracking bootstraps excluded; their API routes return404.
Server-only key, one-use socket token and exact Host/Origin/loopback checks.
Metro Manila household siphoning: PHP5000 per truckload, up to4000liters.
Callbacks daily08:00-17:00 Asia/Manila; not a promise of crew availability.
Neil/Zam consult Boss Jay to approve final price/slot, then customer acceptance
of the current version. Corrections invalidate previous acceptance.
Human/refusal/failure states stop selling; interruption cancels upstream and
queued playback. Tool continuation waits for response completion/audio drain.

## Startup failure and structural fix
Four manual live starts failed before any transcript. Original generic errors
lost HTTP/TLS/DNS details, so the exact historical failures cannot be recovered.
Basic unauthenticated HTTPS/DNS/TLS reached xAI (expected401).
Explicit free GET /v1/api-key initially returned400. After a boolean format guard,
root confirmed credentialFormatPlausible:false / invalid_credential_format.
The latter made zero external requests. No key value/fragment/length was read.
New sanitized diagnostics retain phase, elapsed time, HTTP/close status and
strictly allowlisted error codes. No raw body/header/error/reason is exposed.
Explicit same-origin JSON POST /api/voice-lab/check-provider performs one fixed
read-only key check; no generation/reservation/redirect/retry. Status never fetches.
Response projection drops key material, names, IDs and raw ACLs. Eight-second
whole-operation timeout, bounded response, malformed keys rejected before fetch.
Cancelled sockets suppress late failures; failed handshakes explicitly abort.
No prompt/model/voice/tool/VAD/audio/scenario change; approved SHA unchanged.
Contract: diagnose auth/transport without secret exposure or new paid attempts;
fail on leaked raw data, changed caps/ledger/spec or auto retry.

## Verification
Current focused oceanidesVoice suite84/84 PASS across7files.
Root build PASS (existing large-chunk warning); full unit suite1657 PASS,
32 existing skips across9files;134 passing files. Root paid switches unset.
Funnel typecheck:voice, production build (voice65/layout14) and lab build PASS.
Bundle-leak, voice-sync, eval-prompts, domain, artifact anchors and ps1-ascii PASS.
Original diagnostic regression failed6/6 before fix; now fixed tests PASS.
Independent source review, format guard review and private launcher review PASS.
Independent blocked-HTTP runtime smoke6/6 PASS; ledger4/USD2 unchanged.
Earlier dedicated mock Playwright9/9 PASS including stale Start/Stop regression.
Browser suite not repeated while private live runtime used5184; UI unchanged.
Independent final public status unavailable during intentional private restart.
Snapshot test caused EOL-only dirt; verified no semantic diff and restored only it.
Earlier brand PASS_WITH_NITS: one English internal technical-chrome exception.
Local screenshots/logs remain ignored .tmp/oceanides-voice-lab/.

## Approved paid test and next action
Runbook: clients/oceanides/VOICE-LAB.md.
Exact draft: funnels/oceanides-price-page/dev/voice-lab/paid-test-spec.DRAFT.json.
SHA256: 09fc7b4f15acb4b327016c36fc4f31d173030f96647c5050f07a7221653eaeee.
Pinned grok-voice-3.0, stock eve, server VAD, ten synthetic scenarios.
Ledger .tmp/oceanides-voice-lab/budget.json:4 attempts, USD2 reserved, inactive.
Six attempts / USD3 allowance remain. Reservation is not confirmed provider billing.
Never reset/refund/delete ledger or unresolved locks to gain allowance.
Live gates: OCEANIDES_VOICE_LIVE=1, exact SHA in
OCEANIDES_VOICE_APPROVED_SPEC_SHA256, server-only XAI_API_KEY; ordinarily unset.
Neil is now physically at desktop and created a key; no mobile work needed.
Verified owned inactive Vite12692 / launcher9488 stopped; ledger preserved.
Ignored private launcher .tmp/oceanides-voice-lab/start-approved-voice.mjs now
checks format+free HTTP200+three blocked flags false before arming/spawning.
No automatic paid session. Syntax, six offline cases, independent review and
--validate-only PASS: exact SHA,4/USD2, no key/network/spawn during validation.
New standalone private launcher PID28424: human entered key, free preflight passed.
User told actual secret starts xai-, no Bearer/quotes/key name, never chat.
Never inspect private console, clipboard, key page or process secret environment.
Tool processes do not inherit its private key. Check public status only.
Public status: liveReady true, inactive,4 attempts/USD2; new owned server is running.
Lab tab refreshed, Live selected, Start ready; user checks desktop mic and one approved
manual natural-inquiry session. Do not blindly repeat Start on failure.
No real conversation has succeeded. Taglish, emotion, microphone, acoustic latency
and phone/caller-ID/crew response remain unverified until actual tests run.
