# Provider-submission recovery: investigation

Source inspected: `7c422cd7` (2026-11-05). This is a bounded architecture
investigation, not a production incident report or a shipped recovery fix.

## Finding and boundary

Producer claims a scene, submits a paid provider job, saves its handle, polls it,
then saves the result. A provider can accept a job before its handle is durably
recorded. If that handle write fails, a later stale recovery can submit again.
Repeated failures can repeat this cost. Finished-ad credit deduplication does not
deduplicate upstream submissions.

| Boundary | Current owner and behavior |
| --- | --- |
| Scene driver | `services/producerOrchestrator.ts`, `renderOneScene`: reuses a finished URL or polls a recorded handle; otherwise attempts guarded requeue and reclaim. A winning claim calls `submitVideo` before `recordScene`. |
| Client persistence transport | `services/producerRunService.ts`, `claimScene`, `recordScene`, `requeueScene`: separate requests to `/api/producer/advance`. |
| Claim | `supabase/producer_runs.sql`, `producer_claim_scene`: one atomic pending-to-submitting UPDATE, incrementing attempts. This excludes concurrent winners for that pending state; it is not a transaction with the provider. |
| Handle write | `api/producer/advance.ts`, `record`: updates only a submitting scene; `changed:false` makes the driver re-read. No attempt token is required by this request. |
| Requeue | `api/producer/advance.ts`, `requeue`: permits flagged/done/failed scenes, submitting scenes with no handle older than ten minutes, and rendering scenes older than ten minutes. Clears the handle and output URLs. |
| Provider proxy | `api/gemini/video.ts` and `api/kling/video.ts`: meter the request, strip `requestId` and `finishedAdId`, then call the upstream. These fields are not provider idempotency keys in these paths. |
| Customer credit | `api/_lib/quota.ts`, `consumeAdOnce`, and `supabase/finished_ad_meter.sql`: transactional receipt/debit, shared by video and Omni meters; unavailable or malformed RPC results deny the request. |

The API and SQL still contain comments promising exactly-once/no-double-spend.
Those comments describe the claim exclusion too broadly. The stale recovery code
and executable characterization below establish the weaker guarantee. Production
deployment identity and actual provider billing were not inspected.

## Existing empirical evidence

`tests/producerOrchestrator.test.ts` executes the real driver with simulated
providers and scene persistence. Its crash-window cases cover:

- A recorded handle surviving a lost acknowledgement and being polled on resume.
- A failed completion write being recovered without a new submission.
- A fresh handle-less claim refusing another submission.
- Repeated failed handle writes followed by stale recoveries: three submissions
  across two recoveries, explicitly accepted by the characterization test.

The fake store represents staleness as a boolean. It does not establish the
production RPC's locking, the API's timestamp predicate, cross-device behavior or
provider billing. Browser recovery tests also substitute the backend. See the
[existing recovery map](recovery-feature-map.md#boundaries-that-remain).

The finished-ad meter already has an isolated PostgreSQL concurrency verifier in
`tools/verify-finished-ad-meter.mjs`. It tests customer debit/receipt behavior,
not scene submission. Preserve that distinction when interpreting a green run.

## Recommended next engineering slice

First establish a free integration harness for the actual scene claim and advance
boundary using an isolated database and a deterministic fake provider. Follow the
finished-ad verifier's isolation restrictions: no application credentials, remote
database, paid provider calls or live test flags. Exercise the current handler and
SQL, including ownership checks, instead of reimplementing their predicates in a
fake. Compare persisted rows, accepted fake jobs and HTTP outcomes.

| Sequence | Required observation |
| --- | --- |
| Two claimers for one pending scene | One winning claim; no sibling submission. |
| Record commits but its reply is lost | Resume polls the saved handle; accepted-job count stays one. |
| Record fails before commit; claim still fresh | Resume stays recoverable and does not submit. |
| Repeated failed records, each followed by stale recovery | Reproduce today's repeated submissions. A future prevention check must fail this original behavior. |
| Ten-minute threshold | Control time around the actual strict-less-than timestamp predicate; do not substitute a stale boolean. |
| Late record after requeue/reclaim | Establish whether the older attempt can overwrite the new attempt's handle; currently a hypothesis, not a demonstrated defect. |
| Wrong user and database outage | Ownership rejects the caller; persistence failure cannot be presented as a durable handle. |

Before choosing a runtime fix, define the safety/availability decision for a job
whose submission cannot be confirmed. A server submission ledger or outbox can
track intent but cannot alone close the provider-acceptance/receipt gap. Verify
provider support for idempotency or reconciliation against current documentation;
the absence of a key in this code does not prove the upstream lacks that feature.
If reconciliation is unavailable, blocking an uncertain submission trades automatic
recovery for cost safety. Set an explicit policy rather than claiming exactly-once.

If changing the protocol, use a small state model with two drivers, a provider,
durable scene state, attempt identity, lost replies and crashes. State safety and
progress assumptions separately; derive failure sequences for implementation
tests. No TLA+ toolchain or model is introduced by this investigation.

Preserve known-handle polling, completed sibling clips, customer storyboard and
First Cut approval gates, and atomic customer-credit metering. Browser-local
Companion locks do not establish cross-device exclusion. Tuned generation settings
and paid validation keep their existing approval requirements.
