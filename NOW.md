# NOW - the resume doc
**Stamped: 2026-10-17; chat-only release in progress**

## Active task and boundary
Checkout: F:/CodexWorktrees/chat-design-release/grifon-command.
Branch: codex/chat-design-release; base main 18d6d169.
Neil explicitly approved merge and deployment of the approved chat design.
Live voice testing and release are paused at Neil's request. Do not run paid
voice calls or implement the proposed future Grok provider.
Preserve voice work in codex/chat-voice-release / draft PR201:
https://github.com/yopiheart/grifon-command/pull/201

## Release scope
Port approved charcoal/ivory, static grain, fitted glass, scoped Oxanium,
fixed centered mascot/status, relative chat times, account appearance,
mobile dedicated search and keyboard/scroll/draft corrections.
Keep existing dictation and chat actions. Empty composer has attachment and
dictation; nonempty draft reveals Send. Keep mouse/keyboard tooltips.
Exclude Gemini Live handlers, services, hooks, session UI, config and QA assets.
App.tsx, CompanionChat/index.tsx, storage, types, dependencies and tuned prompts
remain unchanged. Preserve the original website wordmark and approved mascot.

## Evidence and outstanding gates
Approved source: e9013bc9 in F:/CodexWorktrees/chat-voice-release/grifon-command.
Physical Android light/dark keyboard/search/draft checks passed before porting.
The source glass verifier fixes a 375px textarea-wrap test invariant:
all original assertions retained; five cases, build and full Vitest passed.
Prior source CI: 32 passing jobs, footer assertion fixed; layout job-cap and
screenshot readiness/ordinary browser action latency still require resolution.
Chat-only final build/full Vitest PASS: 1616 tests, 32 existing skips.
Codex, domain, voice/eval sync, anchors, design, ASCII and bundle checks PASS.
New composer browser cases PASS8/8; independent correctness review clean after
fixing Safari URL-filter fallback. Fallback RED proven; GREEN/smoke/CI pending.
No CI gate is waived.
Paid voice ledger: F:/CodexQA/grifon-live-voice-20261017/paid-test-ledger.json.
Only first Chromium voice session attempted; no transcript/audio/usage before
deadline. Billing unknown, USD1 reserved; Android explicitly never started.
Firefox deferred; actual Safari unavailable on Android/Windows.

## ▶ NEXT ACTION
Finish the isolated chat-only diff, fresh build/unit/static/browser checks,
independent correctness/brand review and CI. Create/attach a separate draft PR,
merge only after gates pass, then verify the production build on desktop/mobile.
Do not promote the voice preview or merge PR201.
