# First reference led UGC flow implementation plan

Implementation proposal dated October 14, 2026. Product decisions are recorded in
[the creative library roadmap](creative_library_roadmap.md). This plan does not
change application behavior or approve tuned diffs, paid tests or deployment.
Current work status belongs in [NOW.md](../NOW.md).

## Local intake and sample review boundary

The first S0 slice saves an account-scoped brief, an uploaded reference video,
up to five role-labelled photos and one selected saved voice in this browser's
IndexedDB. It reopens the original files and selection. Reference language is
independent of output language. An optional reference link is retained as text;
it is not fetched or analyzed. Cloud storage, cross-device recovery, voice upload,
reference analysis, real planning and generation remain later slices.

Enter **Reference brief** from a fresh Companion chat. Existing started briefs
and production runs keep their current flow. Clearing browser data removes these
local drafts and files, so users must retain their originals.

**Prepare sample plan** opens the fixture review: editable direction, English
sample speech, consecutive scene timing, visual descriptions, one-voice/audio
assumptions and an illustrative PHP cost breakdown. Target language remains
separate; the sample has not been localized or adapted by a model. Adapt for brand
and Match closely record intent only. No supplied reference or photo is analyzed.
No-voiceover samples omit speech and its illustrative audio charge.

The sample estimate uses invented test amounts, not provider rates. It shows
contingency and a maximum demo cap; optional amount edits test validation. Actual
spend is zero. Changing timing/content does not automatically reprice the sample.
**Confirm sample plan** records a device-local demo confirmation, not authorization
to charge or generate. It binds the review revision, input revision, media content
hashes and estimate. Editing the brief/assets/voice makes the prior review stale;
editing plan text/timing/cost clears confirmation. Changing an input back does not
restore confirmation. Previous content stays visible until explicitly replaced.

The review, partial edits and confirmation reopen with the draft. This is the UI
portion of S1; server-owned approval, real quotes, paid execution and cross-device
integrity remain future work. Local records are not authenticated spending tokens.

## Local fixture queue preview before S2

After saving a confirmed sample plan, **Preview demo queue** exercises the next
interface with local simulated steps: each scene clip, the single saved voice and
alignment for spoken plans, music, existing sound-bank cues, assembly and checking.
The original illustrative estimate and cap remain visible; actual spend stays zero.
Completion means the simulation finished. It produces no video or Assets entry.

Start and Resume advance saved steps while the queue is open. Leaving, reloading
or switching account/chat stops local playback; reopening preserves progress and
requires Resume. This preview is not a background worker. Pending or failed saves
and conflicting tabs block further advancement. Pause and Cancel exercise stopping.

The optional second-clip failure scenario stops before downstream work. A bounded
retry preserves successful steps. Changing the brief, inputs, voice, script,
timing or estimate permanently invalidates that queue, including edit-and-revert.
Its prior progress remains visible until an explicitly prepared replacement.

This local slice does not complete S2. Server-owned durable execution, restart
recovery, atomic budget reservations and provider submission reconciliation still
need their own implementation and checks before paid integrations.

## Free fixture checks

### Background fixture execution

The background fixture path uses a standalone local worker and a SQLite journal,
separate from browser playback. A saved submission intent identifies the job
before its first request. Reopening performs read-only lookup; it never restarts
work through polling. Duplicate submissions reuse the same intent, and worker
transitions commit before the next step is scheduled. Retry and cancellation are
explicit commands. Stopping a job is acknowledged before its plan can be edited.
Conflict copies observe the original job without starting a second worker job.

Start the isolated fixture host on an unused loopback port:

```powershell
node tools/verify-recovery-server.mjs --reference-jobs --port 5174 --jobs-db .tmp/companion-background-live/jobs.sqlite --worker-status .tmp/companion-background-live/worker.json
```

Open `http://localhost:5174/companion-chat-preview.html?background=1`. The explicit
preview opt-in injects the fixture client; the normal app and local queue keep
their existing behavior. The host still loads no environment files or live API
middleware. Its dedicated fixture namespace permits only simulated fixture
accounts; this is not production authentication. No uploaded media is processed,
no provider executes and actual spend remains zero.

With that host running, the browser suite uses its journal for an independent,
read-only check while every browser owned by the test is closed:

