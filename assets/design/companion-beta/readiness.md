# Companion Chat invited-beta audit

Audit started 2026-10-09; resumed 2026-10-10. Frozen application base: `8d5a4be8292d653ae6f9182a1d49eac62077001a`.
Working branch: `codex/companion-beta-readiness`, based on `codex/companion-chat` (PR164).
This is the audit checklist and evidence record, not a release authorization or a resume document.

## Release decision

**HOLD.** A passing mocked journey is necessary but cannot establish live generation quality,
physical-phone behavior, deployed database correctness, or unaided first-time-user comprehension.
No deployment, invitations, production-data changes, or paid generation are authorized by this audit.

Success: an invited user can finish and retrieve an ad without losing work, crossing account
boundaries, or unintentionally starting/charging paid work. Failure: any reproducible violation
of those invariants, or a core journey with no useful recovery action.

## Button and state checklist

For each control verify its ordinary action, disabled reason, repeated tap, failed request,
keyboard/focus behavior, and narrow-screen layout. Evidence is linked in the final results below.

| Control / journey | Required result | Evidence target |
| --- | --- | --- |
| Sign in / expired login | Invalid code can retry; account change cannot display another account's draft/run | account suite; live OTP separately |
| New chat | Current draft/photo/unsent text saved first; failed save blocks navigation | navigation/account/beta suites |
| Search / select chat | Correct matches and empty state; history open reads only; no generation or debit | navigation suite |
| Studio / browser Back and Forward | Draft survives; intended route restored | account/navigation suites |
| Settings / plan Retry | Real confirmed account/plan state; unknown state fails closed; retry works | account/chat suites |
| Upload / remove photo | JPG/PNG/WebP accepted; invalid/oversize rejected; delayed upload cannot cross chat/account | chat suite |
| Send / Enter / IME | One answer per send; composition does not submit; blank/long message has useful feedback | chat/typing/beta suites |
| Microphone | Editable draft only, never sends automatically; stop/deny/error/unsupported recover to typing | glass suite; physical phones separately |
| Edit brief | Corrections are explicit field edits; fixed guided intake is disclosed | chat/beta suites |
| Generate storyboard | Complete valid brief/photo and known allowance required; double taps dispatch once | chat/beta suites |
| Regenerate image | Explicit user action; busy/history guards and allowance disclosure | chat/beta suites |
| Approve storyboard | Images ready/unflagged, known video allowance, explicit approval; double taps cannot double charge | chat/beta + quota tests |
| Stop waiting | Explains submitted work may finish/use allowance; Resume cannot overlap pending work | beta suite |
| Retry / Resume | Reuse saved run, refresh current state, never repeat finished stages from stale state | recovery/navigation/beta suites |
| Viewer open / close | Storyboard/first cut available; Escape and focus restore; mobile background inert | navigation/layout/account suites |
| Watch / download | Correct asset URL and browser action; actual playable file/audio/phone download verified separately | chat suite + live spec |
| Logout / login | Latest draft committed before logout; failure retains session/work; account isolation | account suite |
| Refresh / multiple tabs | Pending/failed-save warning; stale tab cannot overwrite newer book; conflict preserves draft | beta/unit storage tests |
| Help & support | Settings opens support; user can reach existing feedback email | account suite; mailbox operations separately |

## Bug register

