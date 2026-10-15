# NOW - the resume doc
**Stamped: 2026-10-15; cloud reference fixture build verified, rollout pending**

## Active task and authorization
Checkout: F:/CodexWorktrees/61f5/grifon-command.
Branch: codex/ugc-cloud-media-fixtures; base codex/ugc-cloud-fixtures at 4b882896.
Neil requested cloud save/reopen of reference video, photos and selected voice
across devices, fixtures only. Reuse existing GRIFON AI and owner-only pilot.
No paid generation, new paid infrastructure, merge or production release.
Code and exact migration are reviewable; no hosted changes made for this slice.
Remote publication/activation pending explicit rollout approval: AGENTS.md100/146.
Vercel automatically deploys Git pushes (confirmed READY deployment for prior
4b882896), so hold push/PR creation until that approval; do not disable CI.

## Implemented locally
- New private bucket grifon-fixture-reference-media and reference_snapshots under
  grifon_fixture; existing allowlist/auth.uid ownership, no auth-user writes.
- Native reserve/commit/list/get RPCs, immutable content-derived save identity,
  retry/lost-ACK reconciliation, atomic publication only after complete objects.
- 6,000,000 bytes/file, max five photos, 20 snapshots/reservations and 200 MB/owner.
  Pending/orphan uploads reserve worst-case bucket capacity before publication.
- New-bucket INSERT permits only object.upload plus exact owner reservation.
  Signed-upload minting/alternate operation probes denied; no UPDATE/DELETE policy.
  Existing buckets, job functions, schedulers and production cleanup unchanged.
- Client authenticated downloads verify bytes/MIME/decode/dimensions/duration and
  original fingerprint. Metadata IDs/order/roles and voice ID/name/source retained.
  Cloud keys/receipts do not enter local draft/media hash inputs. No durable URLs.
- Cloud reference briefs under existing ?cloudFixtures=1. Local save vs cloud ACK
  shown separately. Open copy in chat creates a new editable local chat, persisted
  through existing IndexedDB CAS before selection. Original work preserved.
- No review/confirmation/queue/run imported, no job/generation started. Existing
  cloud jobs remain separate and are not rebound to these media snapshots.
- Dev shared HTTP fixture bridge uses production client against simulated backend.
  Empty-browser recovery and unavailable voice retain original bytes/selection.

## Verification
Final build PASS; full Vitest 1737 passed, 32 existing gated skips (138/147 files).
Focused new client6 + actual SQL/roles57 PASS. check:codex26/26 PASS.
New browser18 + existing cloud jobs17 PASS; supplemental mobile/desktop3 PASS.
Mobile375x667/390x844, desktop1280x900; no forbidden/provider/job calls or errors.
Independent correctness/security PASS; BRAND_PASS43/50, no open findings.
Meaningful RED/GREEN: missing original recovery UI/module; StrictMode replay lock;
old signed-upload policy14 failures vs fixed57 SQL PASS; independent probe agrees.
Fixed signed-upload bypass with operation gate and StrictMode effect lock reset.
Bundle-leak, voice-sync, eval-prompts, domain, PS1 ASCII, artifact anchors PASS.
Generated snapshot line-ending noise restored; no accepted media or tuned edits.
Evidence: .tmp/ugc-cloud-media-final-{build,test}.log, .tmp/cloud-reference-unit-green.log,
.tmp/cloud-reference-operation-{red,green}.log, .tmp/ugc-cloud-media-e2e-*.
Independent probe .tmp/ugc-cloud-media-correctness-probe.json; review image
.tmp/ugc-cloud-media-review.png; mobile/DPR2 evidence .tmp/ugc-cloud-media-e2e-brand/.

## Hosted boundary and remaining work
New migration NOT applied, new bucket NOT created, new frontend NOT pushed/deployed.
Exact reviewed SQL SHA256:
C710CABBA7ED2E36728B55CD3205E1BB3D9F842CD3FDFD4CE137E9773BE45A0E
Target: Supabase varoqxjccqmskzeejagn (existing GRIFON AI). Existing one-owner pilot.
Storage operation helpers installed; prior Storage policies empty, confirmed read-only.
Baseline security advisor saved in tool state: 11 INFO/no-policy, 3 unrelated WARN.
SQL tests use PGlite storage/auth stand-ins; browser tests use shared simulated HTTP.
Actual authenticated hosted Storage upload/download, exact running Storage version
and delayed-stream race remain unverified. Released Storage v1.81+ reauthorizes
standard upload completion as caller; signed-upload bypass is blocked by new gate.
Server metadata checks do not certify media SHA/decode for future paid execution.

## Existing live job slice
Draft PR194: https://github.com/yopiheart/grifon-command/pull/194.
Backend private fixture job schema + five-second cron remain live independently.
Prior actual signed-in list/start/reopen/retry/cancel PASS, all recorded spend zero.
User's current tested preview (earlier source, signed-in session preserved):
https://grifon-command-p7o5wkgwg-neilmaglayabusiness22-2085s-projects.vercel.app/app?cloudFixtures=1
Fresh preview domains need normal invite unlock + inline email OTP on that origin;
after login fully navigate to /app?cloudFixtures=1 because auth drops pilot query.
No credentials/session values read or copied. Physical PC shutdown not tested.

## Next action
Obtain final approval for isolated fixture migration + branch push/preview rollout,
then apply reviewed SQL, verify advisors/roles, push/create draft PR stacked on194,
attach it, inspect automatic preview and complete real signed-in Storage smoke.
No paid generation. Detailed behavior/checks: workflows/ugc_reference_implementation_plan.md.
