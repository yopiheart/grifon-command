# Provider-submission recovery

## Recovery policy

One-Shot claims a scene, submits the render, and records the job ID before
polling. The claim increments the existing `producer_scenes.attempts` counter.
Record, complete, flag and requeue compare that attempt with the current row.
Completion requires a recorded render. Only terminal rows can be requeued.
An unfinished scene never becomes eligible for resubmission merely by aging.

| Saved state | What Retry does |
| --- | --- |
| Done with a saved clip | Reuse the clip. |
| Rendering with a job ID | Poll the saved job. A polling transport error preserves the handle. |
| Submitting without a Kling job ID | Look up the current attempt by its custom ID. Save and poll only an exact match. |
| Submitting without a Veo job ID or a matching Kling task | Pause the scene and report that the render could not be confirmed. The run retains completed sibling clips. |
| Terminal provider failure | Flag the scene for review. An explicit First Cut reshoot can requeue it. |

Kling's legacy image-to-video API documents a custom `external_task_id` and a
lookup by that ID. Grifon derives it server-side from the authenticated user,
run, scene and attempt, and verifies ownership and the current scene state
before the lookup. This is a lookup key. Absence of a match cannot establish
that a paid POST never arrived. The Gemini Veo docs describe recovery by a
provider-issued operation name. A handle-less Veo attempt needs support if it
cannot be confirmed. An interruption between claim and the actual POST can also
leave a paused attempt. This is the availability tradeoff for avoiding a second
submission with an unknown outcome.

- [Kling legacy image-to-video API](https://kling.ai/document-api/api/video/3-0-omni/image-to-video/legacy)
- [Veo asynchronous operations](https://ai.google.dev/gemini-api/docs/veo#handling-asynchronous-operations)

## Historical failure reproduced before the fix

Source inspected: `7c422cd7` (2026-11-05). The following describes the baseline
investigation and its isolated evidence, rather than observed production charges.

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

The original API and SQL comments promised exactly-once behavior. A database
claim does not make the paid provider POST and the handle write atomic.

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

## Executable isolated handler/persistence harness

`npm run verify:provider-recovery` now exercises the actual
`api/producer/advance.ts`, unchanged `supabase/producer_runs.sql`, installed
Supabase JS client, local PostgREST and a fresh local PostgreSQL cluster.
It creates synthetic users and jobs only; it never loads application environment
files, authenticates to Supabase, or calls a paid provider.

Prerequisites: Node 24, installed root dependencies, PostgreSQL binaries, and a
PostgREST binary compatible with that PostgreSQL. The first Windows run used
PostgreSQL 17.6 and PostgREST 16.5. Set paths to already installed tools:

```powershell
$env:PG_BIN_DIR = 'C:/path/to/pgsql/bin'
$env:POSTGREST_PATH = 'C:/path/to/postgrest.exe'
npm.cmd run verify:provider-recovery
```

Exit 0 requires all nine assertions to pass. A setup or assertion failure exits
1. Unexecuted cases remain NOT RUN. The old characterization-only switch was
retired when the assertions became a regression gate. The runner has no live
mode or connection URL.

Every run prints its unique `.tmp/provider-recovery/<run>/` evidence directory:

- `report.json`: scenario PASS/FAIL/NOT RUN, actual request/response and row
  timelines, accepted fake jobs, source hashes, revision, database/PostgREST
  versions, exit code and cleanup outcome.
- `report.md`: readable verdict and coverage limits.
- `source.json`: inspected source identity; `postgres.log`: owned database log.

The nine cases cover two SQL claimers deliberately blocked behind a held row lock;
a real HTTP socket drop after record commit; a trigger-induced record rollback
followed by fresh recovery; repeated stale recovery; aged known-handle reuse;
late old-attempt writes; ownership and
synthetic invalid-token rejection; completed-output retrieval; and an actual
owned PostgreSQL shutdown. The handler's filters and SQL predicates are not
reimplemented in a fake query builder.

**Observed risks on the unchanged baseline:** repeated failed handle writes and
two stale recoveries accept three fake-provider jobs. A late old attempt can
record its handle after requeue/reclaim, before the new attempt records its own;
the newer record then receives `changed:false`. The earlier late-record
hypothesis is therefore demonstrated at this isolated handler/database boundary.

**Limits:** scenario sequencing and fake-provider polling are test drivers, not
the actual `runProduction` orchestrator or browser. Authentication and rate-limit
decisions are explicit synthetic seams. The SDK gateway strips its dummy auth
headers and `/rest/v1` prefix to reach local PostgREST's fixture service role;
query strings, filters and bodies reach real PostgREST. This does not certify
hosted auth/RLS, customer billing, provider idempotency, deployment, approval gates
or real output quality. The existing orchestrator and finished-ad meter suites
remain separate evidence.

**Isolation:** a sanitized environment, owned loopback listeners, outbound-fetch
denial and redirect refusal keep the scenarios local. The runner verifies the
database's reported data directory before loading SQL. Only its randomly created
cluster and processes are cleaned up; if shutdown cannot be confirmed, the
cluster is retained and the run fails. Local fixture authentication is trust-only:
do not run on a shared untrusted host. `initdb --no-sync` accelerates creation of
the disposable cluster; no machine-power-loss durability claim is made.

## Safety and progress checks

| Sequence | Required observation |
| --- | --- |
| Two claimers for one pending scene | One winning claim; no sibling submission. |
| Record commits but its reply is lost | Resume polls the saved handle; accepted-job count stays one. |
| Record fails before commit; claim still fresh | Resume stays recoverable and does not submit. |
| Record failed and Retry happens repeatedly after the old age threshold | The same attempt stays submitting and accepted-job count stays one. |
| Aged rendering row with saved handle | Requeue is denied. Poll the saved job. |
| Late write after terminal requeue and new claim | Old record, complete, flag and requeue cannot affect the new attempt. The new attempt can complete. |
| Wrong user and database outage | Ownership rejects the caller; persistence failure cannot be presented as a durable handle. |

The browser still drives production. The handler harness uses fake provider jobs.
The companion fixture-backed browser test covers the UI and client protocol for
One-Shot Retry. Hosted auth, real provider lookup, billing and media quality
require separate evidence. Browser-local Companion receipts continue to apply.

Before a release, let in-flight renders finish and have existing tabs refresh.
The new claim protocol rejects old tabs before they can start another attempt.
A tab that submitted before the update needs to finish saving its job ID under
the old protocol. The change reuses the existing SQL columns and claim function.
