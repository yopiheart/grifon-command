# NOW - the resume doc
**Stamped: 2026-11-06 · One-Shot provider-submission recovery**

## Active work
Checkout: F:/CodexWorktrees/ea2b/grifon-command
Branch: codex/oneshot-submission-recovery, based on main 37f54d67.
Draft PR: https://github.com/yopiheart/grifon-command/pull/227
Implementation: 5d8cb832. Uses existing scene columns and claim RPC.
PR201 live voice remains paused. No release or live microphone evidence.

## Behavior
- Retry polls a saved handle or reuses a completed clip. A handle-less claim
  stays paused regardless of age. Kling can look up the same attempt by
  custom ID. Veo needs its saved operation ID.
- The scene attempt fences record, complete, flag and requeue. An old browser
  must refresh before it can claim a scene under the new protocol.
- A First Cut retry can resume an in-flight take. Only the caller that
  saves scene completion continues to voice and final assembly.

## Verification
- On the original runtime, the isolated PostgreSQL/PostgREST regression
  reproduced three accepted fake jobs for one scene, a discarded saved
  handle and a late old-attempt write. The updated handler passed 9/9,
  including an old browser claim rejected before paid work.
- One-Shot Playwright: 16/16 with fixtures, including 390x844 Retry and
  saved-handle reload. Storyboard and First Cut remained parked on reload.
- Build and bundle leak passed. Vitest: 1691 passed, 32 opt-in skips.
  Codex 26/26, prompt-copy, domain, voice, ASCII, anchors and design passed.
- Independent review closed all findings. The First Cut race regression
  failed before the correction and passed afterward.

Local isolated reports under `.tmp/provider-recovery`:
- Pre-fix: `be5fa62a-1e5b-4ea9-a202-89255e4b7f35`.
- Updated handler: `aada7f5c-9e69-4ad8-a9f2-5f85535f97fa`.
See `workflows/provider-submission-recovery.md` for commands and limits.
Provider calls were simulated. Hosted lookup, billing and deployment remain
unverified. Companion still applies its own receipt guard.

## ▶ NEXT ACTION
Review PR227 and hosted checks. Before a release, let active renders finish
and plan a refresh for old tabs. Provider-backed validation requires an approved
paid test spec. A scene with an unconfirmable submission can require support.
