# NOW - the resume doc
**Stamped: 2026-11-05; isolated provider recovery harness**

## Active work
Checkout: F:/CodexWorktrees/debb/grifon-command
Branch: codex/provider-recovery-harness, based on main b46b5e71 (PR225 merged).
Draft PR226: https://github.com/yopiheart/grifon-command/pull/226
Implementation commit: 494b7c7b. Harness only. No runtime, migration, tuned
content, dependency, paid provider or production data change.
PR201 live voice remains paused. No new release or live microphone evidence.

## Observed behavior
The real Producer advance handler and unchanged scene SQL ran through Supabase
JS, loopback PostgREST and isolated PostgreSQL. Two SQL claimers overlapped and
one won. A dropped reply after commit resumed through the saved handle.
Failed writes stayed blocked before and exactly at ten minutes; one
millisecond later requeue was eligible. The two reproduced risks are:
- Three fake jobs accepted after the initial failed handle write and two
  stale recoveries of the same scene.
- An older attempt recorded first after a newer claim. The newer record
  returned changed:false and the older handle remained saved.

## Verification
Windows Node 24.21.0, PostgreSQL 17.6, PostgREST 16.5.
Normal characterization exit 0, nine PASS and two KNOWN RISK findings.
Direct Node negative control exit 2 as expected, with the same nine cases.
Forced PostgREST startup failure exit 1, nine NOT RUN, cleanup verified.
Independent review and exact source rerun passed with no open findings.
Build and bundle leak passed. Unit 1681 passed, 32 opt-in skips. Codex
26/26 and ASCII, voice, eval prompt, domain, design and anchor checks passed.
Separate finished-ad meter control passed on isolated PostgreSQL with the
committed LF fixture. The Windows worktree copy changed the frozen hash.
No app checkout file changed to make that control pass.

Local evidence under .tmp/provider-recovery:
- Normal: 2daffd04-e4db-459e-a8cf-f2efddcbf266
- Negative control: 71a8de9a-4651-457f-9fd0-bb24d30ceae8
- Setup failure: a4ce0ad9-f8d3-4334-bcff-fd5bd341e22b
The reports record exact source hashes, fake job activity and stored rows.
The harness uses synthetic auth/rate-limit seams and scripted provider
operations. Browser, full orchestrator, hosted auth and real billing were
not exercised. Portable tools are in ignored .tmp/provider-recovery-tools.
Run and interpret using workflows/provider-submission-recovery.md.

## ▶ NEXT ACTION
Review draft PR226 and its hosted checks. The measured sequences are inputs
to choosing a runtime recovery policy. Establish provider idempotency or
reconciliation support and decide how to handle uncertain submissions before
changing the protocol.
