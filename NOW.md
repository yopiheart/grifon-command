# NOW - the resume doc
**Stamped: 2026-10-15; linked fixture flow verified locally, rollout approval pending**

## Active task and authorization
Checkout: F:/CodexWorktrees/61f5/grifon-command.
Branch codex/ugc-cloud-linked-fixtures, base codex/ugc-cloud-media-fixtures at
9ec358e797b3186b1cf5fae029c2edf8d8859674 (draft PR195).
Neil requested connecting cloud-saved brief/video/photos/voice to review and
fixture jobs for a continuous chat flow. Fixtures only, no paid generation.
No new remote schema activation or preview deployment is approved for this slice;
prepare the concrete reviewed migration/build before final rollout approval.
Git push automatically deploys Vercel previews, so keep new branch local meanwhile.
No merge, production release, provider calls, auth writes or paid infrastructure.

## Scope and verification contract
- Cloud pilot Prepare sample plan verifies/reuses a matching committed cloud input
  snapshot, or saves changed inputs before preparing the fixture review.
- Cloud provenance remains outside ReferenceDraft/Review fingerprint inputs.
- Confirm checks current inputs; the continuation opens cloud fixture jobs.
- Linked job intent freezes cloudReference {version:1,saveId,inputHash}; request
  identity adds saveId as fourth element. Legacy three-element identities remain.
- Native validator must resolve same-owner committed snapshot and match input hash,
  voice, language/modes, immutable brief facts and native object size/MIME.
- Accepted job preserves exact review plus source link. Reopen creates a durable
  editable local copy with media/voice and unconfirmed review; no auto-start.
- Review edits before Start are local, not cloud approval synchronization.
- Preserve original jobs/inputs, local queues, retry/cancel, account isolation,
  unknown acceptance identity and zero-spend behavior.
- Verify meaningful RED/GREEN, narrow unit/SQL suites, integrated fresh-browser
  recovery/shared fixture worker, existing cloud suites, mobile375/390 and desktop.
  Then full build/test/applicable checks and independent correctness/brand review.

## Implemented and verified
Prepare saves/verifies cloud inputs, reusing unchanged imported snapshots. Review
continues directly to cloud jobs. Provenance and durable pending/observation links
stay outside original draft/review fingerprints. Start verifies downloaded bytes,
persists its exact intent before dispatch and reconciles unknown acceptance without
using an unrelated older job. Reopen verifies all media then CAS-saves an editable
local copy with review content, exact voice and ordered photos, confirmation cleared.
Cloud-linked conflict copies also clear approval and incompatible local execution
references; original chats/jobs remain unchanged. Saved-status wording uses the
actual current snapshot, not just service availability. Busy feedback is visible;
technical IDs are collapsed under Fixture details.

New SQL replaces only grifon_fixture.validate_intent; no tables, grants, RLS,
RPC signatures, worker, scheduler, quotas or existing job data change.
Reviewed SQL SHA256:
494EB9909794C44502CFE63C4868E61E4C93F81B8240E9BE1B389535C9827B27
File supabase/companion_cloud_fixture_references.sql, apply after base jobs and
reference schemas. No schema or data writes have been made for this slice.

Final build PASS; full Vitest1800 passed/32 existing gated skips,140/149files.
New SQL55 +existingSQL79 PASS134; focused client26 PASS independently rechecked.
Current-source integrated browser19 PASS; current reference18 PASS. Existing cloud
jobs17 PASS before final display-only polish (same execution logic, not rerun).
Fresh contexts recover exact bytes/hashes/fingerprint, five roles/order, selected
voice and unconfirmed review; server fixture ticks progress while browser closed.
Missing/corrupt media, lost ACK, old-job selection while new request pending,
two-tab conflict copy, account/navigation races and truthful save status covered.
Mobile375x667/390x844 and1280x900 plus200% details; no forbidden/provider calls.
Independent correctness/security PASS, React/UI contract PASS, BRAND_PASS44/50,
zero open findings. check:codex26/26, bundle-leak11bundles/0markers, voice-sync,
eval-prompts, domain, PowerShell ASCII, artifact anchors and diff checks PASS.

