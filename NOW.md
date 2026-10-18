# NOW - the resume doc
**Stamped: 2026-10-18; approved sidebar, mobile composer follow-up**

## Active task and boundaries
Checkout: F:/CodexWorktrees/chat-design-release/grifon-command.
Branch: codex/chat-sidebar-vibrancy; integrating origin/main ece79ac9 (PR204 screenshot capture).
Draft PR205: https://github.com/yopiheart/grifon-command/pull/205
Earlier merge/release authorization remains active. Require green CI before merge.
Neil approved the light/dark sidebar, then requested row avatars hidden until
distinct mascot choices exist and the mobile typing/deleting bounce fixed.
Do not touch the unrelated primary C:/ checkout or the voice worktree.
PR201 live voice stays paused; Android microphone test was never started.
No Grok work, paid calls, provider/backend changes or production data writes.

## Implementation
One translucent charcoal/pearl sidebar material with borderless rows, quiet
selection/gold marker, actual title, preview and relative time; unified footer.
Row portraits and their 37px + 11px gutter are removed; central mascot preserved.
Mobile search stays full-width; footer returns only after leaving search.
Light drawer muted text uses body-strength ink for contrast over the dim veil.
Header startup.png is a transparent512px export of the unchanged approved3D
renderer, shown eagerly until the single iframe reports its first rendered frame.
Retry/error, reduced motion, bounds and persistent renderer remain intact.
Video confirmed35recording-pixel bounce from Saving/Saved note wrapping, while
input height, keyboard and header stayed fixed. Browser RED:19.5CSSpx.
Footer now reserves natural space for both normal messages in one grid cell;
only the visible p#companion-save-status carries truthful accessible status.
Errors/conflicts can expand, and retry/recover controls are preserved.
Autosize, visualViewport, persistence and scroll handlers were not changed.
Three existing beta assertions now target the live status p, retaining their
text-prefix and visibility checks; hidden sizing siblings cannot satisfy them.
DESIGN.md records deferred portraits and stable save-note sizing.

## Contract and local verification
Success: no row avatars/gutter; same-line type/delete has no composer/footer
bounce; natural multiline growth and readable errors; latest reply accessible.
Failure: keyboard overlap, lost drafts/reading position, clipped/error text,
false save status, duplicate renderer, blank mascot or remount.
Final build PASS; full serial Vitest1681PASS,32existing opt-in skips;
132filesPASS,9skipped,238.84s. Quiet reporter buffered output; no restart.
Own snapshot line-ending-only churn was verified and restored.
Voice/eval parity, domain language, PowerShell ASCII, artifact anchors,
design lint, bundle leak and whitespace checks PASS.
Final native discovery345cases,0errors (4new regression cases).
Valid old-code RED19.5px>1; fixed thin control0px across9geometry receipts.
Final composer-actions12/12PASS,0retries/skips:4new320preview/390production
light/dark cases plus8existing typed/dictated persistence, tooltip/touch cases.
Independent narrow 19-case suite PASS, 0 retries/skips: conflict/copy, storage
errors, keyboard, sidebar/search, continuity and appearance. Total 31 cases PASS.
Final filled-sidebar 2/2 plus visual journeys 2/2 PASS: 35 unique final checks,
0 failures/retries/skips. All CLI exits 0; initial harness reports kept separately.
Fresh independent correctness and brand review PASS, 0 findings, BRAND_PASS45/50.
Both themes reviewed at 1280px and 375px, with sidebar200%, save transitions,
keyboard, multiline cap, storage error/retry and desktop conflict-copy captures.
31-case receipts show 0px motion; measured latest-reply clearance 35.86px.
Prior source startup26 unique PASS; continuity6/6 and contrast2/2 passed.
Earlier111 unique relevant cases passed; initial setup/capture reports retained.
Current motion QA: F:/CodexQA/grifon-composer-motion-20261018.
Earlier QA: F:/CodexQA/grifon-sidebar-20261018 and
F:/CodexQA/grifon-mascot-first-paint-20261018.
Neil confirmed latest fix on actual Android: no composer shake in light/dark,
approved release. Desktop engine simulation is not physical Safari hardware.

## CI and deployment
Follow-up pushed fe351eadfb330181aef4e3516157bd178c7bc904; GitHub head verified.
CI39096735857 attempt1: all43 required jobs budget-blocked before start;
345 native browser cases NOT RUN. All43 annotations audited, no artifacts.
Neil reports budget unblocked; root reran failed jobs as attempt2 on exactfe351ead.
Prior efdc19a0 CI39093307073 finished:23started jobs PASS;
172/172executed browser cases PASS (one capture retry),20unstarted shards
covering169cases blocked by Actions budget. All20 annotations confirm budget.
Attempt2 is running; no billing/workflow change or gate bypass.
Previous CI39091648732 failures were repaired and retained in QA reports.
Exact fe351ead preview READY verified: dpl_FF2jjjb8cHdoEmFYi6mta9pPgSsG,
grifon-command-6lrtqczhg-neilmaglayabusiness22-2085s-projects.vercel.app.
Production now main ece79ac9 (PR204), deploymentE8SZ5tFVFkmYjW3fiM52fAN7uZjW.
Old-main live baseline4/4PASS using unmodified deployed bytes and network-only
synthetic auth/API responses; no real auth/email/provider/prod writes.
Postmerge verifier checks no portraits,12px inset and16px clearance, still gated
approvedReady=null until root confirms new production Ready plus merge SHA.

## Integration and next action
Main advanced via PR204: default Chromium screenshot path only; NOW-only conflict.
Retain main playwright.config.ts exactly; approved application blobs unchanged.
Complete old CI audit, push integration, require fresh green CI before PR205 merge.
Confirm production Ready and exact merge SHA before opening postmerge verifier.
Verify live both themes/mobile/desktop with synthetic coverage disclosed.
