# NOW - the resume doc
**Stamped: 2026-10-15; fixture video delivery verified, rollout approval pending**

## Active task and authorization
Workspace F:/CodexWorktrees/61f5/grifon-command.
Branch codex/ugc-fixture-delivery, base codex/ugc-cloud-linked-fixtures at
5970389f (draft PR196 https://github.com/yopiheart/grifon-command/pull/196).
Neil requested fixture video results in chat and Grifon Assets, fixtures only,
no paid generation. Local implementation/checks authorized. New migration and
push/automatic preview deployment are NOT yet approved. No merge, production
release, provider calls, auth changes or new paid services.

## Success and failure contract
Completed NEW linked fixture jobs expose one private durable result receipt.
The same playable sample and identity appear in chat, cloud jobs and Assets;
closing/reopening/reloading never starts a job or duplicates a saved result.
Failed/cancelled/legacy jobs receive no substituted READY outputs. Preserve input
snapshots, frozen review and fresh approval on editable input/review copies.
Owner isolation, exact version/bytes, stale account/chat guards and PHP0 required.
Verify SQL/client/media tests, shared HTTP closed-browser execution, playback/
download/hash/reload/Assets at375/390/1280, existing suites, build/test, applicable
checks and fresh independent correctness/brand-contract reviews.

## Implemented boundary
There was no named Assets module. New read-only Companion Assets combines the
existing authenticated video-library read seam with READY fixture receipts.
Private grifon_fixture.results has one entitlement per new linked request/version,
created by job INSERT trigger and atomically READY when existing worker completes.
No historical backfill. READY metadata immutable after later input/job edits.
New owner-only get/list RPCs; existing functions/grants/jobs columns/worker/cron
unchanged. No Storage metadata writes, uploads or R2 copies.
Generic silent8s360x640 MP4 is an immutable server-bundled test sample; NOT generated
from brief/reference/photos/voice. Receipt persists version, not a signed URL.
Read-only authenticated /api/fixtures/video checks current user JWT and READY
receipt before pinned bytes. Browser verifies MIME/size/SHA then uses revocable
object URLs. No public fixture file or token URL persisted.
Manifest v1 / grifon-companion-fixture-video-v1,19302bytes, SHA256
18a1f643983fec42567a1fc31f59d1fcf386e6c927ca71c56fc7917029f5a7e2.
Retain v1 while saved receipts reference it. New bytes require new version.
SQL supabase/companion_cloud_fixture_results.sql NOT activated. Supabase CLI absent;
existing repository named SQL convention retained, no install or remote writes.

## Checks and evidence so far
Core SQL/client20 PASS; media/API9 PASS; independently rerun29 PASS.
Final build and bundle-leak11bundles/0markers PASS. Final browser35/35 PASS;
existing reference18/job17 PASS (70 browser cases across current slice/regressions).
Forced completion-between-reads race RED then GREEN: bounded pending polling now
continues for COMPLETE; independent probe reaches READY and halts at120 if stuck.
Brand fixes: reserved player size/ratio, opaque-ID-only wrapping, truthful footer.
Independent correctness PASS0findings; contract/React PASS, BRAND_PASS44/50,0nits.
Final full Vitest1829 PASS/32 existing gated skips,143/152files, exit0 with
--maxWorkers=1 --no-file-parallelism (all cases/timeouts unchanged). Earlier default/
bounded runs hit existing worker startup timeout and anchor sandbox filesystem/
5s timeout failures; isolated worker3/3 and anchors9/9 PASS. Cause unproven; serial
pass does not establish ordinary parallel-run reliability. No skipped/bypassed gates.
check:codex26 PASS; voice-sync, eval-prompts, domain, anchors, diff PASS.
Generated drawPlan snapshot noise verified semantically equal to HEAD then restored.
Evidence .tmp/ugc-fixture-delivery-final/, final-{build,test-serial}.log,
.tmp/fixture-delivery-correctness-final.json and *-recheck*.log. Review screenshot
.tmp/ugc-fixture-delivery-review.png. Narrow29 independently passed; race RED/GREEN
and current-source35 browser cases preserved. No dependencies/tuned files changed.
SQL reviewed SHA256 8BCDCA650434C163E2C50EFF8AC575152F388CFD668676B3897D0ECC2FB6FF7B.
No hosted activation or native delivery evidence for this slice yet.

## Existing hosted baseline and preserved work
GRIFON AI varoqxjccqmskzeejagn, same enrolled owner/private input caps.
Prior linked source b0f0efde native smoke passed:1 snapshot/6objects/92683bytes/
6jobs,zero spend. Five post-close ticks captured before reconnection; recovered
inputs/review survived reload with copied approval cleared. PC not shut down.
Evidence .tmp/linked-correctness-native*. Input snapshot reuse verified.
Existing tested linked preview (preserve legitimate sign-in):
https://grifon-command-9q5uq05ud-neilmaglayabusiness22-2085s-projects.vercel.app/app?cloudFixtures=1
User ambient prior input preview:
https://grifon-command-408r86bmf-neilmaglayabusiness22-2085s-projects.vercel.app/app?cloudFixtures=1
Never transfer sessions; new origins may need direct inline OTP user handoff.
Physical second device/native cleared-browser recovery remain unverified.

## Next actions
Reviewed build and all required checks complete. Commit locally and obtain approval
for exact migration and push/preview. Only then apply, create/attach draft PR stacked
on196 and run signed-in native chat/Assets playback/reopen. Prior linked rollout
approval does not authorize this new schema/deployment.
Real reference analysis, brand plans, paid generation, real output storage and
identity/voice quality remain future slices with real assets/approved paid spec.
Runtime/roadmap: workflows/ugc_reference_implementation_plan.md.