Meaningful RED/GREEN: original Prepare did not cloud-save; original SQL rejected
linked identity and accepted forged association; four protocol/provenance failures;
cloud conflict copy inherited approval; mixed legacy copy failed actual book load;
cloud saved-status was falsely shown for local-only/stale reviews. All repaired.
Logs .tmp/ugc-cloud-linked-final-{build,test}.log, .tmp/linked-core-unit-{red,green}.log,
.tmp/linked-copy-load-red.log, .tmp/linked-cloud-reference-sql-{red,green}.log,
.tmp/ugc-cloud-workflow-{red,copy-red,copy-green,final-19-e2e,existing-reference-green,existing-jobs}.log.
Independent evidence .tmp/linked-correctness-final-review.json and copy probes;
screenshots .tmp/ugc-cloud-workflow-e2e-results/. Reviewed fixture image
.tmp/ugc-cloud-linked-review.png. Generated snapshot EOL noise restored only after
semantic equality verification; no dependencies or tuned content changed.

## Existing hosted baseline
GRIFON AI project varoqxjccqmskzeejagn; one enrolled fixture owner.
Read-only baseline: one committed reference snapshot, six objects, five jobs;
current intent validator MD5 d828237c62d5a4e724e5e7a679c13def.
Previous native input save/reopen/reload passed: one video, five ordered role-labelled
photos, curated Pinay Spokesperson,92,683 bytes, one snapshot/no duplicates, PHP0.
Previous build/test1737 passed/32 gated skips, SQL57/client6, browser18+17,
independent correctness/brand reviews all passed. Signed-in preview frontend e39808f0
uses repaired reference_commit function; previous final source9ec358e7 is backed up.
Original reference migration C710CABBA7ED2E36728B55CD3205E1BB3D9F842CD3FDFD4CE137E9773BE45A0E;
function-only owner-variable repair4961C16AA05884D6DBA0702D6882C926DE42B3B8235D5F674309962DBECCB195.
Prior native evidence .tmp/ugc-cloud-media-live/ and
.tmp/ugc-cloud-media-correctness-native-{saved,behavior-review}.json.
Native tests used one authenticated browser; physical second-device/native
cleared-browser recovery and target Storage race/version remain unverified.
Client bytes/decode checks plus SQL metadata checks are not future paid integrity.

## Existing browser and local helpers
Preserve user signed-in preview at:
https://grifon-command-408r86bmf-neilmaglayabusiness22-2085s-projects.vercel.app/app?cloudFixtures=1
It runs the prior slice until this new rollout is approved.
Draft PR195: https://github.com/yopiheart/grifon-command/pull/195.
New E2E Vite5194 owned PID11252/session51760; workflow=1 only works with the test
process shared HTTP interception, not as an ordinary manual production demo.
The older cloud-job harness uses DEV-only legacyCloudJobs=1 with an in-memory
input transport; strict production start/source checks remain active. New linked
cases use the shared HTTP object/job backend, including fresh browser contexts.
Prior local helpers5173/5193 may remain; do not kill unrelated processes/tabs.

## Next action
Commit the reviewed local branch and obtain final fixture rollout approval before
applying the exact function-only SQL and pushing the auto-deployed preview branch.
Then create/attach draft PR stacked on195, inspect READY source and complete native
signed-in linked save/review/start/reopen smoke with the existing fixtures.
New hosted linked flow remains NOT RUN; SQL tests use PGlite with native-shaped
Storage/auth stand-ins, browser tests use shared simulated HTTP. Physical second
device, native cleared-browser recovery and new hosted start validation remain
unverified; no paid-provider orchestration or video/Assets output is implemented.
No paid generation. Runtime boundaries/reproduction:
workflows/ugc_reference_implementation_plan.md.
