# NOW - the resume doc
**Stamped: 2026-10-18; Companion Chat sidebar and mascot entry**

## Active task and boundary
Checkout: F:/CodexWorktrees/chat-design-release/grifon-command.
Branch: codex/chat-sidebar-vibrancy; base origin/main 9e3b0996.
Source commit5c4066ae pushed; attached draft PR205:
https://github.com/yopiheart/grifon-command/pull/205
Hosted CI39091648732 FAIL:41/43 required jobs PASS,23failed,9cancelled.
Shard23's500ms override expired before a2.7s passing measurement; no scroll bug.
Test now uses configured wait + real history-reading wheel + cap-anchor event
receipt. Old-follow mutation RED8062px after15s; healthy polish GREEN3/3.
Shard9 found React18 unsupported fetchPriority prop; removed only that prop,
preserving eager loading. All3 previously failing journey/320/375 console cases
PASS locally; broader companion-chat18-case suite continues,0failures.
Independent review of both corrections PASS,0findings. Require fresh green CI.
Neil requested macOS-inspired translucent sidebar/floating conversation rows,
then a static-first mascot on login/refresh. Earlier merge/release request remains
active with these final refinements. No paid/provider/backend changes.
PR202 design merged d79bd602; PR203 merged 9e3b0996 (main CI39087600268 PASS).
PR201 live voice remains paused; Android microphone test was never started.
No Grok provider work. Preserve unrelated primary and voice worktrees.

## Changes
One shared charcoal/pearl sidebar material on desktop/mobile; borderless rows,
quiet selection/gold marker, approved small static Grifon portrait, actual title,
preview and relative time. Footer belongs to pane. Search/drafts/nav unchanged.
Pearl drawer muted ink strengthened after independent contrast finding.
Header shows transparent startup.png while the single iframe initializes, then
crossfades only after true first rendered frame. Error/retry/reduced motion kept.
Poster: 512px transparent export of unchanged approved 3D renderer/neutral pose;
no AI generation/bitmap retouch/model edit. Original neutral.png unchanged.
DESIGN.md records the scoped sidebar and startup treatment.

## Success and verification
Success: readable floating sidebar in both themes/desktop/mobile; static mascot
then stable animation handoff. Failure: contrast/clipping, keyboard/draft/search
regression, dots-only/blank slot, layout shift or duplicate renderer.
Final build PASS; final serial Vitest PASS1681, same32 opt-in skips (132files/9skips).
One prior repeat hit an existing Git-fixture5s timeout; isolated rerun PASS9/9,
then full serial PASS. No assertion or unit timeout was changed.
Bundle leak, voice/eval parity, domain language, PowerShell ASCII, artifact
anchors, design lint and whitespace checks PASS.
Startup RED original no-visible-still; all26 unique final cases have passing
runs. One desktop screenshot timeout passed on unchanged explicit rerun.
Continuity final PASS6/6,0retries; iframe/window/canvas/drafts/state retained.
Contrast RED4.037:1; GREEN darkdesktop/lightmobile2/2 above4.5:1.
Visual capture6/6 at1280x900,375x667,390x844, with both light-mobile recaptures2/2.
Firefox152/WebKit26.5 PASS2/2, both themes and keyboard-size/drawer/search.
Independent correctness+brand review PASS,0remaining findings, BRAND_PASS45/50;
continuity ledger change separately reviewed clean.
All111 unique relevant browser cases PASS: initial104 passed plus7 external
origin-fixture setup failures; corrected only external helper port, rerun7/7
PASS,0retries/skips. Initial reports retained; no product assertion failure.
Actual Android keyboard was verified by Neil on prior design; latest styling
uses desktop viewport/engine simulation, not a fresh physical-phone run.
External QA: F:/CodexQA/grifon-sidebar-20261018 and
F:/CodexQA/grifon-mascot-first-paint-20261018.

## Release and live evidence
New sidebar not published yet. Prior main live smoke uses byte-unmodified
production app plus network-only synthetic account/responses, not real auth.
Baseline main live PASS4/4, both themes/mobile/desktop; deterministic synthetic
auto-invite removes test entry race. No real email, provider call or prod write.
Main deployment reported completed Dpm3bapc8eZBmu2QCxP9W1YBeqL5.

## ▶ NEXT ACTION
Commit/push the verified corrections while broader console checks finish, then require
fresh hosted CI before the authorized merge. Verify resulting live mobile/desktop
screens with synthetic-network coverage distinguished from real backend/phone.
