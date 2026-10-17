# NOW - the resume doc
**Stamped: 2026-10-17; approved chat release and Gemini Live staging in progress**

## Workspace and authorization
Active: F:/CodexWorktrees/chat-voice-release/grifon-command, codex/chat-voice-release.
Base: confirmed production/main 18d6d169; initial implementation f727f3a pushed.
Attached draft PR201: https://github.com/yopiheart/grifon-command/pull/201.
Neil authorized deployment and live mobile/desktop checks, then live voice first.
Exact configuration/exceptions and USD2 bounded spec approved October 17. No merge.
Original dirty design/UGC candidate is preserved at F:/CodexWorktrees/61f5/
grifon-command, branch codex/chat-liquid-glass, 26a44a27, PR199. Do not deploy it.
Release includes only approved chat/voice. Production App/index/conversations,
types, dependencies, tuned generation prompts and website wordmarks are unchanged.
Dependencies reused via ignored junction; no installation or auth-state copying.

## Approved voice
Model models/gemini-3.8-live, Charon, AUDIO, 512 output tokens, default VAD/language,
input/output transcription, empty tools; no resumption/search/video/extra knobs.
Server prompt: 1490 UTF8 bytes, SHA256
3fc2f084a0bd8105232222c588711cd486d680c15dec600b25ed0f92557935c3.
Frozen packet: original worktree/.tmp/companion-live-voice-approval/.
Token uses 1, message expiry 300s, new-session 60s, user lease 330s. Durable
fail-closed claims: 3/60s burst, 3/user/day, 30/global/day. Mint 15s/request 45s,
one attempt. No client master key. Issuance limits are not a hard dollar budget.
Live mute/End, reviewed transcript to draft; no automatic messages or production
actions. No saved history/media sent; no app raw audio archive. Existing dictation
is separate. Hidden page/navigation/account change release audio and transport.

## Deployment
Production grifon.ai remains Ready DFT1T71yMxgyqMnAwwCVDGGaTqri/main 18d6d169.
Preview DfHbpcrvQ3rnDiVZRWKntwixkW2d is Ready from f727f3a (older composer).
Host: grifon-command-af5875inn-neilmaglayabusiness22-2085s-projects.vercel.app.
User signed in normally there; app and voice-check.html work. Stable branch alias:
grifon-command-git-c06c70-neilmaglayabusiness22-2085s-projects.vercel.app.
Vercel connector 403; CLI lacks credentials. Reuse signed-in browser; no auth reads.
Production promotion must rebuild with production environment, never directly
alias preview bytes. QA HTML/WAV/test text must be absent from production.

## Paid tests STOPPED
Original spec: USD2 total, up to 3 sessions, 45s each, 2 exact turns/2 responses,
no retries/substitutions. Fixture hashes and current prices verified before case 1.
Case 1 Chromium155 on f727: setup ready, first 185920 PCM bytes enqueued, no
application transcript/audio/usage, 45s deadline cleaned audio/socket once. FAIL.
Actual billing unknown; USD1 conservatively reserved. Estimate 0 is not zero-charge
proof. Cases 2 Firefox and 3 actual Android NOT RUN. Missing-usage STOP active.
Optional numeric/null wire observer closes an observation gap, with unchanged
inputs/configuration/timing/bounds; it does not fix or explain provider silence.
Evidence/ledger: F:/CodexQA/grifon-live-voice-20261017/paid-test-ledger.json.
Specific one-time Firefox continuation approval requested in chat, unanswered.
Same original inputs/configuration/bounds, same USD2 total, USD1 reserve for case 1,
at most USD1 continuation; no Chromium retry/fourth/automatic Android case.

## Latest verified revision
Composer: empty/whitespace shows waveform only; text shows Send only; fixed 44px.
Compact hover/focus tooltips dismiss on Escape/blur/click; no sticky touch labels.
Separate dictation, attachments, IME/Enter and drafts preserved. DESIGN updated.
Optional sanitized protocol diagnostics in service/QA with regression coverage.
Five stale chat/beta/polish CI assertions corrected to current content/font 16px.
Keyboard geometry reads batched; every assertion, cycle, real tap, motion setting
and timeout preserved. Independent source review PASS, frozen hash A727B334...40B0F.
Default Chromium dark/light 2-answer cases PASS 42.3s/41.3s under original 60s.
Old-resize negative control rejects original overlap (-297.734375px vs >=8px).
Initial unchanged test timed out twice; real Chromium channel launch spawn blocked.
No product/config/time-limit workaround. Full latest keyboard matrix not rerun.
UI 15 mocked E2E PASS; diagnostic 133 focused unit PASS. Independent actual-App
delta review PASS/BRAND45/50 at 375x667/1280x900, both themes and touch contexts.
Latest serial full Vitest: 1817 PASS, 32 existing skips; 134 files PASS/9 skip.
Preview and production builds PASS. Production QA HTML/WAV/text absent, server
markers 0, bundle-leak 0. Snapshot LF-only churn archived/restored after diff exit 0.
Codex 26/static voice-sync/eval/domain/anchors/design/ASCII/whitespace checks PASS.
Initial release 95 scoped browser cases, 68 server mocks and 97 QA regressions PASS.
Cloud f727 CI: five stale assertions (fixed), three jobs reached 15-minute cap.
Evidence root: F:/CodexQA/grifon-live-voice-20261017/ (composer-swap, ci-assertions).

## Remaining
Push latest reviewed revision, verify new preview and CI. Paid STOP persists until
specific resume approval. Finish required audio proof before production; no gate
bypass. Then authorized production rebuild and live mobile/desktop checks.
Earlier Android qa5 keyboard/search manual PASS in both themes; old HTTP5197 stopped.
Actual Safari unavailable on Android/Windows; WebKit coverage is engine-only.
