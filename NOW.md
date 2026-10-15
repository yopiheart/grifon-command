# NOW - the resume doc
**Stamped: 2026-10-15; local fixture production queue built**

## Active task and boundary
Checkout: F:/CodexWorktrees/61f5/grifon-command.
Branch: codex/ugc-fixture-queue; base codex/ugc-reference-review at e41e6fd4.
Neil authorized the next build while gathering assets: fixtures only, no paid
production. This slice previews execution/recovery after sample plan review.
It is local simulation before S2, not durable or browser-independent execution.
No API/provider/model/prompt/migration/dependency changes, production writes,
paid calls or manual deployment. Existing legacy flows and accepted work remain.

## Implemented
- Saved confirmed sample plan -> Preview demo queue -> Prepare -> Start.
- Sequential scene clips, one voice/alignment step for spoken plans, music,
  existing sound-bank cues, assembly and quality check. Silent plans omit voice.
- Original illustrative quote/cap visible; actual spend PHP 0.00 throughout.
  Demo complete creates no media and no Assets entry.
- Progress reopens on this browser/device. Leaving the queue, reload, chat or
  account switch stops playback and requires explicit Resume; no clock catch-up.
- Optional normal or second-clip-fails-once scenario. One targeted retry keeps
  successful steps and their attempt counts. Pause/resume retains the active
  attempt; Cancel prevents more transitions. Duplicate actions cannot restart work.
- Any brief/input/voice/review/timing/cost edit permanently invalidates the queue,
  including edit-and-revert. Previous progress stays inspectable until explicit
  replacement using a newly confirmed plan. No multi-queue archive is provided.
- Save-aware timers pause for pending writes; a failed save stops playback and
  requires Resume after Retry saving. Unsaved progress never claims durability.
  Conflict copies retain queue state stopped, preserving the newer original.
- Exact plan/confirmation/input binding, validated transitions and strict local
  decoding. Malformed saved queues fail closed without deleting stored records.
- Prior intake/review remains: reference video or text-only link, up to five
  role-labelled photos, one saved voice, English sample script/visual timeline.
  Samples do not analyze/localize media. Local storage is not spend authority;
  manually rewritten database contents are not authenticated.

## Verification and review
Build PASS; full Vitest PASS: 1,632 passed, 32 existing gated skips.
Focused suite PASS: 13/13; tsc --noEmit PASS.
New queue Playwright PASS: 15 functional cases plus two mobile overflow regressions.
Viewport coverage: 375x667, 390x844 and 1280x900.
Existing Companion chat/continuity/intake/review browser regression PASS: 37/37.
Coverage includes reload/resume, bounded retry, cancel, navigation/account guards,
permanent invalidation, silent mode, quota failures, conflict-copy recovery and
three malformed saved queues retained after rejection. API/provider and fixture
controller calls were zero; decorative font requests separately blocked/recorded.
Meaningful red: absent domain module; queue entry absent after a saved confirmed
plan. Both failed before implementation and passed afterward. No paid/live flags.
Long visual URL overflow also reproduced red at375/390, then both panel/scroller
checks passed after text wrapping. Failed-state icons and disabled controls clarified.
Bundle-leak, voice-sync, eval-prompts, domain, PS1 ASCII, artifact anchors PASS.
Independent correctness/React source review PASS, no actionable findings.
Independent rendered smoke PASS; BRAND_PASS 44/50, zero unresolved findings.
Own critic cases, mobile375/390 and desktop1280, icon crops, focus and disabled
states passed. Post-fix panel/scroller widths match at both mobile sizes.
Evidence local-only: .tmp/ugc-queue-{build-final,test-final,regression}.log,
.tmp/companion-reference-queue-* and .tmp/ugc-queue-critic/. Not shared PR artifacts.
Generated snapshot line-ending noise restored; no snapshot change included.

## Delivery and reproduction
Planning PR: https://github.com/yopiheart/grifon-command/pull/188.
Intake PR: https://github.com/yopiheart/grifon-command/pull/190.
Review PR: https://github.com/yopiheart/grifon-command/pull/191.
Queue PR lookup: gh pr view codex/ugc-fixture-queue --repo yopiheart/grifon-command.
Queue PR stacks on codex/ugc-reference-review. Do not merge/deploy without Neil.
Remote status pending push; prior review branch Vercel check: Account is blocked.
Reuse safe fixture server localhost:5173 (parent session91045 while alive).
URL: http://localhost:5173/companion-chat-preview.html.
Safe start: node tools/verify-recovery-server.mjs; no.env or live API middleware.
Queue check: npm.cmd run test:e2e -- --config tests/e2e/companion-reference-queue.config.ts
Reproduction/boundaries: workflows/ugc_reference_implementation_plan.md.

## Next action
Neil supplies real UGC references/brand assets; references may be any language.
Before paid integration: cloud-owned media, real analysis/research/planning under
approved tuned diffs and pilot specs, verified quotes/voice compatibility,
server-owned durable executor, reservations/submission reconciliation and budget
ledger. Local demo confirmation grants no paid execution authority.
Roadmap: workflows/creative_library_roadmap.md; detailed S0-S6 plan linked above.
Accepted orbital film/music sources remain untouched; prior paid approvals consumed.