| ID / severity | Reproduction and original result | Expected result | Status / evidence |
| --- | --- | --- | --- |
| BETA-01 / P1 data loss | Open two tabs for one account. Create/edit a chat in A, then save B's old book. B's whole-book write silently erases A's new work. | Stale write rejected; both drafts recoverable | Fixed with transactional revision checks and Save this chat as a copy; original failure and recovery evidence retained |
| BETA-02 / P1 duplicate work | Hold a script/image provider promise. Stop, then Resume while it remains pending. Old guard clears and the same stage can dispatch twice. A second tab/remount can also drive the same run. | No overlapping driver; refresh checkpoint before continuation | Fixed for this browser/account with operation guards, non-queued locks and fresh checkpoint reads; regression passed |
| BETA-03 / P1 duplicate debit | Two concurrent first-scene requests for one finished ad read an empty marker, then each debit a credit. Mocked original returned two allowed calls and two top-up debits. | One atomic charge per account/ad; same result on retries | Atomic debit/receipt RPC implemented; original-defect rejection and independent-session concurrency/rollback/permission checks passed on native PostgreSQL17.6 and CI17.11. Exact approved target migration installed and verified; no real-user debit performed |
| BETA-04 / P1 monitoring privacy | Provider error detail reaches raw `meta.error`/`detail` in stored lifecycle events. Exclusion of private text is not enforced. No actual secret leak observed. | Only allowlisted categories/status/counters leave the client | Fixed with client and server allowlists; original failure and privacy regressions retained |
| BETA-05 / P2 clarity | Fixed intake, device history, background limits and several disabled conditions are not clear before action. | Short English guidance visible at relevant step | Guidance added; phone-size/desktop behavior and independent brand checks passed |
| BETA-06 / P1 interrupted paid work | Close the tab during a held image request, reopen and Resume. Independent browser reproduction submitted the same scene twice because closing released the browser lock. | Persist an uncertainty marker before dispatch; never automatically repeat an ambiguous request | Durable local receipt implemented; close/reopen and read-only recovery checks passed. Manual recovery remains an operational release gate |
| BETA-07 / P2 misleading recovery | Stop during research, then Back to brief. The button opens an empty new chat despite its label; the original draft remains in history. | Return to the same brief when no run exists; explicitly label creation of a new chat | Fixed; canceled-research browser regression preserves the completed brief |
| BETA-08 / P1 automatic duplicate submission | One Resume, then a lost/missing paid output, without any user Retry, submitted another image request. Paid text 422/429 errors also replayed the whole flow. | Ambiguous paid submissions surface recovery instead of automatic re-submission; known safe pre-submit retry behavior remains distinct | Fixed with structural transport/output checks. Independent real-HTTP mocked red/green proof covers lost/malformed image, text, voice, video-ID and render results; final paid-text checks dispatch once. Tuned server ladder unchanged |
| BETA-09 / P3 cosmetic | At a narrow phone viewport after intake, the long composer placeholder wraps and clips inside its one-line field. | Placeholder fits the field | Documented cosmetic issue; Edit brief and the complete instructions remain reachable. See independent disabled-generation screenshot; no core action is hidden |

Severity: P0 active privacy/charge incident; P1 launch blocker (data loss, unintended spend,
privacy boundary, or blocked core journey); P2 recoverable usability/confusion; P3 cosmetic.
Record each new report with candidate SHA, browser/device, exact steps, expected/actual,
redacted screenshot, and retest result. Never attach real briefs, photos, tokens or raw HAR files.

## Free verification results

Free verification is complete for the reviewed, browser-local mocked contract. No open P1/P2
remains in the independently reviewed changes. The external gates below still block release.
Final commands and all 20 application hashes are recorded in [root gates](qa/root-gates.json).

| Check | Actual result | Evidence |
| --- | --- | --- |
| Production build and bundle leak check | Both exited 0; build includes the PowerShell ASCII gate, bundle scan found zero protected markers | [Build log](qa/build.log), [bundle log](qa/bundle-leak.log) |
| Full unit suite | 1,529 passed, zero failed, 32 existing skips; exit 0 | [Structured report](qa/unit-final.json), [command log](qa/unit-final.log) |
| Repository/control checks | Codex 26/26, voice sync, domain language, six prompt-sync pairs, artifact anchors, design lint and 11 accepted Companion assets passed | [Commands, exits and logs](qa/root-gates.json) |
| Focused persistence/transport units | 193 passed; TypeScript check exit 0 before the last two-line error classification fix | [Focused log](qa/focused-final.log) |
| Last paid-text unit regression | Both new cases failed before the fix; full proxy suite 25/25 passed afterward, including safe pre-submit retries | [Original failure](qa/post-provider-before-fix.log), [final proxy run](qa/post-provider-final.log) |
| Companion UI, narrow/desktop viewports | 45 unique cases green across beta10/glass17 and chat18 runs | [First run](qa/resumed-final/report.json), [chat rerun](qa/resumed-chat-final/report.json) |
| Independent HTTP/lifecycle review | 39/39 broad + 9/9 final checks passed; 43 unique cases, five image checks repeated after the last patch | [Independent report](qa/independent-review.md), [final run](qa/independent/final-seam-run.log) |
| Fresh independent diff review | PASS; original P1 paid-text finding resolved, no open P1/P2 in reviewed scope | [Diff review](qa/final-diff-review.md) |
| Independent brand/mobile layout review | 42/50, zero critical, one documented cosmetic P3 | [Review and screenshots](qa/independent-review.md) |
| Shared legacy/Producer recovery | 18/18 passed at 375px and 1280px; zero retries/skips, exit 0 | [Recovery summary](qa/resumed-recovery/summary.json), [run log](qa/resumed-recovery/final-run.log) |
| Actual migration SQL, isolated PostgreSQL | Syntax, monthly/top-up/idempotency, privileges, aged receipt and injected-failure rollback passed; single connection | [SQL result](qa/sql-local.json), [assertions](../../../tests/sql/finished-ad-meter.sql) |