```powershell
npm.cmd run test:e2e -- --config tests/e2e/companion-background-fixture.config.ts
npx.cmd vitest run tests/unit/companionFixtureJobs.test.ts tests/unit/companionFixtureJournal.test.ts tests/unit/companionFixtureWorker.test.ts
```

For a different host or journal, set `COMPANION_BACKGROUND_URL` and
`COMPANION_BACKGROUND_DB` to the matching local paths before the browser suite.
Worker tests also exercise real process restart and two-worker contention.

Browser closure does not stop the worker. Host/worker shutdown stops execution;
restarting against the same journal resumes actual scheduled steps without
recounting completed attempts or fabricating elapsed-time results. This is local
restart-recovery evidence, not cloud durability or a completed S2 spending system.
The desktop must remain running. Cloud media, authenticated distributed workers,
atomic spend reservations and provider reconciliation remain S2 requirements.

The bounded runtime investigation found the current producer client-driven and
the existing cleanup cron unrelated to stage execution. Local fixture proof uses
installed Node's [SQLite API](https://nodejs.org/download/release/latest-v24.x/docs/api/sqlite.html)
without adding dependencies. [Vercel Workflows](https://vercel.com/docs/workflows)
is a cloud execution candidate; no SDK migration or deployment is included here.

### Existing local intake and review checks

For a free fixture check, start the existing isolated frontend server in one
terminal; it loads no environment files or live API middleware:

```powershell
node tools/verify-recovery-server.mjs
```

Then run in another terminal:

```powershell
npm.cmd run test:e2e -- --config tests/e2e/companion-reference.config.ts
npm.cmd run test:e2e -- --config tests/e2e/companion-reference-review.config.ts
npm.cmd run test:e2e -- --config tests/e2e/companion-reference-queue.config.ts
```

The test uses simulated saved voices and local media at
`http://localhost:5173/companion-chat-preview.html`. Keep port 5173 free before
starting the fixture server; do not substitute a live API server. Windows tests
use installed Microsoft Edge. Evidence is written under ignored `.tmp/`.

## Success contract

An authenticated customer creates a 15-30 second, 9:16 Taglish product ad from
one uploaded reference or one validated UGC Recipe and one to five photos.
They review direction, brand-specific script, visual plan and cost, approve a
specific version, and receive a playable finished version in chat and Assets.
A job can continue without the browser. Reopening shows the same plan, accepted
assets, costs and job state. A targeted revision preserves unaffected work.

Failure includes an unrecognizable agreed reference structure, changed identity
or product, incorrect approved claims/dialogue, overspend, a duplicate submission
after an uncertain outcome, a missing saved result, or a job represented as
finished when a required step failed. Model checks alone cannot certify identity
or natural Taglish; the pilot includes Neil's visual and listening review.

This is a product pilot. Service support, 60-second output and broader aspect
ratios follow after this path passes; schemas must not silently classify service
briefs as products. Unsupported requests receive a clear scope explanation.

## Current code and integration seams

Inspected against local origin/main at 18d6d169 (includes recovery PR186).
This is source inspection, not verification of live configuration or providers.

| Existing seam | Observed behavior | Planned use/change |
| --- | --- | --- |
| `components/CompanionChat/index.tsx`, `CompanionChatSurface.tsx` | Chat wraps `ProducerFlow`; single photo and sequential intake | Add reference-led intake/review/result within the existing chat shell |
| `services/companionIntake.ts`, `companionConversations.ts` | Version-1 drafts; Testimonial/product mapping; limited revision commands | Version the new draft, retain old drafts, support role-labelled asset IDs and structured revisions |
| `components/OneShotAd/ProducerFlow.tsx` | Owns existing run/controller integration | Dispatch by explicit saved workflow version; preserve old run behavior |
| `services/producerOrchestrator.ts`, `producerDeps.ts` | Browser-driven stages with injected services; EDL follows generated clips | Reuse tested seams; reference timing must constrain planning before generation |
| `services/producerRunService.ts`, `api/producer/run.ts`, `api/producer/advance.ts` | Durable checkpoints, optimistic revision, scene claims and recorded handles | Reuse ownership/concurrency patterns; add approval/budget/job semantics for new runs |
| `api/gemini/omni-video.ts` and its poll/status/consume routes | Preset-based source-video edit pass; default model is preview ID | Keep existing edits intact; build a separately versioned UGC generation adapter after contract validation |
| `services/voiceService.ts`, `voiceConsolidationService.ts`, `api/voice/consolidate.ts`, `api/_lib/sceneVoiceRoute.ts` | Talking footage routes to STS; narration to TTS | Reuse one-voice routing; validate converted speech against Omni footage and remove silent TTS fallback for new talking jobs |
| `api/elevenlabs/voices.ts`, `api/_lib/filipinoLibrary.ts` | Curated saved library plus user-owned clones and premade voices | Present the curated saved list/private upload choice; preserve owner isolation and consent |
| `api/elevenlabs/text-to-speech.ts`, `speech-to-speech.ts`, `api/_lib/elevenlabs.ts` | TTS v3 and multilingual STS v2, duplicated constants/settings | Prepare explicit v4 TTS upgrade diff; verify voice compatibility on both TTS and STS |
| `api/_lib/assets/sfx/`, `api/_lib/sfxTriggers.ts`, `tools/sfx_library_session.mjs` | Existing sound bank, timed render cues and offline ElevenLabs generation tool | Reuse appropriate bank cues; custom generation needs a budgeted production adapter |
| `api/render/final.ts`, `api/_lib/renderPresets.ts` | Legacy style/preset resolution and 12-scene final-render limit | Explicit reference EDL route without incidental preset rotation; preflight scene limits |
| `api/_lib/mediaStore.ts`, `api/render/final/list.ts`, `api/gemini/video/library.ts` | Storage facade and existing library/list routes | Reuse media operations; add stable production-version identity and confirm Assets routing |
| `workflows/viral_swipe_file.md`, `tools/analyze_video.py`, `tools/render_audit.mjs` | Existing creative evidence and analysis tools | Curate Recipe evidence; validate timing and separate measurements from model estimates |
| `tests/producerOrchestrator.test.ts`, `tests/unit/producerRunResponse.test.ts`, `workflows/recovery-feature-map.md` | Existing recovery contracts, including uncertain write outcomes | Preserve these tests and extend them for new workflow/version semantics |

PR186 explicitly documents that stale claims with no recorded handle can still
resubmit. A scene claim or customer-credit dedupe is not an end-to-end provider
spend guarantee. Browser-resume persistence is not a background production worker.

## Customer flow and saved state

1. Collect the brief, reference/Recipe and photos in chat. Reuse known brand facts.
   Ask one bundled clarification only when missing facts materially block the ad.
   Price is optional; no invented offer, testimonial, result or claim.
2. Validate files and assign roles: character, product, clothing. A reference video
   is a separate input, not one of the five photos. User references remain private
   and do not automatically become shared library content.
   Choose one saved curated ElevenLabs voice or upload a consented voice sample
   for a private clone. Audio is separate from the five-photo allowance. Reuse an
   existing brand voice when available; include a preview in the normal review.
3. Build a reference blueprint: ordered shots, timing, camera/framing, overlays,
   sound cues and three to five signature traits. Record measured vs inferred data.
4. Retrieve eligible lessons/Recipes. Produce original brand messaging inside that
   structure. If speech cannot fit naturally, revise wording or propose a timing
   change before approval; do not speed up speech or cut words silently.
5. Show a single review containing direction, script, shot plan, identity anchors,
   differences from the reference, estimated cost and maximum spend. Show presenter
   preview when generating an original character. Preview cost is included.
6. Bind approval to the exact plan revision and input hashes. You decide may
   delegate specified choices, but its budget and identity/brand constraints remain.
7. Execute durable jobs, verify clips, assemble the approved EDL, run quality checks,
   and repair only eligible failures within the bounded allowance.
8. Save the finished version and expose it in both chat and Assets. Revisions create
   new versions; accepted footage and audio remain reusable.

Suggested logical states: draft -> planning -> awaiting approval -> queued ->
generating -> assembling -> checking -> ready. Also support needs input, failed,
cancel requested and cancelled. These are proposed new workflow states, not a
silent expansion of the existing run validator. Old runs use their old decoder.

## Proposed persisted contracts

Exact runtime schemas are an implementation deliverable, not approved here.

| Record | Required information |
| --- | --- |
| Creative Recipe | ID/version, category, evidence references, eligibility, signature traits, execution method, validation status |
| Reference blueprint | Source asset/hash, analysis version, shot timeline, measured timing, text/audio observations, uncertainty |
| Brand and asset snapshot | Owner, immutable media IDs/hashes, roles, approved facts, identity anchors, language |
| Voice lock | Selected voice ID, curated/private origin, ownership/consent reference, preview, TTS/STS model versions and supported settings, accent/delivery direction |
| Audio plan | Per-shot STS/TTS/silent routing, original and converted speech keys, alignment version, Music v2.5 source/settings, SFX asset IDs and timed cues |
| Production plan | Workflow version, blueprint/Recipe version, script/visual plan, shot dependencies, reference differences, audio and finishing strategy |
| Approval and quote | Plan hash/revision, user, delegation scope, quote expiry, cost currency/unit, planning/production/repair caps and maximum attempts |
| Stage attempt | Stable attempt key, dependencies, provider, submission intent, provider job handle, outcome, reserved/settled cost, evidence |
| Production version | Parent version, approved plan, accepted clip/audio IDs, final media object key, thumbnail, QA outcome, chat/run relationship |

Store media in object storage and persist stable keys, not expiring signed URLs or
large base64 blobs in run headers. Sign URLs at read time after ownership checks.
Choose an explicit retention rule for accepted versions; inspect actual storage
and cleanup configuration before release. Existing comments are not live evidence.

## Implementation slices

Each slice includes its types, API/service, UI state and tests. New module names
below are proposed seams. Prefer small additions over rewriting the old producer.

### S0 Save and reopen a reference brief without generation

Dependencies: none beyond normal app access. No creator assets are required for
fixture development.

- Add a versioned reference-led draft in `types.ts` and Companion draft/conversation
  storage. Add reference-video upload or Recipe selection and up to five photos
  to `CompanionChatSurface.tsx` using existing UI primitives.
- Add authenticated asset registration/upload handling through the media facade;
  validate real media type, duration, ownership, size and supported format. Set
  concrete limits after inspecting the actual upload path/platform constraints.
- Connect the existing curated voice list and private clone upload UI to the new
  draft. Store the voice selection once; cloning and new previews require their
  budgeted consent/approval before provider calls. Exercise uploads with fixtures.
  Do not expose every voice in Neil's provider account or another user's clones.
- Keep a fixture Recipe distinctly labelled as test data, never a validated Auto
  choice. Retain old drafts through explicit version decoding.
- Demo: save, close, reopen and edit the same draft on mobile. Checks: six photos
  rejected, unsupported files explained, cross-account access denied, no generation.

### S1 Review a reference plan and approve its exact version

Dependencies: S0. Fixture planner first; real planner requires tuned-diff approval
and an approved paid spec for any paid analysis or research.

- Add the reference planner service/API seam and a compact plan review in chat.
  Prefer measured cuts/audio timing and curated evidence over unverified estimates.
- Store script, visual timeline, signature traits, identity anchors and deviations.
  Add a version-bound approval and quote. Reject stale approvals after input edits.
- Bind the voice lock and audio plan to that approval. Include clone/preview, STS,
  TTS, alignment, Music v2.5 and any custom SFX charges. Voice changes invalidate
  affected audio and final mixes, rather than silently switching mid-ad.
- Account for planning costs before analysis: use a disclosed planning allowance
  authorized by the initiating action, or a separately approved pilot spec. The
  production review approves the remaining generation/finishing spend. Never make
  hidden paid preview calls under the claim that generation has not started.
- Demo: review and approve a fixture plan; change an asset and see approval become
  stale. Checks: unsupported claim omitted, no public price allowed, silent versus
  spoken branches explicit, reference dialogue never used as product truth.

### S2 Execute one fixture job after the browser closes

Dependencies: S1. Mandatory before any paid generation integration.

- Move ownership of the new run's transitions to a server execution seam; the chat
  submits intent and observes status. Reuse injected stage functions where safe.
- First sub-deliverable: select and document a durable executor after a bounded
  deployment/runtime investigation. It must persist timers/retries, authenticate
  workers, recover after restart and schedule subsequent steps without a browser.
  Do not equate `waitUntil`, a local desktop process or a long request with durability.
- Add atomic budget reservations and a submission-intent ledger before dispatch.
  Concurrent jobs must reserve against the same remaining cap. Record actual cost
  separately from customer credits. Include retries, previews, QA, music and render.
- Use provider idempotency/reconciliation if supported. An unknown submission with
  no recoverable handle holds its reservation and enters reconciliation; do not
  blindly resubmit it on a stale timer. Stop new work when the cap cannot cover it.
- Demo: a fake provider completes while the browser is closed; reopening shows its
  finished state. Checks: restart, duplicate delivery, lost handle acknowledgement,
  two-tab approval, stale plan, budget exhaustion and cancellation during submission.
- Cancellation prevents new submissions; in-flight work can still incur charges.

### S3 Generate and inspect one speaking UGC shot

Dependencies: S2, exact provider contract/model-setting approval, and approved paid
spec with supplied assets. Mocked transport work can precede the paid test.

- Add a UGC adapter alongside the existing Omni edit endpoint. Verify available
  model ID, auth, upload/reference limits, clip duration, audio, resolution, polling,
  cancellation, pricing and output expiry for the chosen production provider.
- Pilot the hardest short Taglish line with the accepted character/product anchors.
  Use 360p development output, then validate the supported finishing path. Do not
  promise an accepted-draft promotion unless the provider actually supports it.
- Preserve native speaking audio as the original performance source. Extract clean
  dialogue, apply ElevenLabs Voice Changer using the locked voice ID, and compare
  the converted speech with the original picture for transcript, timing, accent,
  pronunciation and delivery. Isolate dialogue if needed; do not convert a full
  music/SFX mix or double it with the new score. Keep original and converted stems.
- Use Eleven v4 TTS with that same voice ID for off-screen narration. Verify the
  exact v4 contract and supported settings; update both TTS call sites and their
  sync/evaluation checks only under the approved diff. STS uses its own supported
  model. A v4 TTS upgrade does not implicitly upgrade or replace STS.
- Missing/failed talking-source audio must not silently fall back to unrelated
  TTS over a moving mouth. Pause that shot or use an explicitly planned, budgeted
  audio-driven lip-sync/regeneration path. Do not double-process good TTS through
  STS unless a tested workflow calls for it.
- Demo: an approved shot plays in chat with its attempt/cost receipt. Checks:
  pronunciation and English switching, mouth timing, face/product consistency,
  delivery-resolution defects, duration and correct resumption of provider handles.

### S4 Deliver a complete ad to chat and Assets

Dependencies: S3; approved script/visual plan and music inputs.

- Compose the 15-30 second pilot from accepted shots, using the reference timeline
  planned before generation. Keep transcription alignment tied to the actual audio.
- Align captions to final converted/TTS speech, not discarded native timing data.
  Check voice identity and delivery across STS and TTS joins by listening.
- Generate the fitted score with Music v2.5 under the shared music workflow.
  Reuse it for revisions when suitable. Plan SFX separately: use the curated bank
  for common whooshes, pops, impacts, notifications and contact sounds; request a
  custom ElevenLabs effect only when no suitable asset fits. Check sound provenance
  and actual onset, then place cues precisely and duck music/SFX beneath speech.
  Do not resurrect old generation-tool budget approvals or assume it is a live API.
- Extend final assembly through an explicit reference-led contract. Preserve the
  old render route/version. Do not inherit automatic title stacks, music, palette
  rotation or captions where the approved reference plan does not call for them.
- Preflight the current 12-scene render limit. Trim source handles to frame-based
  shot boundaries; account for transitions and speech before committing the plan.
- Save an owner-scoped production-version record, final media key and thumbnail.
  Connect the actual Assets entry point and chat result to that same version.
- Demo: finished video plays/downloads from both places after refresh and URL
  renewal. Checks: exact approved on-screen text, valid media, no black/missing
  sections, complete speech, music mix and agreed signature traits. Reference cut
  tolerances are defined per pilot, not invented as a universal similarity score.

### S5 Revise one part without rerolling the ad

Dependencies: S4.

- Translate requests into a visible change set and dependency impact. Text/style
  changes rerender composition; changed dialogue regenerates affected speech/shot
  and dependent timing. Product/character changes invalidate dependent visual shots.
- A voice-only change reruns affected conversion/TTS, alignment and final mix while
  preserving suitable picture. Recheck lip sync; keep the previous accepted version.
  A missing/deleted voice needs explicit resolution, never silent substitution.
- Show added cost and obtain the required revised approval; delegated repairs stay
  within their already approved scope and attempt/cost limits.
- Preserve accepted source media, audio, previous final version and provider handles.
- Demo: change CTA and repair one failed shot independently. Checks: unchanged
  media hashes, no unrelated provider submissions, exhausted repair cap stops, and
  failed revision leaves the previously accepted version usable.

### S6 Make a validated Recipe available to Auto

Dependencies: S4-S5 and an accepted adaptation to a second brand.

- Save source evidence, adaptation rules, accepted execution artifacts and cost/time
  observations. Add eligibility-based selection with a brief explanation in review.
- Use a new unseen product brief to check retrieval and transfer. Keep examples
  used to author a Recipe separate from evaluation briefs.
- Demo: user without a reference receives a fitting plan from a validated Recipe.
  Check unsupported assets/language, contradictory lessons and no eligible Recipe.
  Empty eligibility must not silently select an unvalidated example.

## Migration and quality boundaries

- Use an explicit workflow version selected for new reference-led projects, not a
  generic feature-flag framework. Old checkpoints remain with their old executor.
- Preserve PR186 response validation and scene-write recovery. Update decoders and
  regression tests deliberately; never weaken old validation to accept new states.
- Treat uploaded video, tutorial transcripts and creator instructions as source
  data, not tool permissions. Never execute source-supplied code automatically.
- Automated quality checks can flag likely identity or speech issues. Calibrate
  them against human review before granting autonomous reroll authority.
- Do not delete old presets/projects, replace tuned content, or publish shared
  Recipes as a side effect of analysis.

## Verification and pilot evidence

During implementation, load `verify-changes` and applicable scoped instructions.
Run targeted unit/API tests, then `npm.cmd run build` and `npm.cmd run test`.
Run applicable bundle-leak, voice-sync, eval-prompts, domain, PowerShell ASCII and
artifact-anchor checks. Use existing recovery verification plus new Companion
cases at 375px and desktop width. Paid/live switches remain unset in ordinary CI.
Independent review is required before requesting merge of non-trivial changes.

Fixtures must cover approval tampering/staleness, ownership, duplicate submission,
unknown outcome, budget races, worker restart, closed-browser continuation, expired
URLs, lost completion writes, native-audio preservation and targeted revisions.
Also verify one voice ID across STS/TTS/retries, no private-voice leakage, explicit
clone consent, failed STS handling, missing voice handling, final-audio alignment,
no accidental doubled music and no custom-SFX calls when bank cues suffice.
Existing recovery tests do not establish these new guarantees by themselves.

Paid pilot spec, to complete once Neil supplies inputs:

- Exact source URLs, media IDs/hashes, permitted usage and brand fact snapshot.
- Final script/visual plan, identity anchors and three to five signature traits.
- Provider/model/mode, clip durations, resolution and finishing/audio settings.
- Locked voice/consented sample, a speaking-to-narration transition, final-audio
  lip-sync/listening checks, Music v2.5 settings and exact SFX assets or paid prompts.
- Named pass/fail checks for speech, identity, edit recognizability and delivery.
- Maximum money/credits, attempt count, targeted repair allowance and stop rules.
- Evidence: inputs, plans, attempt receipts, comparison frames, full audio/video
  review, accepted/rejected outcomes and total elapsed time/cost including failures.

Start with one accepted brand ad; repeat with a second brand. Before private beta,
evaluate ten varied briefs and report both first-pass and after-repair acceptance,
cost per accepted output, time to usable output, required questions and failure
reasons. Set the numerical cost/time targets from pilot evidence before launch.
Do not claim sales lift from production acceptance alone.

## Next implementation task

Local S0 intake, S1 sample review and browser-independent fixture execution are
implemented. Continue S2 with cloud-owned media, authenticated durable execution,
atomic spend reservations and provider submission reconciliation. Neil is still
gathering the three references and brand assets. Real analysis, creative tuning
and paid tests wait for exact inputs and their required approvals. This document
authorizes none of those operations.
