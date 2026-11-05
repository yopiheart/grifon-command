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
node tools/verify-provider-recovery.mjs --fail-on-known-risk
```

The second command is a **negative control**, expected to exit **2** when the
current unsafe sequences reproduce. It is not a future-proof safety gate: these
tests intentionally characterize the current behavior. A protocol fix must update
the relevant expectations and first demonstrate its prevention test failing the
original defect. Unknown flags fail; there is no live mode or connection URL.
The npm script also accepts this flag after `--`, but npm may normalize exit 2
to exit 1; use direct Node invocation when checking the exact negative-control code.

Every run prints its unique `.tmp/provider-recovery/<run>/` evidence directory:

- `report.json`: scenario PASS/FAIL/NOT RUN, separate KNOWN RISK findings, actual
  request/response and row timelines, accepted fake jobs, source hashes, revision,
  database/PostgREST versions, mode, exit code and cleanup outcome.
- `report.md`: readable verdict and coverage limits.
- `source.json`: inspected source identity; `postgres.log`: owned database log.

A normal **PASS / KNOWN RISK / exit 0** means the characterization worked. It
does not mean recovery is safe. A setup or assertion failure exits **1**, and
unexecuted scenarios remain **NOT RUN**. Missing scenario coverage cannot pass.

The nine cases cover two SQL claimers deliberately blocked behind a held row lock;
a real HTTP socket drop after record commit; a trigger-induced record rollback
followed by fresh recovery; repeated stale recovery; timestamps one millisecond
below/at/above the ten-minute boundary; a late old-attempt record; ownership and
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

## Engineering scope established by this harness

The harness above implements the following boundary checks. It does not change
runtime recovery behavior. Compare persisted rows, accepted fake jobs and HTTP
outcomes before selecting a fix.

| Sequence | Required observation |
| --- | --- |
| Two claimers for one pending scene | One winning claim; no sibling submission. |
| Record commits but its reply is lost | Resume polls the saved handle; accepted-job count stays one. |
| Record fails before commit; claim still fresh | Resume stays recoverable and does not submit. |
| Repeated failed records, each followed by stale recovery | Reproduce today's repeated submissions. A future prevention check must fail this original behavior. |
| Ten-minute threshold | Control time around the actual strict-less-than timestamp predicate; do not substitute a stale boolean. |
| Late record after requeue/reclaim | Older attempt records first into the reclaimed submitting state; newer record is rejected. Demonstrated by the isolated harness, not a production incident claim. |
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
