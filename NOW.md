# NOW - the resume doc
**Stamped: 2026-10-15; Supabase cloud fixture executor activated**

## Active task and authorization
Checkout: F:/CodexWorktrees/61f5/grifon-command.
Branch: codex/ugc-cloud-fixtures; base codex/ugc-background-fixtures at938f5c29.
Neil requested fixture jobs that continue with the PC off and reopen in chat.
He chose existing GRIFON AI with separate fixture tables and supplied his login
email for owner-only pilot enrollment. No paid generation, new paid infra, merge
or frontend deployment. No tuned prompt/model/settings changes or auth-user writes.
Target: Supabase varoqxjccqmskzeejagn, PostgreSQL17, free plan, healthy at inspection.

## Implemented and activated
- Applied companion_cloud_fixtures and companion_cloud_fixtures_schedule migrations.
  Private grifon_fixture jobs/events/receipts/allowed_owners tables; RLS on all4.
  Only Neil's existing account enrolled. Native RPCs derive auth.uid and verify
  enrollment/ownership. Anon RPC, client table writes and worker execution denied.
- Dedicated cron job1, grifon-cloud-fixture-tick, active every5seconds. Advances one
  due synthetic step per job per invocation, max20; reads never drive work.
  No provider/network/generation calls. ActualCents constrained zero.
- Exact immutable intent text and canonical owner/chat/plan identity. Owner caps
  total100/active3, same-chat active guard, idempotent starts/command receipts,
  retry revision guard, race-safe cancel/invalidate, preserved successful attempts.
- Canonical raw JSON/plan and UTF-16/ECMAScript whitespace validation match client.
  Independent review found encoding/parity holes; failing repros preserved and
  fixed before activation. Unsupported fractional/integer-index JSON extensions
  rejected; official reviewed plan fields use text and safe integers.
- Signed-in Companion opts in with ?cloudFixtures=1. Cloud fixture jobs navigation
  lists/reopens server jobs even without browser drafts. Frozen direction, script,
  visual timeline, voice and illustrative quote remain inspectable in chat.
- Lost ACK reconciles same intent; failed-before-acceptance has explicit same-intent
  retry. Command errors survive automatic reads. Local SQLite jobs remain separate.
- Uploaded assets remain on original device. No generated video/music/voice/Assets.
  Dev ?cloud=1 is explicitly labelled simulation; only test advance() ticks it.
- Pinned dev-only @electric-sql/pglite0.5.10; unrelated optional peer entry retained.

## Verification and live evidence
Build PASS; final full Vitest PASS1674,32 existing gated skips.
Focused actual SQL/roles22 + cloud adapter5 PASS. check:codex26/26 PASS.
Playwright newcloud17 + existingchat/intake/review/queue54 + localbackground13 PASS,
84 total, zero skips/flakes/provider/API calls/page errors. Mobile375/390/1280.
Independent smoke PASS; BRAND_PASS43/50 zero findings,200% icon crops inspected.
Independent final correctness/whole-validator parity review PASS, no open findings.
Bundle-leak, voice-sync, eval-prompts, domain, PS1 ASCII, artifact anchors PASS.
Goal REDs: missing entry/module; duplicate identity/pretty-reordered plan/duplicate
keys and Unicode overflow/blank text. Same regressions passed after fixes.
Live Supabase fixture started at11:19:45UTC; eight cron ticks completed at11:20:25,
revision10, all8 attempts1, actualCents0. Confirmed both owned local processes and
5173/5174 listeners absent at11:19:54 and11:21:46; first remote read11:21:13.
Server events and successful cron history prove execution with no local executor
or polling. Physical PC shutdown and live browser JWT were not performed.
Actual hosted wire decoded through production cloud client, list/get only.
Duplicate calls on two distinct PG backends returned one job/one start event.
MCP serialized calls; observed lock contention/concurrent overlap NOT established.
Post-activation security advisor adds only4 expected private RLS/no-policy INFOs;
no new WARN findings. Existing unrelated warnings preserved; no policies weakened.
Evidence local-only .tmp/ugc-cloud-{hosted-proof,client-recovery-proof,concurrency*-proof}.json,
.tmp/ugc-cloud-{test-final,browser-final,existing-regression,background-regression}.*,
.tmp/ugc-cloud-browser-critic/ and .tmp/cloud-fixture-*-{red,green}.log.
Generated QA PNGs restored; continuity outputs moved under ignored.tmp; snapshot
line-ending noise restored. No accepted media changes or paid/live flags.

## Delivery and runtime
New draft PR/commit pending final backup; stacks on PR193, no merge/deploy requested.
Current safe host session1573, host16456, worker19636 while alive atlocalhost5173.
Local journal .tmp/companion-background-live/jobs.sqlite preserved across restart.
UI simulation: http://localhost:5173/companion-chat-preview.html?cloud=1.
The signed-in cloud chat UI needs its frontend branch deployed before online use;
existing Vercel account block remains an external limit. Live JWT transport not
verified; no credentials/session files read or copied. Backend is live independently.
Schema/schedule/reproduction: workflows/ugc_reference_implementation_plan.md.
Cron deactivation command preserves jobs and appears in its activation SQL file.

## Next action
Finish GitHub backup/draft PR attachment and actual remote check status.
Then authenticated frontend rollout/real JWT smoke after hosting is unblocked.
Before paid production: cloud media, reservations/submission reconciliation/budget
ledger, verified provider/voice contracts, real reference analysis and exact-input
approved paid pilot. Local/sample confirmation grants no spend authority.
