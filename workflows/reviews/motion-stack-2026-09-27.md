# Motion stack merge-readiness review

Date: 2026-09-27. Scope: PR143 -> PR144 -> PR149. No merge or deployment.

## Reviewed revisions

| PR | Head | Base | Independent reviewer |
| --- | --- | --- | --- |
| 143 | b2247a268b6a723c7f38649ef4216e88925ea49d | main at 5d1b583c | Codex review143 |
| 144 | d9274f9315d81fa11dd1fed48f681802b775f9ec | PR143 head | Codex review144 |
| 149 | 48a661a21ba55be1b53c25f16602b9bd4d1594db | PR144 head | Codex review149 |

All three ancestry checks passed after fetching these remote refs. Each reviewer
worked independently of the builder. No merge-blocking code finding was reported.
The two P3 fixes below are included in the subsequent PR149 review-fix commit;
the ancestor PR143/144 heads remain unchanged. The combined stack includes them.

## Findings and verified fixes

1. Demo hash checker reported missing/corrupt embeds but exited successfully.
   It now sets exit code 1 after retaining diagnostic output. Review143 reran
   actual source with filesystem writes and process state intercepted: valid
   shipped embeds exit 0; missing or corrupt portrait/landscape exit 1. The
   original code incorrectly exited 0 for all four negative cases. All ten
   original/fixed outcomes were verified; saved QA evidence was not overwritten.
2. Spotlight revision checker ignored explicit media-tool paths and assumed an
   npm cache containing Windows/x64 FFprobe. It now guards absent cache, honors
   overrides, resolves platform/architecture fallbacks and validates paths.
   Review144 independently exercised actual discovery code with mocked inputs:
   absent cache plus overrides, overrides taking precedence, cache fallback,
   and clear missing-FFprobe failure all behaved correctly. Original failures
   were reproduced. Execution stopped before rendering; no baseline changed.

## Independent creative-artifact verification

- PR143: approved skill-patch SHA-256 and candidate/installed skill identity,
  MP4/embed hashes, encoded contact sheets and production-script syntax pass.
- PR144: all eight new MJS files parse; listed asset/export hashes match;
  all four exports pass strict full FFmpeg decode. Encoded Spotlight portrait
  and landscape sheets retain product and closing lockup.
- PR149: comparison and portable twin pass Chromium checks at 390x844 for
  play/pause, seek, restart, soundtrack exclusivity and no horizontal overflow,
  JS errors or media errors. The twin also plays through file:// to 32.90s.
  Pilot works through its range-capable server. Both builders reproduce
  committed outputs byte-for-byte when evaluated with writes intercepted.
  V08 fully decodes; its encoded video matches V04 and its editable composition
  matches the retained V04 source. Raw stock and isolated working audio remain
  excluded from tracked packaging.

## Parent verification on combined branch

- npm.cmd run build: PASS (TypeScript and Vite; existing chunk/Browserslist warnings).
- npm.cmd run test: PASS, 113 files / 1,401 tests; 9 files / 32 tests skipped by existing defaults.
- npm.cmd run check:codex: PASS, 32 skill entrypoints / 61 files, 26 tests.
- Bundle-leak, voice-sync, domain-language, PowerShell ASCII, artifact anchors
  and design-token lint: PASS. Artifact-anchor rebuild leaves the artifact unchanged.
- Git Bash tools/hook_gate_test.sh: PASS, 25 cases.
- Both changed verifier scripts parse; git diff --check passes.
- npm.cmd run test:e2e with CI=true and dummy local Supabase: PASS, all 56 tests.

No paid/live switches enabled, dependency installs, skill/prompt edits, product
integration, media changes or fresh creative renders were made for this review.
No direct listening, real Android-device test or fresh full audio remix was
performed. Creative acceptance is Neil's V04/V08 approval, not a metric claim.

## External status and remaining merge gate

PR143's existing GitHub verify/e2e/artifacts checks passed. PR144 and PR149 do
not yet have regular CI results because CI pull_request targets only main.
Local combined-branch checks do not substitute for fresh main-targeted CI.

PR149's Vercel commit status reports failure: **Account is blocked.** Its link:
https://vercel.com/knowledge/why-is-my-account-deployment-blocked
The status does not establish the underlying billing/security/account cause.
No account settings, billing, check requirements or deployment controls changed.
Branch-protection API inspection returned 403 (plan restriction), so required
checks could not be independently enumerated. No gate was bypassed.

Merge order remains 143, then 144, then 149, with each next PR targeting main
and fresh CI assessed before its merge. Preserve ancestry when choosing merge
strategy. Resolve the Vercel account/check failure before calling the stack
fully green. User authorization for this turn covered readiness review/fixes;
no GitHub merge was executed.

## October 3 authorized release update

Neil authorized conflict resolution, verification and ordered merging of the stack.
Main had advanced to0427297a through recovery PR146/150. All integration conflicts
were confined to NOW.md; application/tuned/config files were preserved from main.
Fresh independent Codex integration review passed exact heads3acb5f9e (143),
f15af07f (144), and9ac93d7d (149). All other motion/media/skill files and the two
previously reviewed verifier fixes remain byte-identical to the September27 heads.
Local check:codex26tests and changed-script syntax/whitespace passed.
Fresh Vercel previews succeeded for all three integration heads; the historical
account-block status is superseded by these successful checks.

PR143 merged as3681449f onOctober3 after CI37095306784 verify/e2e/artifacts and
Vercel passed. PR144/149 now target main. Parent merge propagation after review
changes only ancestry and session/review notes; it does not alter creative or
application files. Fresh checks on the final heads remain required before merge.
No new paid generation, stock-library integration, or media rendering occurred.
The shared Oceanides checkout remains untouched. Final merge/check receipts are
recorded in the individual PR descriptions; this dated report records integration
review evidence rather than replacing NOW.md as the session resume document.
