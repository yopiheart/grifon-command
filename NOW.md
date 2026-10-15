# NOW - the resume doc
**Stamped: 2026-10-15; native cloud reference save/reopen verified**

## Active task and authorization
Checkout: F:/CodexWorktrees/61f5/grifon-command.
Branch: codex/ugc-cloud-media-fixtures; base codex/ugc-cloud-fixtures at 4b882896.
Neil requested cloud save/reopen of reference video, photos and selected voice
across devices, fixtures only. Reuse existing GRIFON AI and owner-only pilot.
No paid generation, new paid infrastructure, merge or production release.
Neil explicitly approved "Approve fixture rollout" for the reviewed private
storage migration and commit e39808f0 push/preview. Exact migration applied
successfully; e39808f0 pushed. Vercel preview is READY. No production
release or paid generation. Draft PR195 stacks on codex/ugc-cloud-fixtures /194.
The signed-in native smoke found and fixed a commit-only SQL name collision.
The reviewed function-only repair was applied within the approved fixture rollout.

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

Native smoke on the signed-in preview PASS: one reference video, five photos and
curated Pinay Spokesperson selected voice uploaded and reopened into a new editable
chat. Ordered roles product/character/clothing/product/character retained; decoded
video 90x160/0.5s and all five photos 745x997. Original local chat preserved; edited
copy and media/voice survive reload. Cloud list refresh recovers the original
snapshot after reload. Repeating identical save keeps one committed snapshot and
six objects, 92,683 bytes, pending zero. Independent metadata audit verified local
file SHA256/server ETag/size/MIME, manifest identity/fingerprint and exact voice.
Existing five jobs remain unchanged, actualCents all zero. No generation started.
Evidence .tmp/ugc-cloud-media-live/{reopened-dom.txt,reopened-media.json,
original-and-copy-dom.txt,cloud-list-after-reload-dom.txt,cloud-list-after-reload.png}
and .tmp/ugc-cloud-media-correctness-native-saved.json.

Native defect: Storage's real owner column collided with reference_commit's local
owner variable. Initial save left the same pending reservation and six uploaded
objects; no incomplete snapshot was published. Rename only the local variable to
request_owner; add real owner/owner_id columns to the test Storage stub.
RED original13 failed/44 passed; fixed SQL57 and independent client+SQL63 PASS.
Full repaired-source build/Vitest1737 passed/32 gated skips/check:codex26 PASS.
Logs .tmp/cloud-reference-native-owner-*.log; independent repair probe
.tmp/ugc-cloud-media-correctness-native-commit-probe.json. Generated snapshot EOL
noise verified and restored; no unrelated changes.

## Hosted boundary and remaining work
Reviewed migration applied successfully; new frontend pushed at e39808f0.
Initial reviewed SQL SHA256:
C710CABBA7ED2E36728B55CD3205E1BB3D9F842CD3FDFD4CE137E9773BE45A0E
Followup companion_cloud_reference_commit_owner_fix replaces only reference_commit:
4961C16AA05884D6DBA0702D6882C926DE42B3B8235D5F674309962DBECCB195.
Target: Supabase varoqxjccqmskzeejagn (existing GRIFON AI). Existing one-owner pilot.
Storage operation helpers installed; prior Storage policies empty, confirmed read-only.
Baseline security advisor saved in tool state: 11 INFO/no-policy, 3 unrelated WARN.
Independent read-only hosted permission/advisor audit PASS: all 18 deployed new
function bodies match reviewed source, bucket private/caps exact, wrappers and
RLS/grants correct; existing fixture functions and cron unchanged. Advisors now
12 INFO/3 WARN; sole addition expected private reference_snapshots RLS notice.
Evidence .tmp/ugc-cloud-media-correctness-activation.json.
SQL tests use PGlite storage/auth stand-ins; automated browser tests use simulated
HTTP, including fresh browser contexts. Native authenticated Storage upload and
download/reopen/reload now PASS; the target Storage version, delayed-stream race
and a physical second-device check remain unverified. Released v1.81+ reauthorizes
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
Native fixture cloud slice complete; preserve signed-in tab3 at the tested preview
below. Its frontend is unchanged by the SQL/test-only repair. Do not require a new
preview-origin login merely for the final repair/docs push. Await Neil's real
references/brand assets; real analysis, larger-media intake, spending authority
and provider execution require their own scoped implementation/test approvals.
Draft PR195:
https://github.com/yopiheart/grifon-command/pull/195 (attached).
Preview build dpl_75bQZhh7W1r9hwFXxGq3Akoep4hR:
https://grifon-command-408r86bmf-neilmaglayabusiness22-2085s-projects.vercel.app/app?cloudFixtures=1
No paid generation. Detailed behavior/checks: workflows/ugc_reference_implementation_plan.md.