The 45-case UI run first had one timing assertion that did not await the new save barrier;
the two immediate reshoot/style expectations now poll their exact single-call result. The
18-case chat rerun passed. The broader earlier 118-case run was 116 passed / 2 harness
failures; it is historical evidence, not a claimed final 118/118 pass. [Earlier report](qa/verified/report.json).

Recovery diagnostics exposed older test entry URLs that opened Companion instead of Studio,
a MarketMind fixture missing two fields already required by the server, a helper that did not
recognize the restored Producer view, and a polling expectation that assumed an automatic
paid restart. The narrow harness changes select the existing Studio route, match the current
API contract, accept the already-open view and require one render start before explicit Retry
and two afterward. Independent static review confirmed that persistence, gate, call-count and
unexpected-request assertions remain intact. Initial interrupted diagnostics are labeled as
partial runs in the recovery evidence; they are not full-suite verdicts.

The first full unit run passed 1,523 tests and failed six dialogue-prompt checks because their
mock returned an empty video-prompt array. The fixture now provides two valid `VideoPrompt`
objects; all six prompt assertions and request inputs remain unchanged. [Original unit result](qa/unit-before-fixture-fix.json).
The fixture was refined to the full output type during the final full-unit run; after that
run, all six prompt checks and six transport checks were rerun against its final reviewed
content: 12/12 passed. No application source changed. [Final affected checks](qa/dialogue-fixture-final.log).

Application hashes stayed fixed within the independent runs. Only the reviewed two-line
422/429 transport correction separates the 39-case broad run from the final nine checks.
The UI checks predate that correction and do not exercise those response codes. Final source
is bound by [the independent hash manifest](qa/independent/final-seam-source-hashes-after.json).
Original failures for [cross-tab saves](qa/red-tabs/report.json), [Stop/Resume](qa/red-stop/report.json),
[unsaved refresh](qa/red-unload/report.json), [billing/privacy](billing-privacy-original.json),
and [missing output](qa/transport-before-fix.log) are retained.

All provider/API responses in browser checks were mocked or blocked. Fixture video playback
and downloaded WebM bytes passed; this proves the controls, not generated media quality.
Playwright phone-sized Edge is emulation, not iPhone Safari or physical Android Chrome proof.

## Main integration checks, 2026-10-11

The main candidate combines Companion `889c0e1d` with main `4b36c62b`. Main's
MarketMind presentation and approved prompt are retained exactly. Build, 1,541
unit tests (32 existing skipped), static gates and 10 affected browser checks
passed. Two hostname assertion defects were reproduced before repair. The full
local browser attempt reused another checkout and is excluded; Playwright now
refuses an existing server. Full isolated GitHub CI remains required.

Native PostgreSQL 17.6 reproduced the old double charge in all four billing
combinations. The fix passed twelve observed lock-contention cases across
distinct database sessions, plus rollback, replay, aged receipt and real-role
permission assertions. Cleanup left no temporary databases, bootstrap roles or
test tables. This verifier is now an independent CI job included in the main-red
alarm. [Database results](qa/main-readiness/database-result.json),
[local checks](qa/main-readiness/local-summary.json),
[independent review](qa/main-readiness/independent-review.md).

