# NOW - the resume doc
**Stamped: 2026-11-07; Oceanides workflow and Dr. Plants source study saved**

## Current session

Checkout: F:/CodexWorktrees/cce6/grifon-command
Branch: codex/oceanides-organic-workflow, based on main 37f54d67 (PR226 merged).
Draft PR230: https://github.com/yopiheart/grifon-command/pull/230
Runbook commit: 02ae639e, pushed. No merge requested or performed.
Scope: document Neil's approved organic illustrative-explainer flow, preserve
local sources, assess the new Dr. Plants summary, and inspect one actual video.
No app code,
tuned content, dependency, provider generation, publication, or deployment change.

Reusable runbook: workflows/oceanides_organic_reels.md. It records the reference
limits, evidence/illustration boundary, connected 2-3 second progression, centered
white Inter/shadow/no-box overrides, transparent updated logo, exact approved
contact numbers, VFX pass, picture lock, paid sound spec, and verification.
The pilot is 14 seconds, 540x960, 24 fps. Picture V6 was accepted and the approved
sound pass completed. Direct listening, crew validation, a current platform preview,
and published performance remain pending. No VO was generated.

Current local review:
.tmp/oceanides-reel-motion/oceanides-reel-v6-sound-review.mp4
SHA256 779d46414e73375b77612e50b591ffe3324a2a494eb2a7e7223968d0f26cd273

Local archive outside the worktree:
F:/CodexCreativeArchive/oceanides/organic/illustrative-explainer-001/
31 copied files matched their original SHA-256 values; manifest.json records them.
Sibling ZIP oceanides-illustrative-v6-2026-11-07.zip has SHA256
5cfd7142b824c27a01a8cd6f3dbc70d2467fd6aae875411aa22547b9a945b277.
This is local preservation only. GitHub metadata confirmed this repository is
PUBLIC; native audio/production media were not added to Git.

Dr. Plants takeaway: test a story that follows a subject through question, clues,
and payoff; use VO when it supplies context and causality. A 25-35 second narrated
investigation is a proposed future test, not a rewrite of the accepted pilot.
The interview summary itself is not a source-video autopsy. Neil then requested
one actual Dr. Plants video before Glovio, including editing, camera switching,
transitions, and overlay purpose/placement/entry/exit. Completed a qualified
visual/transcript study of https://www.youtube.com/watch?v=PyiCHWfBQPY:
- Official channel displayed 99M views; downloaded source is 515.86s, 720p/30fps.
- Inspected 172 full-timeline samples plus dense details and 2-4 fps text strips.
- Opening counter fades after its number lands; dates change position at shot
  changes; a short pointer identifies a tiny detail, then leaves at the next angle.
- Story analysis records recurring geography, nested obstacles/payoffs, visible
  consequences, and the difference between observed behavior and narrated intent.
- Exact shot count, physical-vs-digital camera mechanism, and font are unverified.
  Direct listening was unavailable. No paid analyzer was run.

Detailed study: workflows/reference_studies/drplants-ant-colony-1000-days.md.
Swipe File E19 and the organic runbook link to it. No Pattern Index counts or
presets changed. Reference evidence archive:
F:/CodexCreativeArchive/references/drplants-ant-1000-days/
All 26 copied files matched source hashes; manifest.json records them. Native
video/transcript/images stay local, outside this public repository. Overlay
comparison sheet: sheets/overlay-examples.jpg inside that archive.
Do not copy low upload frequency into a local service business or treat VO as a
proven cause of virality. Do not invent customer testimony or a diagnostic outcome.

Next: Glovio is Neil's requested reference. Inspect the specific shortlisted Reel
before proposing one Oceanides adaptation. Keep narrative format separate from
motion style. No new paid generation or multi-page batch is approved by this save.

Verification/handoff: all 31 archive copy/hash checks passed. The archived renderer
passed --plates-only --check-edit (exit 0) in an isolated working copy, covering
editable text, bounds, logo alpha, and plate creation. Accepted movie hashes are
unchanged. git diff --check passed. App build/test and provider calls were not
run for this documentation-only change. Reference extraction and scene-candidate
analysis both exited 0; candidate statistics are explicitly not a full shot count.
Reference document links, unique E19 heading, all 26 archive hashes, and staged
diff checks passed. PR230 carries this follow-up study. Hosted checks and
independent review have not been assessed in this save pass.

## Previous engineering handoff (retained)

The provider-recovery work below was recorded on 2026-11-05. PR226 is now merged
at this checkout's base; its old draft-review next step is superseded. The measured
runtime risks and the need to choose a recovery policy remain unresolved.

### Provider recovery work
Checkout: F:/CodexWorktrees/debb/grifon-command
Branch: codex/provider-recovery-harness, based on main b46b5e71 (PR225 merged).
PR226 (merged): https://github.com/yopiheart/grifon-command/pull/226
Implementation commit: 494b7c7b. Harness only. No runtime, migration, tuned
content, dependency, paid provider or production data change.
PR201 live voice remains paused. No new release or live microphone evidence.

### Observed behavior
The real Producer advance handler and unchanged scene SQL ran through Supabase
JS, loopback PostgREST and isolated PostgreSQL. Two SQL claimers overlapped and
one won. A dropped reply after commit resumed through the saved handle.
Failed writes stayed blocked before and exactly at ten minutes; one
millisecond later requeue was eligible. The two reproduced risks are:
- Three fake jobs accepted after the initial failed handle write and two
  stale recoveries of the same scene.
- An older attempt recorded first after a newer claim. The newer record
  returned changed:false and the older handle remained saved.

### Verification
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

### Engineering follow-up
The measured sequences are inputs
to choosing a runtime recovery policy. Establish provider idempotency or
reconciliation support and decide how to handle uncertain submissions before
changing the protocol.
