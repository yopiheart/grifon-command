# NOW - the resume doc
**Stamped: 2026-10-17; chat-only release and approved Gemini Live voice in progress**

## Workspace and authorization
Active release: F:/CodexWorktrees/chat-voice-release/grifon-command.
Branch codex/chat-voice-release, based on confirmed production/main18d6d169.
Original approved design/candidate is preserved dirty in F:/CodexWorktrees/61f5/
grifon-command on codex/chat-liquid-glass, HEAD26a44a27, earlier draft PR199.
Neil requested deploy + post-live mobile/desktop checks, then live voice before
release. Exact config/exceptions and USD2 controlled test spec approved in chat
2026-10-17. No paid calls, commit/push/deploy or secret reads yet. Do not merge main.

## Release isolation
Original branch has28 UGC fixture ancestor commits beyond production, outside this
release. New worktree ports only approved chat UI/search/keyboard and voice. Keep
production App/index/conversations/types/dependencies/schemas, website wordmarks
and UGC APIs/services unchanged. No reference-brief feature shipped here.
Source node_modules reused via ignored local junction; all versions match main lock
except unused extra dev-only PGlite in source. No reinstall or dependency edit.
Port executor owns UI/assets/tests. Root owns config/instructions/NOW; backend
executor owns endpoint and SDK serialization tests. Preserve all existing work.

## Approved voice configuration
Model models/gemini-3.8-live; Charon; AUDIO; maxOutputTokens512; default VAD/language;
input/output transcription; tools empty; no resumption/grounding/video/thinking.
Server-only prompt exactly1490UTF8bytes; SHA256
3fc2f084a0bd8105232222c588711cd486d680c15dec600b25ed0f92557935c3.
Approved proposal SHA C8CFA6F82E0CEC2C81E691F31B9DED0315302E90A04AECE75129F94F445DA088.
Full packet: original worktree/.tmp/companion-live-voice-approval/verification-spec.md.
Config copied exactly; approved scoped AGENTS transport exceptions applied.
Token uses1; message expiry300s; new-session expiry60s; conservative user lease330s.
Burst3/60s, user3/day, global30/day using direct fail-CLOSED rate_limit_check RPC.
Mint15s/request45s, no retry/refund; SDK retryOptions attempts1 explicit.
Issuance counts/expiry are NOT a hard dollar cap against a modified direct client.

## Voice behavior
Separate waveform; existing mic is dictation. One mascot, honest status,
mute/End/error controls; hidden/inert/navigation/account change releases resources.
Current REST has no transcription.finished: user End freezes collected text for
review; Use as draft never auto-sends, typed replacement needs confirmation.
Transcripts temporary; no raw audio saved by app. Saved history/media are not fed
into Live v1. No voice tools, automatic brief updates, generation or publishing.

## Verification: original candidate, not release port
UI42focusedunit/14EdgeE2E PASS; build+ASCII PASS. REST VAD RED then fixed;
clipboard permission/same-chat late-ack RED then fixed. Independent correctnessPASS,
BRAND_PASS45/50, light/dark375x667+1280x900, loadedOxanium/44px targets/no overflow,
reduced-motion spinner disabled. Original reference-copy code remains only there.
Structural helper58mocktestsPASS; security reviewPASS_PARTIAL only.
Original full2030PASS/32existing skips plus one intentional VAD RED, not finalPASS.
Evidence F:/CodexQA/grifon-live-voice-20261017/, frontend-final-hashes.json/review/.
Earlier Android qa5 keyboard/search BOTHtheme manualPASS preserved under
F:/CodexQA/grifon-cross-browser-phone-20261016/mobile-dedicated-search/.
Native HTTP5197 fixture STOPPED; old URLs stale. Actual Safari unavailable;
Windows WebKit is engine coverage only. Fresh release checks listed below.

## Paid test approval, unconsumed
Maximum USD2 TOTAL; up to3 sessions45s each,2 specified turns/2 responses;
no retries/model/version substitutions. Frozen offline David PCM fixtures,
hashes and enforced byte/context/output bounds in approved packet. Conservative
planning estimate USD0.978696 plus headroom. Stop errors/missing usage/bound failures.
Cases desktop Chromium/Firefox fixtures and actual Android Chrome same spoken lines
on HTTPS stage. Bounded Android harness required or mark NOT RUN. No Apple hardware.

## Deployment and remaining work
Signed-in Vercel browser confirms grifon.ai Ready DFT1T71yMxgyqMnAwwCVDGGaTqri,
main18d6d169; fresh git ls-remote agrees. Connector403/no teams; CLI no credentials,
login cancelled. Browser fallback works; no reauthentication/authfile inspection.
Release port95scopedE2E PASS; final fullVitest1804PASS/32existing skips. Codex26PASS.
SDK/helper68mocktestsPASS; prompt/hash/full lock/one attempt/timeout verified.
Independent server security PASS0findings. Actual-App review BOTHthemes375/1280
passed drafts, theme no-remount, settings, mobile search, viewer and mock logout;
light Settings gold contrast corrected with scoped approved antique gold.
Design lint0errors/0warnings and production bundle-leak0markers PASS.
QA critic found delayed usage/independent output-transcript ordering issues;
bounded1s accounting drain and regressions97focusedPASS; frozen QA audit PASS0findings.
No paid usage. Required Gemini/Supabase variable NAMES confirmed BOTHenvironments;
values never opened. Codex26/domain/voice-sync/eval/anchors PASS again.
Final preview+production fullbuilds PASS; production QA HTML/WAV/text absent,
servermarkers0, bundle-leakPASS. Exclusion verifier rejected preview bytes as RED.
Actual-App UI independent BRAND_PASS45/50, light Settings contrast5.62/5.64:1.
Production must rebuild with production env; never alias preview bytes directly.
Next: reviewed commit/draftPR+HTTPSpreview; approved bounded voice tests;
production release and post-live mobile/desktop checks. No paid calls yet.
Main recovery work merged PR186; prior accepted assets remain intact.