Initial read-only catalog verification on GRIFON AI found PostgreSQL 17.6,
matching credit/rate-limit functions, appropriate RLS and service-only credit
execution. `consume_finished_ad` was absent before its separately approved
installation recorded below.
The earlier PR164 Vercel account block is superseded by a successful current
preview check. [Draft PR177](https://github.com/yopiheart/grifon-command/pull/177)
now targets main. Its first database CI attempt correctly rejected the Docker
bridge address; the reviewed workflow correction runs the unchanged verifier
inside the database service with read-only sources. Exact-head CI remains required.

The corrected database job passed all24 native checks on CI PostgreSQL17.11.
Build/unit/static/artifact jobs passed; the browser job hit its15-minute cap after
48 of224 unique cases (45 first-pass,2 retry-pass,1 persistent failure). The stale-tab
failure still displayed both correct conversations and a Saving footer. Local
instrumentation reproduced it on the correct candidate and observed the save
complete5.83s after Enter, beyond the default5s assertion. Two visible software-rendered
avatar canvases ran at3-5fps; no correctness defect was established by that failure.
All224 browser cases are now split across4 independent one-worker runners with
the same15-minute cap. CI expectations receive15s (local5s; test60s and retry1
unchanged). No assertions or real avatars were removed. The same two affected
cases passed6/6 across3 local repeats, zero retries/skips; saved conversations,
copy/reload recovery and active-tab1/second-tab0 image-call assertions passed.
Full hosted results remain required. [Browser timing proof](qa/main-readiness/browser-timing-result.json),
[initial cloud summary](qa/main-readiness/ci-pre-shard-summary.json),
[cloud database proof](qa/main-readiness/ci-database-result.json).

The [exact additive migration proposal](qa/main-readiness/database-rollout/finished-ad-meter-proposal.sql)
passed independent source review and a separate native rehearsal: all seeded rows
were preserved, a second application refused safely, and a deliberately invalid
local postcondition rolled back the new function completely.
[Rehearsal evidence](qa/main-readiness/database-rollout/rehearsal-result.json).
The user approved that exact proposal separately. Migration
`20261011072946_companion_finished_ad_meter_atomic` is installed on GRIFON AI.
Fresh catalog hashes, owner, search path, service-only ACL and table RLS match.
A publishable-key anonymous REST probe with all-null arguments returned
`401 / 42501 permission denied for function consume_finished_ad`, proving cache
resolution and denial. A read-only service-role all-null SQL call reached the
expected invalid-input guard. No valid debit against a real user was performed.
[Target verification](qa/main-readiness/database-rollout/target-result.json).
The frozen proposal/manifest's proposal-only status is historical; approved bytes
remain unchanged. Valid service-role HTTP debits and live generation remain
separate live tests.

## External release gates

- [ ] Complete exact-head CI on the integrated main-target PR and verify its hosted candidate. The old [blocked status](qa/hosted-checks.json) is historical.
- [x] Prove exactly-once debit, rollback and permissions on isolated native PostgreSQL with real concurrent sessions.
- [x] Approve/apply the exact target migration; verify catalog, permissions, REST cache resolution/anonymous denial and read-only service-role input validation.
- [ ] Real OTP delivery, expired session, and second-account isolation on the release candidate.
- [ ] Physical iPhone Safari and Android Chrome: keyboard leaves Send reachable; long transcript scrolls; drawer/viewer focus; mic permission allow/deny/revoke; photo selection; playback, sound and download.
- [ ] Approved live test from `live-test-spec.md`: product identity, playable finished video, intelligible voice/audio, correct offer, download and return-to-history.
- [ ] Three first-time testers independently complete the same journey without coaching. Observe rather than guide; repeated confusion becomes a bug. Testers/invitations require separate authorization.
- [ ] Existing Help & support channel is monitored by a named human during the beta. Verify a submitted test report reaches the mailbox only with authorization to send.
- [ ] Authorized operator verifies monitoring ingestion and alerts on the deployed candidate. Zero known P0/P1 findings remain.
- [ ] The beta operator can resolve an uncertain production report without guessing whether a paid request completed. Testers understand the manual-recovery limitation below.

## Interrupted-work limitation

An unresolved production receipt blocks more paid work for that chat/run. **Check saved
progress** reads saved output without restarting production. When the outcome cannot be
established, support-assisted recovery is required; there is no automatic receipt expiry.
Even a later known quota/service denial can retain the receipt if earlier steps may already
have completed. This is a conservative safety stop, not seamless retry or durable background
jobs. Browser storage clearing, another browser/device and older clients are outside browser
coordination guarantees. Local history is not cross-device history.

Support must verify the request outcome and saved artifacts before any manual recovery.
Do not clear a receipt, start another paid request or increase a test budget merely to make
the UI proceed. A read-only result can still be opened/downloaded. Any support action that
changes production records or starts paid work needs its own authorization. Validate this
operational path before inviting testers; no manual recovery was performed during this audit.

## First-time tester protocol

After separate invitation approval, give each of three testers the same product photo and
this goal: “Make an ad for this product, review it, download the result, then come back and
find it again.” Do not name buttons or explain the intake. Observe where they hesitate,
misinterpret a control, ask for help, lose work, or cannot proceed. A clearly labeled mocked
preview can establish usability only; real generation needs its own approved cost spec.
Record anonymized tester ID, candidate SHA, device/browser, completion without help,
confusion/reproduction steps and follow-up bug ID. Two testers confused by the same step
is a P2 defect to fix/retest; any data/spend/privacy/core blocker is P1 even for one tester.

## Feedback and monitoring procedure

Reuse Settings → Help & support → the existing Support page/email; no new account or external
service is required. Ask testers for the step/button, approximate time, browser/device and
expected/actual behavior. Briefs/photos are optional private content and must not be included
automatically. Redact screenshots before sharing.

Use existing producer lifecycle events (`node_fail`, `check_fail`, `check_skip`) and server
charge/run records for diagnosis. Monitoring should carry stable categories, stage, numeric
status and run correlation only, never raw provider errors, request bodies, prompts, auth
headers, or uploaded media. Source tests prove filtering; actual deployed ingestion/alert
delivery is an external gate, not inferred from source. During the invited beta, a human
checks new failures and feedback daily and before expanding the group. Any privacy,
unintended-charge, lost-work or no-recovery report pauses expansion until reproduced/fixed.
