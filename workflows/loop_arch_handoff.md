# Loop-Arch Handoff — for the fresh Opus 4.8 session

**Written 2026-07-23 by the closing Fable session. Read this + [loop_arch_plan.md](loop_arch_plan.md) (the full approved architecture blueprint, copied here because the original lives in the defreezer-wiped plans dir) before touching anything.**

## State (verified end of 2026-07-23)

Four stacked branches, pushed, **no PRs, nothing merged, nothing deployed by us, zero paid API calls made**:

| Phase | Branch · commit | Live-on-merge? |
|---|---|---|
| P1 boundaries + watchdog | `feat/loop-arch-p1-boundaries` · `a8e5c7c` | YES (unflagged) |
| P2 observability (+ Fable-reservation policy commits) | `feat/loop-arch-p2-observability` · `cc8d523` | YES (telemetry only) |
| P3 parallelism | `feat/loop-arch-p3-parallelism` · `6a8e358` | YES |
| P4 image gate | `feat/loop-arch-p4-image-gate` · `cc44d6a` (+ this handoff commit) | NO — dark behind `IMAGE_GATE_ENABLED` + `VITE_IMAGE_GATE_ENABLED`, both unset/OFF |

- Suite: 914 passed / 22 skipped. Build + bundle-leak clean at every phase tip. (935/22 as of the 2026-07-23 Opus/Fable session — concurrency tests, thumbnail slice, metering slice.)
- DB: P2 SQL **applied by Neil**. ~~P4's `gate_verdict` NOT applied~~ → **APPLIED 2026-07-23** (Neil re-ran `producer_runs.sql`; adds `producer_scenes.gate_verdict` + `producer_runs.thumbnail_url` — Neil-reported after the info_schema verify query).
- All verification was **unit-test + mocked**; no live-provider, no preview, no prod evidence exists. P1's only smoke = local dev server 401 probes.
- Every phase passed an adversarial critic (Opus post-policy). Full audit answers: see the read-only status Q&A at the end of the 2026-07-23 session transcript.

## ▶ SESSION CLOSE 2026-07-25 — everything below is history; this is the state and what is left

**Eight fixes shipped, `main` at `ee93e20`.** Every one was found by driving the real product, and
three of the biggest came from Neil's eye, not from tests: the storyboard's camera sameness, the
unclickable Regenerate button, and the regen that returned a blank-label product shot.

| | Fix | Commit |
|---|---|---|
| P1 | Camera rotation never rotated — a constant `variationIndex` pinned every scene to one framing | `4f662a3` |
| P2 | `producer_scenes.gate_verdict` was written by nothing — the flag-only phase discarded its own dataset every run | `24cc077` |
| P3 | A server-side fail-open was invisible to telemetry | `24cc077` |
| — | HIGH_ANGLE_SELFIE cut — the model never rendered it and both slots carried the run's only defects (TUNED, approved) | `c45ff6e` |
| — | `GlassPanel`'s `p-8` silently beat every caller override at **43 sites** — the PR #74 CDN→PostCSS regression, and the root cause of the dead Regenerate button | `e8e5e22` |
| C | Regen/reshoot refuse a lost presenter reference instead of burning money on a guaranteed-wrong image | `e7d9945` |
| B+A | `producer_runs.avatar_url` + the missing guard on geminiService's avatar branch (TUNED, approved) | `a1d8b7e` |
| P9 | A fail-open now says WHY (`IMAGE_GATE_EMPTY` vs `IMAGE_GATE_UNPARSEABLE` + finishReason) | `ee93e20` |

Suite 1048 passed / 26 skipped, build + bundle-leak + design:lint clean. SQL applied and verified
against `information_schema`: `producer_runs.avatar_url text` nullable at ordinal 16.

### What is LEFT

1. **Flip Production** — set `IMAGE_GATE_ENABLED` + `VITE_IMAGE_GATE_ENABLED` = `true` on the
   **Production** scope, then redeploy Production. `VITE_` is build-time, so the redeploy is
   mandatory and must not reuse a cached build. **This is safe with P9 open**: the gate is
   flag-only and fails open, so it can neither block a user nor reroll — flipping only starts
   recording verdicts, and it is the fastest way to gather the P9 evidence at real volume. (An
   earlier note in this session said to hold the flip until P9 was understood. That was
   over-cautious: P9 governs whether the PRECISION NUMBERS can be trusted, not whether the flip
   is safe.)
2. **Read the first fail-open causes** once Production has a few runs:
   ```sql
   select meta->>'detail' as cause, count(*)
     from events where event = 'check_skip' and meta->>'reason' = 'gate_unavailable'
    group by 1 order by 2 desc;
   ```
   `IMAGE_GATE_EMPTY: finish=SAFETY` → a safety stop on person imagery, and the gate model or its
   prompt needs to change. `IMAGE_GATE_UNPARSEABLE` → format drift, add a responseSchema.
3. **Watch for `node_fail{avatar_persist, avatar_too_large}`.** A generated 2K avatar has never
   reached the database intact, so the 3M cap is untested against a real one. If that event fires,
   its `chars` field is the measurement needed to choose between compressing the reference and
   moving it to Supabase Storage. If it never fires, B is done.
4. **Delete `preview/image-gate-test`** once Production is confirmed — it exists only to produce
   Preview builds and carries no work of its own.
5. **Still open, unranked:** P4 (Gate-1 regenerate has no cap — unlimited paid image calls),
   P5/P6/P7 (the generator ignoring its own explicit negative constraints: hook end-frame
   "NO people", FACE_TO_CAMERA on speaking scenes, unverifiable scarcity + a therapeutic claim —
   all TUNED, all gated on Neil), P8 (the gate has no gaze or anatomy signal at all).

## ✅ FLAG-ON RUN EXECUTED 2026-07-25 — the gate is LIVE. Read this before the runbook below.

Run `apr_b3979138-7743-45c8-91cd-a1b747fb6181`, HIRAYA GLOW (the committed
`tests/fixtures/sample-batch/hero.png` hero), Real Talk Review, 9:16, 9 scenes, parked at the
storyboard gate (NOT approved — no video spend). **Cost $0.73**, not the estimated $5: the $5 is
the video render, and the gate only touches scene images, so the remaining spend would have added
zero gate evidence. Both flags were confirmed ON *before* spending, via three free browser probes
(client flag read out of the deployed bundle; server flag via the pre-meter 503 branch; then a
canvas-generated PNG to prove the vision call really runs) — that pre-flight is worth repeating.

**Verdict: the gate works.** 7 of 9 scenes returned real judged verdicts (`reason: null`,
`pass: true`, no flags); 2 failed open. Corroborated by COGS: 8 `gemini-3.5-flash` calls, which is
`IMAGE_GATE_MODEL` ([../api/_lib/imageGate.ts](../api/_lib/imageGate.ts) :28).

**⚠ The runbook's success criteria below are WRONG — do not trust them.** Query A reads
`producer_scenes.gate_verdict`, which came back all-null and looked like total failure. It is not:
nothing in the codebase writes that column (see P2). Query B cannot see a fail-open either, because
`gate_unavailable` is a server-side 200, not a client throw, so it emits no `check_skip`. The
verdicts actually live in `producer_runs.artifacts->'scenes'->…->'gateVerdict'` — read them there:

```sql
select (s->>'sceneIdx')::int, s->'gateVerdict'->>'pass', s->'gateVerdict'->>'reason'
  from producer_runs r, jsonb_array_elements(r.artifacts->'scenes') s
 where r.run_id = '<run_id>' order by 1;
```

### Punch list from the run (P1 SHIPPED; P2-P6 open)

| # | Finding | Where | Status |
|---|---|---|---|
| P1 | **Camera rotation never rotated** — a constant `variationIndex` pinned all 9 scenes to `AVATAR_CAMERA_ANGLES[0]`, so the 4-angle rotation contributed nothing. Neil caught it by eye (5 near-identical frontal shots). | `producerOrchestrator.ts` | **FIXED `4f662a3`** |
| P2 | **`producer_scenes.gate_verdict` is never written by anything.** Column exists, documented as the source for the offline precision analysis — but the verdict only ever reaches the run-header checkpoint jsonb. **This throws away the dataset the whole flag-only phase exists to build.** Fix before flipping Production. | `producerOrchestrator` + `api/producer/advance.ts` | OPEN |
| P3 | **A server-side fail-open is invisible.** 2/9 scenes returned `gate_unavailable` with no `check_skip`/`check_fail`, so the "gate didn't really run" rate is uncountable — exactly the metric contamination the check_skip/check_fail split was designed to prevent. | `producerOrchestrator` | OPEN |
| P4 | Regenerate at Gate-1 has **no cap** (unlimited paid image calls — a COGS hole) and `text-zinc-400` on `bg-zinc-900` reads as disabled (missed by the `a149525` contrast sweep). | `StoryboardGateScreen.tsx` | OPEN |
| P5 ⚠ | **CORRECTED — this is not a doctrine gap, it is non-compliance.** An earlier read of this called the hook end-frame rule "format-blind, should be conditional on scriptType". Wrong: the rule ALREADY branches three ways (`isServices` / `isUGCPro` / else) and `real_talk` derives `scriptType: 'Testimonial'`, which lands on the else branch — *"NO people, faces, hands, or bodies in the hook end frame"* ([prompts.ts](../api/_lib/prompts.ts) :1612). The generated frame had a person, a face AND hands, with the mouth occluded by the bottle. The doctrine is right; **the generator is ignoring its own explicit negative constraint.** | **TUNED** `api/_lib/prompts.ts` | GATED — Neil |
| P6 ⚠ | The script generator emits **unverifiable scarcity** ("limited stock" on a product with no inventory signal) and a **therapeutic claim** ("nag-heal talaga" on a cosmetic — PH FDA). Systemic, not one ad. | **TUNED** prompts | GATED — Neil |
| P7 | **`FACE_TO_CAMERA` violated on a speaking scene.** Second run, scene 4: avatar looking DOWN at the bottle while delivering a line. `looking-down-at-mug` is banned BY NAME in that block ([geminiService.ts](../services/geminiService.ts) :2144) "required for downstream lip sync". Neil's read of the risk is the right one and worth keeping: the still is the video's FIRST FRAME, so a turned head forces the video model to invent unseen face angles — which is where identity drifts. | **TUNED** prompts | GATED — Neil |
| P8 | **The gate cannot see gaze OR anatomy.** `ImageGateObservations` has five fields and no face-visibility or limb-count signal; `compositionNotes` is free text and explicitly "never gates this phase". So the only two flag families are `identity_drift` and `garbled_label` — scene 8's extra hand and scene 4's averted gaze were never *missed*, they were never *in scope*. Adding `faceTowardCamera` is one boolean + one flag, but a new flag family has no business existing before the precision dataset (P2) has data. | `api/_lib/imageGate.ts` | OPEN — after P2 data |
| P9 | **Fail-open rate is HIGH and rising: 3/8 (37.5%) on the second run vs 2/9 (22%) on the first.** The gate declines to judge over a third of the time, halving dataset accumulation. Invisible before P3 — this is P3 paying for itself within the hour. Root cause unknown; the prime suspect is `IMAGE_GATE_UNPARSEABLE` from `gemini-3.5-flash`. | `api/_lib/imageGate.ts` | OPEN — investigate |

### Second run 2026-07-25 — `apr_876ef559-ad7a-4513-a295-4175920fa1c8` (8 scenes, ~$0.73)

Validated all three fixes at once, on the evidence rather than by eye alone:

- **P1 ✅** camera rotation live — the gate's own `compositionNotes` read "Extreme close-up",
  "Medium shot", "Close-up portrait", "Centered medium shot" across the run. Neil confirmed the
  visual improvement unprompted.
- **P2 ✅** `producer_scenes.gate_verdict` populated on **all 8** scenes, and it carries
  `compositionNotes` too — richer than the column was specced for. The dataset is now accumulating.
- **P3 ✅** exactly **3** `check_skip{gate_unavailable}` rows on 3 distinct scenes, in exact
  correspondence with the 3 verdicts carrying `reason: 'gate_unavailable'` (idx 1, 2, 5).

**Then HIGH_ANGLE_SELFIE was cut from `AVATAR_CAMERA_ANGLES`** (`c45ff6e`, Neil-approved TUNED
change) — see that commit for the full n=2 evidence chain and the restore path. It also fixed a
latent trap: the storyboard prompt hardcoded `AVATAR_CAMERA_ANGLES[0..3]`, so the cut would have
rendered the literal string `"4. undefined"` into a live prompt. Generated with `.map()` now.

**Still open from the eyeball, not yet fixed:** the Gate-1 Regenerate button is unclickable because
the scriptLine caption overlays it and lacks `pointer-events-none`
([StoryboardGateScreen.tsx](../components/OneShotAd/StoryboardGateScreen.tsx) :107). Recommended fix
is `pointer-events-none` PLUS scoping the caption to the image box instead of the panel, so it
cannot reach the button strip by construction — three separate pixel-arithmetic hypotheses were
checked and all three were wrong (`bottom-9` and `min-h-[36px]` both generate correctly; the
contrast sweep touched only three text colours).

Also worth knowing: the gate passed 7/7 with zero flags, so **there is still no evidence it CAN
flag** — a gate that never fires is indistinguishable from one that isn't judging. P2 is what turns
that from a guess into a measurement.

## ▶ RUNBOOK (written 2026-07-24 for 2026-07-25) — superseded in part by the section above

Written 2026-07-24 end-of-session. Assumes a fresh cafe PC (defreezer wiped everything except
this repo). Read this section only — the rest is history.

**Use this URL — the branch ALIAS, not a deployment-hash URL:**
`https://grifon-command-git-a97edd-neilmaglayabusiness22-2085s-projects.vercel.app`
It is stable across redeploys of `preview/image-gate-test`, so `localStorage` (the run-resume key
`osa_producer_active_run` + `osa_engine`) survives a rebuild. A deployment-pinned URL changes per
deploy and silently breaks resume — that has bitten twice (F4, and again during the F2 retry).
Previews are SSO-walled: log into Vercel in the same browser first.

> **⚠ STALE-PREVIEW TRAP (hit 2026-07-25, caught by Neil's eyeball BEFORE the spend — read this).**
> `preview/image-gate-test` was cut 2026-07-24 and does **not** follow `main`. By the next evening
> `main` was **41 commits ahead** (PRs #71–#75: the whole Liquid Glass design system **and** the
> Tailwind Play CDN → PostCSS build change), so the preview was still serving the pre-glass UI.
> Neil spotted it by comparing the preview's login page against grifon.ai's. Nothing in the DB
> would have revealed this — the gate telemetry would have looked perfectly fine while validating
> a bundle that no longer ships.
>
> **Before every paid run on this branch, check the direction that actually matters:**
> ```bash
> git log --oneline origin/preview/image-gate-test..origin/main   # main ahead of preview — MUST be empty
> ```
> Note the argument order. The three-dot form (`origin/main...origin/preview/…`) is what produced
> the wrong "zero-diff, it's current" reading — three-dot diffs against the merge base and is blind
> to how far `main` has moved.
>
> **To refresh:** `git checkout -B preview/image-gate-test origin/main`, then
> `git commit --allow-empty -m "chore(preview): rebuild on current main"`, then
> `git push --force-with-lease origin preview/image-gate-test`. The empty commit is required — it
> gives the branch a unique SHA so Vercel builds a new Preview instead of deduping against the
> Production deployment of the same commit. Force-push is safe **only** because this branch's sole
> commit is that empty rebuild marker; verify with the command above that it carries no real work.
> Done 2026-07-25 → `63c9c2e`. Before spending, confirm `api/` and `services/` are unchanged
> (`git diff --name-only origin/preview/image-gate-test origin/main -- api/ services/`) so the
> rebuild is picking up UI only and the gate logic under test is the same code.

1. Open `<alias>/app?osaEngine=producer` — the query param selects the Producer engine and
   persists to localStorage.
2. Load `.claude/skills/director-smoke/` BEFORE touching any wizard field (hero-image FIRST,
   Market Research before Director, never hand-type brand/offer). Delegate browser work to the
   `smoke-tester` subagent, foreground.
3. Run one ad to First Cut. Expect ~$5 and ~9 scenes.
4. Then, in the Supabase SQL editor (project `varoqxjccqmskzeejagn`):

```sql
-- A. Did the gate actually run?  (the whole point)
select scene_idx, gate_verdict from producer_scenes
 where run_id = '<new run_id>' order by scene_idx;

-- B. Where did it NOT run, and why?  (new visibility, 2026-07-24)
select meta->>'reason' as reason, count(distinct (run_id, meta->>'sceneIdx')) as scenes
  from events where event = 'check_skip' and run_id = '<new run_id>' group by 1;

-- C. Cost attribution + forgery alarm (both should look boring)
select * from run_cogs where run_id = '<new run_id>';
select * from run_attribution_anomalies;   -- MUST be empty
```

**How to read it:**
- `gate_verdict` populated on identity/product scenes → **gate is live; flip Production next.**
- All `null` AND zero `check_skip` rows → the client flag never reached the bundle. Most likely
  the Vercel "Sensitive" marking on `VITE_IMAGE_GATE_ENABLED` blocks build-time injection —
  un-mark it (the value is public by construction anyway; it is literally in `dist/assets/*.js`)
  and redeploy the preview branch.
- `check_skip{rate_limited}` on many scenes → should NOT happen any more (fixed 2026-07-24, gate
  now has its own `imgate:burst` bucket at 20/60s). If it does, the fix regressed.
- `check_skip{no_identity_reference}` → identity was NOT checked on that scene even though the
  verdict may say `pass:true`. Expected on resumed runs; on a fresh run it means the avatar
  reference isn't a `data:` URL.
- ⚠ Counting gotcha: one scene can emit TWO `check_skip` rows, so count DISTINCT
  `(run_id, sceneIdx)` — query B already does.

**Also eyeball on this run (free, same render):** the hook title. F7 (`HUWAG NANG` printing as
`HUWACNANG`) was fixed 2026-07-24 with real font metrics. Check (a) words no longer fuse, and
(b) whether the title now sits too close to the frame edges — correctly-spaced words need more
room and `fitText` still sizes from the OLD estimate, so the IMPACT sample measures 921px against
an 864px safe zone (29px outside the 10% side margin, still 79px inside the 1080px frame; nothing
clips). If it looks tight, the follow-up is making `fitText` metrics-aware — deliberately NOT done
without an eyeball.

**Then flip Production:** add `IMAGE_GATE_ENABLED` + `VITE_IMAGE_GATE_ENABLED` = `true` to the
**Production** scope (they are currently Preview-only) and redeploy. Delete the throwaway branch
`preview/image-gate-test` once done.

**Vercel ops are now agent-runnable:** `scripts/restore-vercel.ps1` takes a token
(`$env:VERCEL_TOKEN`, or `$env:VERCEL_TOKEN_FILE` pointing OFF this machine) and skips the
interactive browser login the defreezer wipes.

## GPT 5.6 Sol architecture consult — RUN 2026-07-24 (Neil-requested; Codex CLI `exec --sandbox read-only`, brief-only, NOT a diff review per trial rules)

Sol was given the six architecture facts + six questions (brief preserved in the session
scratchpad; trivially re-derivable from this doc). Verbatim-condensed verdicts, with the main
loop's calibration notes in brackets:

1. **x-run-id attribution: acceptable for COGS diagnostics, NOT decision-grade alone (Med).**
   Real residuals Sol named: (a) SAME-OWNER misbinding — a stale tab/replay can attach events to
   another run the same user owns; invisible to the anomaly view, corrupts per-run comparisons;
   (b) orphan run_ids vanish through the inner join; (c) **'cogs' rows must be server-derived —
   and today `api/events.ts` would accept a client POST with `event='cogs'` + fake `estUsd`,
   which `run_cogs` would sum into the caller's own runs.** Sol's cheap enforce: composite FK
   `events(run_id,user_id) → producer_runs` (DB-side, zero hot-path cost; NULLs exempt legacy).
   [Main-loop read: the client-forgeable-'cogs' vector is the sharpest item — self-poisoning
   only, but it breaks "cost is server-derived" in principle; a reserved-event-name blocklist in
   api/events.ts is a one-liner. FK is a good candidate but interacts with fire-and-forget
   swallow semantics — dropped rows vs forged rows; needs a deliberate choice.]
2. **Gate flag-only phase: right call; verdict events alone can NEVER justify reroll authority
   (High before authority).** His bar: ≥1,000 eligible scenes + ≥200 declared failures per family,
   human audit of ≥500 sampled passes (2 blinded reviewers), fail-precision ≥95% w/ CI lower
   bound >90%, shadow-reroll validation (≥80% of rerolls must fix the cited defect), version-
   stamped cohorts (model/prompt change = new cohort). Sharpest point: **treat "label unreadable"
   / "label missing" / "label crisp but factually WRONG" as separate outcomes — a legibility
   verdict passes beautifully rendered counterfeit text.** [Calibration: the METHODOLOGY is
   right; the Ns are enterprise-scale — at Grifon's pre-launch volume, adopt the structure
   (human-labeled sample, precision floor w/ CI, outcome classes, shadow rerolls, cohort
   stamping) with a first checkpoint at ~100–200 gated scenes, then re-widen.]
3. **spawnSync watchdog: keep spawnSync, but 120s stale should not have TERMINAL authority
   (Med).** One canary ≠ tail evidence; concat can legitimately cross 120s under CPU throttling
   and still beat the 300s ceiling; completed concatMs logs are survivorship-biased (killed runs
   don't log). His shape: phase-aware lease before concat + track `watchdog_stale_then_success`.
   [Main-loop read: legit — the current watchdog CAN false-kill mid-concat and the orchestrator
   refires → duplicate compute. Cheap first step: emit a `stale_then_success` telemetry event
   when a `done` write lands on a sidecar already marked `failed:watchdog_stalled` (detection
   before machinery), + a phase-aware threshold for the known-long concat step.]
4. **704px margin: ship a systemic-dimension guard (Med, easy).** A tier miss is a CAPABILITY
   failure, not stochastic — identical rerolls buy the same undersized image. Log dimension +
   margin per image keyed by model/config, warn <5% margin, circuit-break after consecutive
   below-floor outputs, suppress identical rerolls on open circuit. Don't block P5 on the 64px
   itself. [Agree; margin logging is a small slice. Today's blast radius is bounded — reroll is
   once-per-scene, so a systemic miss wastes ≤N rerolls per run, not a storm.]
5. **Hyperframes: keep product-renderer NO; make the pilot a formal decision experiment.**
   Reopen trigger: ≥2 roadmap-COMMITTED features needing responsive layout + independently timed
   elements, or the next overlay tranche estimated ≥2 engineer-weeks / >2× the browser effort. A
   single kerning bug or an uncommitted wishlist is NOT enough. Pilot bar: same typed scene spec
   as product (never user HTML), ≥500 renders >99.5% completion, p99 <~270s, cost within 25%,
   blind visual preference. **His preferred first experiment: browser-rendered OVERLAY LAYERS
   composited by FFmpeg, which stays the canonical concat/mux/encode path.** [Fully aligned with
   hyperframes_decision.md; the overlay-layer hybrid is the right first experiment if the
   trigger ever fires.]
6. **Two HIGHs + two controls beyond our reviews:**
   - **Provider crash consistency (High):** the dual-driver test proves mutual exclusion, NOT
     exactly-once provider submission — crash between provider-accept and jobHandle record =
     ambiguous job, possible duplicate on requeue. Honest state is "ambiguous" without provider
     idempotency keys/lookup. [True in principle; window is narrow and per-event cost ~$0.50–0.60.
     Logged as accepted risk at current scale; revisit at volume.]
   - **P5 experiment validity (High):** an opt-in cohort is selected + motivated — fine for
     stability discovery, cannot justify a default flip; wants staged user-level rollout with
     holdback + predefined rollback thresholds, sample counts not calendar weeks. [Right for a
     scaled product; Grifon pre-launch has no cohort either way. Folded into P5 criteria: if a
     real user base exists by flip time, stage it; if it's still founder-traffic, the window is a
     stability+cost gate, not an A/B.]
   - **Liveness (High if browser-resident — it is):** claims/revision guards give safety, not
     progress; tab closure/mobile background/lost connectivity must not strand a run. [Known —
     this is exactly the F4/resume-by-DB-lookup lesson, already a P5 bundle candidate; Sol
     independently converged on it, which raises its priority.]
   - **Reproducibility + final acceptance (Med):** snapshot build SHA/prompt bundle/model route/
     flags/storyboard hash per run; and **validate the final artifact before `done` — duration,
     resolution, AUDIO STREAM presence, frame decode.** [The audio-stream check would have
     caught F6 (the silent-render bug we actually shipped) — the strongest single item in the
     whole consult. Small slice: ffprobe the final before the `done` sidecar write.]

   Sol's own concern order: provider crash ambiguity > P5 validity > liveness > gate
   counterfactuals > run-ID integrity > watchdog semantics > dimension margin. "Hyperframes is
   not presently a top operational risk."

**Main-loop shortlist derived from the consult (small, high-value, NOT started — Neil's call):**
(1) `api/events.ts` reserved-name blocklist so a client can't POST `event='cogs'` (one-liner +
test); (2) ffprobe final-acceptance check before the `done` sidecar write (F6-class guard);
(3) `stale_then_success` telemetry + phase-aware concat threshold; (4) per-image dimension-margin
logging. None block tomorrow's flag-ON test.

## ⚠ SUPERSEDED 2026-07-24 — merged, applied, smoked (Neil: "merge, SQL apply, live smoke — G")

The standing orders below were lifted by Neil on 2026-07-24. Current state:

- **MERGED to `main`** — merge commit `b7a545d` (`feat/loop-arch-fastfollow-telemetry`, `--no-ff`,
  local merge; `gh` needs an interactive login the session couldn't run). Build + suite re-verified
  ON THE MERGED TREE, not just the branch: **962 passed / 22 skipped**, bundle-leak clean. P1–P4 +
  all fast-follows are now on `main`. **P4 remains DARK** — `gateDepsFor`
  ([../services/producerDeps.ts](../services/producerDeps.ts)) returns both deps `undefined` unless
  `VITE_IMAGE_GATE_ENABLED === 'true'`, so merging did NOT activate `checkSceneImage` or the AI gate.
- **SQL APPLIED to production** (project `varoqxjccqmskzeejagn` "GRIFON AI", via Supabase MCP —
  `execute_sql`, matching the repo's hand-applied convention rather than adding migration records).
  Verified against `information_schema` AFTER applying, not assumed: `run_cogs` now carries
  `user_id` at ordinal 4 (the append-in-place worked — the live view really was
  `(run_id, est_usd, calls)`, confirming the no-DROP decision), and `run_attribution_anomalies`
  exists with all 7 columns. **Live counts at apply time: 0 anomalies, 30 legacy `cogs` events, 0
  attributed rows, 1 `run_cogs` group row** — exactly the predicted legacy behavior (pre-2026-07-24
  rows carry `user_id = null`, collapse into one null group, and roll up to 0).
- **LIVE SMOKE PASSED — the last P4 flag-ON condition is now MET.** New gated regression
  [../tests/regression/scene-image-check.regression.test.ts](../tests/regression/scene-image-check.regression.test.ts)
  (skipped by default; opt in with `RUN_IMAGE_GATE_SMOKE=1`, mirroring `RUN_REGRESSION`). It calls
  the REAL `generateSceneImage` (real tuned prompt + real `imageConfig`) and the REAL
  `checkSceneImage`; only the `/api/gemini/image` hop is stubbed, and that handler is a pure
  pass-through (`ai.models.generateContent(parsed.data)`), so the request reaching Gemini is
  production-identical. Measured on `gemini-3.1-flash-lite-image` @ `imageSize:'1K'` (~$0.12/run):

  | aspect | returned | ratio vs target | drift | short side | verdict |
  |---|---|---|---|---|---|
  | 9:16 | 768×1376 | 0.5581 vs 0.5625 | −0.78% | 768 | ok |
  | 16:9 | 1376×768 | 1.7917 vs 1.7778 | +0.78% | 768 | ok |
  | 1:1  | 1024×1024 | 1.0000 vs 1.0000 | 0.00% | 1024 | ok |

  > **Margins — the number to actually watch is the SHORT SIDE, not the aspect.** Aspect drift uses
  > 0.78% of a ±2% budget (~39%), comfortable. But the short side clears `MIN_SHORT_SIDE = 704` by
  > only **64px (9%)** on both 16:9 and 9:16 — that is the whole safety margin. `checkSceneImage`
  > HARD-FLAGS and drives the only automated reroll in P4, so if Google ever re-tiers what `1K`
  > returns (or a future aspect lands on a smaller tier), EVERY scene hard-flags and rerolls. Re-run
  > this smoke after any `sceneImageModel` change and before re-enabling the flag. Thresholds were
  > NOT adjusted — they now have empirical backing and adjusting them without cause would spend the
  > margin the check exists to enforce.
  >
  > Tail case checked and CLOSED BY CONSTRUCTION: `generateSceneImage` accepts `4:5`/`3:4`, which
  > are absent from `ExpectedAspect` and would make `ASPECT_RATIO[...]` undefined → NaN comparison →
  > `aspect_mismatch` on every scene. Not reachable: `ProductionInput.aspectRatio`
  > (producerOrchestrator.ts:141) is typed to exactly the same three values.

**Remaining to flip P4 ON:** both gating conditions are discharged (metering redesign 2026-07-23;
live smoke 2026-07-24). Env vars ADDED by Neil 2026-07-24 — but see the scope trap below.

> **⚠ ENV SCOPE TRAP (hit 2026-07-24, cost a wasted redeploy — read before testing).** Neil added
> `IMAGE_GATE_ENABLED` + `VITE_IMAGE_GATE_ENABLED` scoped to **Preview**, then redeployed
> **Production** (three redeploys of `48ca455`, all `target: "production"` per the Vercel API).
> A Production deployment does NOT receive Preview-scoped env vars, so the gate stayed fully dark
> and the redeploys changed nothing. Failure mode is SILENT and easy to misread: a Producer run on
> prod would show no `gate_verdict` and no `check_skip`, looking exactly like a broken gate rather
> than an unset flag. **The env scope must match the deployment target.** Since the branch merged,
> every push to `main` builds Production — a Preview build now needs a non-main branch push (or
> `vercel deploy` without `--prod`). Branch `preview/image-gate-test` was pushed from `main` for
> exactly this. Note previews are SSO-walled (Deployment Protection ON), so browser-login first.
>
> Also worth knowing: the `VITE_` half being build-time was CONFIRMED empirically, not assumed —
> a local build with the flag on puts `VITE_IMAGE_GATE_ENABLED:`true`` literally in
> `dist/assets/index-*.js`. That also means the value is PUBLIC by construction, so marking it
> "Sensitive" in Vercel buys nothing (it was left marked Sensitive; whether that blocks build-time
> injection was NOT verified — if a preview build shows the gate still dark, un-mark it and retest).

## Standing orders from Neil (2026-07-23, verbatim constraints — SUPERSEDED, see above)

**Do not merge or enable anything. Do not trigger the paid canary until Neil approves the cost estimate. Keep P4 disabled.** Model policy: Opus main loop (pin now `claude-opus-4-8`); Fable only with Neil's per-invocation approval, scoped, blueprint/high-risk-review only.

## Work queue (in order)

### 1. P3 concurrency test (BEFORE canary; test-only — no production code changes unless it finds a real defect, and then report+propose first, don't implement)
The one reasoned-but-untested P3 risk: concurrent checkpoint commits vs the real revision guard. Write a deterministic test in `tests/producerOrchestrator.test.ts` (or sibling) whose mock `persist` faithfully reproduces the REAL guard semantics — study `api/producer/run.ts` (optimistic `revision` check → `{ok, changed:false, current}` on stale) and `services/producerDeps.ts:78-94` (client adopts server revision on conflict). Simulate: delayed + out-of-order commits from both pair sites (scene_images∥video_prompts, video∥thumbnail) and a slow commit landing after `approveStoryboard` on a shallow-spread copy (`{...run}` — mirror `ProducerFlow`). Prove: (a) newest state never overwritten by stale state after conflict-adopt + re-commit; (b) no `onUpdate` ever re-delivers `status:'review'/gate:'storyboard'` post-approval; (c) final checkpoint contains videoPrompts + all imageUrls + thumbnailUrl.

**STATUS 2026-07-23 (Opus session): DONE.** `tests/unit/producerCheckpointConcurrency.test.ts`
(8 tests). Harness fidelity: uses the **real** `producerDeps.persist` (real `toCheckpoint`, real
conflict-adopt branch) and fakes **only** `saveRunCheckpoint`, reproducing `api/producer/run.ts`'s
POST exactly (insert@rev0; `UPDATE … WHERE revision = known` → increment; 0 rows →
`{changed:false, current}`). Request bodies are deep-snapshotted synchronously at call time and
land after a scripted number of microtask ticks — deterministic, no timers, reorderable.
Invariants (a)/(b)/(c) all hold. Mutation-checked: neutering the server revision guard fails 4
tests; neutering the client conflict-adopt branch fails 1 (the forked shallow-copy case — the only
place adoption is load-bearing, since both racers share one `run` object and the *winner* already
writes the fresh revision). Suite 922 passed / 22 skipped; build + bundle-leak clean.

**Gap found (P3-introduced, NOT fixed — and the one-line fix is WRONG; do not ship it):**
`toCheckpoint` in [../services/producerDeps.ts](../services/producerDeps.ts) omits `thumbnailUrl`
from `artifacts`, but the resume path
([../components/OneShotAd/ProducerFlow.tsx](../components/OneShotAd/ProducerFlow.tsx),
`thumbnailUrl: art.thumbnailUrl`) reads it back. Before P3 the thumbnail was not a producer
artifact; P3 promoted it to a node.

*Corrected 2026-07-23 after checking the code — an earlier revision of this entry overstated both
the impact and the fix:*

- **No re-spend.** `stages` IS checkpointed, so a current-shape resume already carries
  `thumbnail: done`; `normalizeStages` early-returns
  ([producerOrchestrator.ts:531](../services/producerOrchestrator.ts)) and the driver skips the
  node. The `if (id === 'thumbnail' && run.thumbnailUrl)` inference only fires for OLD-shape
  (pre-P3) checkpoints, where `thumbnailUrl` is absent anyway.
- **Real impact is cosmetic:** after a reload / cross-device resume, `run.thumbnailUrl` is
  undefined, so First Cut hides the cover-frame preview + download link
  ([FirstCutScreen.tsx:171,277](../components/OneShotAd/FirstCutScreen.tsx)). No lost spend, no
  corruption, no stuck run.
- **The naive one-liner is harmful.** `generateThumbnail`
  ([geminiService.ts:2311](../services/geminiService.ts)) returns a **base64 data URL**, not a
  signed URL (the type comment at producerOrchestrator.ts:226 is inaccurate — worth correcting).
  Adding `thumbnailUrl: run.thumbnailUrl` to `artifacts` would push MBs into the run-header jsonb
  on every checkpoint after the thumbnail node — exactly what
  [api/producer/advance.ts:21-24](../api/producer/advance.ts) says `record_image` exists to
  prevent ("keeps multi-MB images OUT of the run-header checkpoint jsonb, whose oversized writes
  hit Postgres statement timeouts", 2026-07-02 SIGLA smoke). It would trade a hidden download
  button for 413s / stalled checkpoints.
- **SHIPPED 2026-07-23** (Neil said GO after the correction). Implemented as described below:
  `producer_runs.thumbnail_url` column + `record_thumbnail` action on `api/producer/advance.ts` +
  `recordThumbnail` on the run store (OPTIONAL on `ProducerRunStore`, best-effort at the call
  site) + `ProducerFlow` resume reads `row.thumbnail_url ?? art.thumbnailUrl`. Nothing enters the
  artifacts jsonb — asserted by a test over the run's whole write history.
  **⚠ ACTION FOR NEIL: re-run `supabase/producer_runs.sql`** (idempotent) to add the column. Until
  then the write 500s, is swallowed best-effort, and behavior is exactly as it was — safe to merge
  before applying.
- **Correct fix shape (as implemented — schema + endpoint, NOT a one-liner):** give the thumbnail its
  own small durable write, mirroring `record_image`'s dedicated per-scene row — e.g. a
  `producer_runs.thumbnail_url` column (idempotent `alter table … add column if not exists`) plus
  a `record_thumbnail` action on `api/producer/advance.ts` (which already has the 4mb bodyParser
  for exactly this class of payload), with the resume path reading the column instead of
  `artifacts`. Roughly the size of a P4-style slice. Given the impact is one hidden download
  affordance on resume, **deferring is defensible** — recommend bundling it with P5 rather than
  opening a phase for it.

The `KNOWN GAP` test in `tests/unit/producerCheckpointConcurrency.test.ts` pins the current
behavior so this can't silently change; flip it in the same commit as whatever fix lands.

### 2. Verify Vercel preview for `feat/loop-arch-p4-image-gate` — **VERIFIED REACHABLE 2026-07-23, but SSO-walled**
Neil supplied `https://grifon-command-aislzgfu2-neilmaglayabusiness22-2085s-projects.vercel.app`.
Unauthenticated probe: `GET /` → 302 to Vercel SSO; `POST /api/gemini/image` → **Vercel's** 401
(`_vercel_sso_nonce` cookie, no `x-request-id` header) — i.e. **Vercel Deployment Protection is ON
for previews**; requests never reach our handlers. Deployment exists and responds; the running
commit could not be confirmed from outside (deployment-hash URL + wall). Consequence for the
canary: the smoke browser must get past the wall first. Two options (Neil picks):
(A) log into vercel.com once inside the smoke-tester's Playwright browser window — zero settings
changes, dies with the session; or (B) Vercel → Settings → Deployment Protection → "Protection
Bypass for Automation" secret (protection stays on for humans; automation appends
`?x-vercel-protection-bypass=<secret>&x-vercel-set-bypass-cookie=true` once). Do NOT simply
disable protection.

### 3. Canary — **RUN 2026-07-23** (Neil-approved, $15 cap; Neil drove the browser, agent watched DB telemetry)

**Run:** `apr_48736802-d4be-4317-b900-39869f915da8` on the P4 preview (SSO note below), LUNARIA
serum (codex-image hero `.tmp/canary-hero-lunaria.png`), Real Talk Review, 9:16, **9 scenes**
(no scene-count control in intake; script dictated 9 — original 6-scene estimate obsolete).
**Spend: $5.41 run_cogs** (9 video submits: mixed kling-v3 $0.50 + veo-3.1-lite $0.60 ✓ routing
mix live) + ElevenLabs credits ×2 (see F1). Launch→Gate-1 in **2m19s**.

**Architecture evidence (all live, real Postgres):** P2 telemetry spine complete
(node_start/done/fail, gate_park/approve, 27 cogs events, run_cogs view correct); P3 parallelism
live (scene_images ∥ video_prompts overlapped; video ∥ thumbnail); **claims held under a REAL
dual-driver race — exactly 9 video submits for 9 scenes, zero double-spend**; revision guard +
conflict-adopt worked under a conflict storm (rev → 54); error state parked cleanly + resumable.

**Findings (ranked):**
- **F1 — Approve button: no in-flight guard + no first-click feedback (HIGH, product bug).**
  `gate_approve` fired 2× → TWO concurrent `runProduction` drivers from approval on → every
  batch stage double-ran (video×2 starts, thumbnail×2, voices×2 → **double ElevenLabs burn**,
  edl×2). Root cause per Neil (he's seen it "matagal na"): first Approve click gives NO
  immediate visual response, so users naturally click again; `handleApprove`
  (components/OneShotAd/ProducerFlow.tsx) has no busy guard, and `approveStoryboard` is
  idempotent only sequentially, not concurrently. Fix shape: disable+spinner on first click AND
  a concurrency guard in approveStoryboard. The claims layer is why this cost credits, not
  dollars — but it burned real ElevenLabs credits and doubled run telemetry.
  **F1 FIX SHIPPED 2026-07-24** (commit `3907838` on `feat/loop-arch-p4-image-gate`).
  Defense-in-depth, exactly the fix shape above: (1) `ProducerFlow.handleApprove` now guards
  on a synchronous `approvingRef` (setState can't stop a same-tick second click) + `approving`
  state; (2) `StoryboardGateScreen` disables the button + shows a `Loader2` spinner "Starting
  the render…" on first click — the actual no-feedback cause; (3) `approveStoryboard` sets
  `storyboardApproved` + emits `gate_approve` BEFORE the first `await` with an early-return, so
  a concurrent second caller bails (no second driver, no second event) even past the UI guard.
  New concurrent-double-approve test in `tests/producerOrchestrator.test.ts`; the
  `consolidateVoices===1` assertion is the discriminating catch (guard removed → fires 2×,
  reproducing the double burn). Suite 940/22, build + bundle-leak clean.
- **F2 — EDL fails deterministically with ZERO output tokens (HIGH, blocks this run).**
  4/4 EDL calls: `inputTokens 4767 = totalTokens, outputTokens null` — the model produced NO
  text; `const raw = response.text || '{}'` (services/geminiService.ts:1471) silently converts
  empty output into `{}` → misdiagnosed as `EDL_MALFORMED`. The legacy handler RETURNS
  `promptFeedback` (block reason) but the client discards it. Fix shape (transport, fair game):
  when `response.text` is empty, log/surface `promptFeedback` + `finishReason` and throw a
  DISTINCT retryable transport error; investigate why this run's payload (9-scene prompt +
  audio inlineData parts) zero-outputs on `gemini-3.6-flash` (the 2026-07-18 run passed EDL on
  the same model). Run left in `status=error`, fully resumable — one Retry after the fix
  finishes the ad, no re-spend.
- **F3 — Preview OAuth redirect bounces to prod.** Google login on a vercel.app preview lands on
  grifon.ai (preview origin not in Supabase redirect allowlist; app sends
  `redirectTo: window.location.origin` correctly). Workaround used: email-OTP login (no
  redirect). Permanent option: add `https://grifon-command-*-<team>.vercel.app/**` to Supabase
  Auth → Redirect URLs.
- **F4 — CORRECTED (the original claim was wrong):** the `apr_` runId prefix is NOT drift —
  `newRunId` in services/producerRunService.ts:94 emits `apr_${uuid}` by design (the `osa_` form
  is only createProductionRun's internal default, which ProducerFlow overrides). Why Neil's
  console `localStorage.getItem('osa_producer_active_run')` returned null mid-run remains
  unexplained (possibly timing or console context) — regardless, the durable lesson stands:
  session tooling should read the DB (producer_runs by user, newest first), not localStorage.
  **F2 FIX SHIPPED 2026-07-23** (same session): `generateEditDecisionList` now throws
  `EDL_EMPTY_RESPONSE: … (finishReason: X, blockReason: Y)` on an empty model reply instead of
  masking it as EDL_MALFORMED, and console-warns the full promptFeedback. 4 new seam tests in
  tests/unit/edit-decision-list.test.ts.
  **F2 ROOT CAUSE CONFIRMED (2026-07-24 live retry on the fixed preview):**
  `blockReason: PROHIBITED_CONTENT`, `finishReason: none` — **Gemini blocks the EDL request at
  the PROMPT level** (zero generation), deterministically (5/5 across two days), for THIS run's
  payload. PROHIBITED_CONTENT is a NON-CONFIGURABLE safety category — SAFETY_SETTINGS cannot
  override it. The 2026-07-18 run (different content) passed the same code+model, so the trigger
  is this run's MEDIA/content mix (9 scene videos of a woman applying serum to her face + 9
  voice clips + script), not the tuned prompt text per se. Suspected: skincare
  face/skin-application imagery reading as a sensitive category. NOT a code bug; Retry is
  useless for this run until the input changes.
  ~~**Next-step options (Neil picks):** (a) media-bisect / (b) media-less degrade lane /
  (c) park~~ → **BISECT RUN 2026-07-24 (local, ~$0.08 total, ~30 Gemini calls). The media
  hypothesis was WRONG; option (b) as originally designed is REFUTED; a corrected fix shape
  was validated live.** Full method + evidence:

  **F2 BISECT FINDINGS (2026-07-24, 5 tiers, all deterministic):**
  The run's media (9 videos + 9 voice mp3s, R2 URLs recovered from `artifacts.scenes`) and
  script text were tested against `gemini-3.6-flash` directly (same SAFETY_SETTINGS, same
  responseMimeType+thinkingLevel as production; exact-repro call reproduced the live block at
  the IDENTICAL 4767 input tokens). Results:
  - **Media is INNOCENT.** Videos-only, audio-only, script-text-only, videos+audio, and
    script+videos+audio ALL PASS under a neutral instruction.
  - **The tuned EDL prompt + this script BLOCKS with ZERO media attached** (prompt-only =
    PROHIBITED_CONTENT). So the trigger is TEXT-level → the original degrade-lane idea
    (strip media, keep script) would have shipped and NOT fixed anything.
  - **Line-level sweep:** 6 of 9 script lines individually trip the block inside the skeleton
    (the first-person testimonial lines: "Ako si Elena…", personal-fatigue story, scarcity CTA);
    the most health-claim-y line ("brighten ang skin at pantay ang tone") PASSES — it is NOT a
    health-claims block, it is Gemini's **fabricated-testimonial/deceptive-ads policy**.
  - **Section bisect floor:** the INPUT CONTEXT alone (script + "Final ad script" + brand +
    "Target platform: tiktok" + Testimonial voice tone) blocks with no instructions at all.
    Same lines as "quoted material" pass; as "an ad to distribute", blocked. No prompt wording
    can escape while the script text rides in the prompt.
  - **Also refuted:** benign-context framing (prefix AND systemInstruction variants) does NOT
    unblock; sibling models `gemini-3.5-flash` + `gemini-3.1-flash-lite` block identically.
  - **⚠ BLAST RADIUS: the whole TESTIMONIAL style is at risk**, not LUNARIA specifically —
    any run whose script carries the first-person-transformation voice can hit this. The
    2026-07-18 pass was different content. Monitor via EDL_EMPTY_RESPONSE events telemetry.

  **VALIDATED FIX SHAPE (live-proven 2026-07-24, one probe):** keep the tuned skeleton
  byte-identical but replace `finalScript` + per-scene `scriptLine` values with neutral stubs
  ("(see attached scene N audio for the spoken line)") and attach media as usual → **PASSES,
  and the model correctly detects testimonial style and writes a coherent, content-aware EDL
  by reading the script from the attached voice audio** (usage 9585in; output was probe-capped).
  ~~Proposed implementation (Neil sign-off required)~~ → **APPROVED by Neil + SHIPPED
  2026-07-24** (commit `c5ae567`, implemented by `code-executor`, reviewed by the main loop):
  `buildPromptText(eff)` parameterization (TUNED template byte-identical, only `input.*`→`eff.*`
  interpolation renames), media parts built once and reused across attempts, one stubbed retry
  on empty-with-blockReason, no retry on non-block empties, `(degraded retry also blocked)`
  marker on double block. 4 new proxy-seam tests. Suite 944/22, build + bundle-leak clean.
  **F2 CLOSED LIVE 2026-07-24 (~20:02 UTC 07-23): the degrade lane finished the LUNARIA ad
  on its first real firing.** Retry on preview `kw2i9gd5j` (commit `9c1f7bb`): attempt 1
  blocked as always (cogs 4767in/0out) → console warn `[edl] prompt blocked (PROHIBITED_CONTENT)
  — retrying with script-stubbed prompt` → `node_done{edl}` 19:59:12 → `node_done{final_render}`
  20:02:28 → `gate_park` (First Cut) 20:02:33. Zero video re-spend. Note: EDL attempts rode
  through several `Proxy timeout (504)` transport retries (the EDL call flirts with the Vercel
  60s ceiling; server-side completions of timed-out calls also log duplicate 4767/0 cogs rows —
  known telemetry artifact, not double-billing of video).
  **Resume gotcha found en route (new, minor):** the run resume key `osa_producer_active_run`
  + the `osa_engine` flag live in localStorage, which is per-ORIGIN — deployment-pinned preview
  URLs change per deploy, so cross-deployment resume silently no-ops (user sees the launch
  screen, no Retry). Workaround used: set both keys via console on the new origin + open
  `/app?osaEngine=producer`. Durable fix candidate (bundle with P5): resume by DB lookup
  (producer_runs by user, newest active) instead of localStorage — the F4 lesson, now bitten twice.
  **LUNARIA unblock timing:** the run's media URLs in `artifacts.scenes` are presigned R2 URLs
  that EXPIRE 2026-07-24T16:00Z (~midnight PH). After that, an EDL retry needs re-signed URLs —
  check whether any server path re-signs on resume before assuming Retry works.
  Bisect harness (method reference; scratchpad copy dies with the defreezer): 5 tiered scripts
  calling generateContent directly with subset payloads — trivially re-derivable from this doc.
- **F5 (minor):** the RunningScreen console shows a Tailwind-CDN production warning; duplicate
  `node_done{thumbnail}` events under F1's dual driver (emit is per-driver, dedupe not needed
  once F1 is fixed).
- **F6 — SILENT FINAL RENDER (HIGH, pre-existing on main, found + FIXED 2026-07-24 `8ab6226`).**
  The LUNARIA First Cut shipped with no audio at all: a ~4kb/s empty AAC track, silent except
  20ms clicks at exact scene boundaries. Diagnosis chain (all evidence-first): voice MP3s on R2
  loud (-26dB, and the renderer USED them for trim timing — `detectedSec` matched Elena's line
  lengths); EDL carried all 9 sourceAudioUrls; the render request builder passes audioUrl; the
  Vercel logs showed `layers=0 sfx=0` (stitchedOnly preset `none` — captions/SFX absence is by
  design at First Cut) yet VO should mix via `[1:a]`. Reproduced locally with the exact
  buildScene args + real scene media → **`-shortest` is the silencer**: x264 encoder delay makes
  video packets reach the muxer late, so shortest-logic closes the audio stream after its first
  packets. Same inputs minus `-shortest` → voiced (-28dB). NOT a branch regression — identical
  on `main` since the Phase-2 render executor → **every voiced producer First Cut was likely
  silent** (matches agent_lessons' "audio mixes" escaped-defect class; old finals unverifiable,
  presigned URLs expired). Fix: `-t trimSec` bounds every real path; `-shortest` kept only on
  the rare probe-failure (null trimSec) path where it is apad's sole bound. Verified locally:
  normal + apad/hook + 2-scene concat all voiced and duration-exact. ElevenLabs note: the retry
  regenerated NO voices (last gen 5h prior) — reuse worked, zero re-spend, the loss was purely
  in the final mux.
  **F6 CLOSED LIVE 2026-07-24 (~20:48 UTC 07-23):** Neil re-assembled on the fixed deployment
  (`bt1fk8kks`, commit `1d6ede9`) with the `spotlight` preset → new final `b2226101…mp4`
  measured BEFORE listening: audio 131kb/s (was 4kb/s), mean −18.2dB (was −58), peak −1.2dB —
  voice + captions + SFX all present. Server render path verified end-to-end on real media.
  Merge-story note: F6 was pre-existing on `main`, so this branch now FIXES a latent
  production bug rather than adding risk.
- **F7 — hook overlay title kerning (LOW, cosmetic, NEW 2026-07-24, Neil eyeball on the
  spotlight First Cut):** the premium hook title words render MAGKAKADIKIT — "HUWAG" and
  "NANG" overlap/collide (screenshot: "HUWACNANG"). Suspect: the word-pop/premium hook
  word-layer x-advance math in the drawtext plan (`planScene`/`buildWordFilters` region,
  api/_lib/renderFfmpeg.ts) under-measures glyph widths for bold uppercase + punctuation.
  Not merge-blocking; fix in the burn-in layer.
- **NEIL PRODUCT FEEDBACK BATCH (2026-07-24, "log muna, later ang build") — overlay-text
  quality on the First Cut presets:**
  1. **Per-scene hero-word title overlays** — today only the hook gets a big title; Neil
     wants EVERY scene to surface its most important word/topic as a large designed title,
     TIMED to the moment it's spoken (the auto-caption timing is already "perfect" per Neil —
     reuse that timing source).
  2. **Non-hook overlay text is generic** — plain black/white, no design language; wants
     styled treatment.
  3. **Entrance/exit animations on all overlay text** — in/out motion, not static burns.
  4. **The HTML-overlay idea ("hyperframes")** — Neil proposes switching overlay-text
     rendering to the HTML→video approach for premium quality, and asks whether each edit
     style (RAW/AUTO/IMPACT/CLEAN/PUNCH/BARS/SPOTLIGHT) would map to its own HTML template
     family. ⚠ NOTE: `workflows/hyperframes_decision.md` (2026-07-22, Claude + GPT 5.6 Sol)
     verdicted **product renderer = NO — FFmpeg stays frozen**; the pilot lane is Neil's OWN
     marketing via ai-editor only. Adopting HTML overlays in the product renderer would
     REVERSE that decision → needs its own session: re-open the decision doc, weigh cost
     (per-render compute, latency, a browser in the render path) vs the drawtext upgrade
     path (fix F7 + preset design polish inside FFmpeg first). Do NOT start this casually.
  5. **Thumbnail provenance (answered):** the producer cover frame = the SAME tuned
     MrBeast-formula `generateThumbnail` the Director wizard uses; only diff is the producer
     passes no `brandColors` (`[]`) — consider threading brand colors in as a small polish.

### 3 (original). Canary (ONLY after Neil approves the cost estimate below)
One end-to-end Producer run (6 scenes, 9:16, gate flags OFF) against the P4 preview. It live-exercises: flow schema ladder, watchdog, run telemetry rows (verify `run_cogs` + `cost_usd` against real Postgres), P3 parallelism. Wizard-driving rules: load `.claude/skills/director-smoke/` first; delegate browser work to `smoke-tester`.

### 4. P4 metering redesign — **BUILT 2026-07-23** (Neil approved Option A as amended by the Fable review; implemented by `code-executor`, reviewed by the Fable main loop)
Shipped shape: gate mode keeps auth + the burst RL, **no longer touches the customer `images`
meter** (no `getUserPlan`/`consumeMonthly` in gate mode). Primary bound = per-user daily budget
`imgate:user:${userId}` @ 48/24h via `rate_limit_check` (not dev-bypassed; fails open to the
in-memory backstop — acceptable at ~$0.002/call). Secondary = per-`imgate:${runId}:${sceneIdx}`
@ 2/24h idempotency (runId is client-controlled → can only burn the caller's own daily budget).
Review findings folded in: client-supplied `model` field REMOVED from `GateBody` (finding 1);
`runFlowWithSchema` now absorbs a first-call `SyntaxError` inside the same 2-invocation budget,
non-SyntaxError errors still propagate immediately (finding 2). `sceneIdx` threaded client →
orchestrator → GateBody. New handler test harness `tests/unit/imageGateHandler.test.ts` (7 cases,
first api/producer-style endpoint harness for image.ts) + 4 parse-throw ladder cases. Flag-ON
conditions remaining: live smoke of `checkSceneImage` vs real `sceneImageModel` output — then flip
`IMAGE_GATE_ENABLED` + `VITE_IMAGE_GATE_ENABLED`.

### ~~4 (original design note)~~ (superseded by the build above)
Problem: gate checks currently consume the customer's monthly `images` meter (~2× burn; one gated 12-scene run ≈ a Starter plan's whole 25/mo). Constraints: authenticated, rate-limited, idempotent per scene, tracked as internal COGS, **no public unmetered endpoint**. Recommended shape (mirrors the Omni per-ad budget pattern in `api/gemini/omni-video.ts`): keep auth + the burst rate limit, REPLACE `consumeMonthly('images',…)` in gate mode with a **hard per-run gate budget** via the existing `rate_limit_check` RPC — key `imgate:ad:${runId}` (fall back to `imgate:user:${userId}` daily when no runId), limit = 2× MAX_SCENES (24) per 24h, NOT dev-bypassed — plus a per-scene idempotency key `imgate:${runId}:${sceneIdx}` (limit 1) so retries can't re-bill. COGS keeps logging `image_gate` with runId (internal cost tracking). Result: no customer-quota drawdown, still bounded, still authenticated, abuse capped at pennies/run. Alternative (simpler, weaker): keep metering but on a new internal `image_gate` meter with generous limits mirrored in `quota.ts` MONTHLY_LIMITS + parity test.

### 5. Open Neil decisions (blockers per item)
- Merge the PR chain (his call; P1–P3 are live-on-merge).
- Approve canary cost estimate (below).
- Pick the P4 metering redesign option → then implement → then live smoke `checkSceneImage` vs real `sceneImageModel` output → only then flip `IMAGE_GATE_ENABLED` + `VITE_IMAGE_GATE_ENABLED`.
- Apply `supabase/producer_runs.sql` re-run (adds `gate_verdict` column; idempotent).
- ~~Approve the scoped **Fable review** of the two high-risk slices~~ — **RUN 2026-07-23** (Fable 5,
  Neil-approved via `/model` + explicit scope confirm). Verdict: **both slices structurally sound —
  no blocker for merging dark**; the fail-direction doctrine (credits closed / gates open) is
  applied consistently, the ladder returns results byte-unchanged on valid output, the judge's
  conservative direction is right for a flag-only phase. Ranked findings (report-only, none fixed):
  1. **MEDIUM · fix before flag-ON** — gate mode accepts a client-supplied `model`
     (`GateBody.gateCheck.model: z.string().optional()` → `runImageGate` uses it verbatim). Second
     unallowlisted model entry point on `image.ts` (the generate path's missing allowlist was
     already a Part-2 finding). The shipped client never sends it → dropping the field (or pinning
     to `IMAGE_GATE_MODEL`) costs nothing. Unreachable today (flag OFF).
  2. **MEDIUM** — a handler **throw** (unparseable JSON → `JSON.parse` throw at
     `api/_lib/prompts.ts:995`) bypasses the regen ladder entirely → 502 with no repair attempt.
     The ladder only heals parseable-but-schema-wrong output, so the P1 target class "malformed
     output → 502, no repair loop" survives in its parse-throw form. Knock-on: the producer stage
     retry that follows is a NEW request, so adscript burns a second `workflows` meter unit where
     an in-request regen would be free. Fix shape: try/catch the first handler call inside
     `runFlowWithSchema`, regen once on throw (same budget), rethrow on the second. Transport-layer,
     not TUNED. `flowRegenLadder.test.ts` has no throw-path case — add one with the fix.
  3. **LOW/MEDIUM** — adscript worst case exceeds the blueprint budget: plan §3.3 says "≤4 model
     calls total"; the ladder regen re-invokes the whole handler (classifier + gen + hook-retry +
     verb-reroll) → up to ~8 calls, and the double-pass elapsed time (2× thinking gens) risks the
     55s client abort → stage retry → double `workflows` metering. Rare (needs schema-miss after
     the in-flow regens). Accept, or thread resolved classifier results into the regen.
  4. **LOW** — identity gate silently no-ops on resumed runs: `run.input.avatar.url` can be
     dropped by `slimCheckpointInput` (>700KB) or be a remote URL → no usable reference →
     `personMatchesReference: null` → never flags. Correct fail-open direction, but it will
     depress measured gate coverage — account for it in the `gate_verdict` precision analysis.
  5. **LOW** — gate + generate share `gemini:image:${user.id}` @15/min; a gated 6-scene pooled run
     makes ~12–14 calls, so under load the gate 429s and silently skips (coverage gap only).

  **Metering verdict (queue item 4): Option A, with one amendment.** The per-run key
  `imgate:ad:${runId}` cannot be the primary bound — runId arrives via client-controlled surface
  (`x-run-id` / request field), so an abuser rotates runIds for fresh budgets. Primary bound must
  be **per-user daily** (`imgate:user:${userId}`, e.g. 48/day ≈ two gated 12-scene runs +
  headroom), with per-`${runId}:${sceneIdx}` idempotency (limit 1) kept as-designed — worst case a
  client burns its own budget. Keep auth + burst RL + COGS logging; NOT dev-bypassed. Note
  `rate_limit_check` fails open to a per-instance memory backstop — acceptable at gate-call prices.
  Option B (internal monthly meter) rejected: month-granular (a burst exhausts it → gate silently
  off for weeks → biased telemetry), no per-scene idempotency. Fold finding 1 into the same slice.

### 7. Fast-follows before P4 flag-ON / P5 — **BUILT 2026-07-24** (branch `feat/loop-arch-fastfollow-telemetry`, implemented by `code-executor` on Opus 4.8, reviewed in the Opus main loop under `/fable-mode`)

**Slice A — forgeable-COGS hole + x-run-id ownership (closed).** `fireCogsRunEvent` passed NO
userId, so every `cogs` row landed `user_id = null`; combined with `getRunId` accepting any
client-supplied `x-run-id`, an authenticated user could point `x-run-id` at ANOTHER user's run and
silently merge their spend into that run's `run_cogs` roll-up → `producer_runs.cost_usd`. Since P5
is gated on 2–4 weeks of exactly this telemetry, the hole corrupts the decision the telemetry
exists to inform. **Fix (attribution, not a hot-path ownership lookup):** the three `logModelUsage` /
`logImageUsage` / `logVideoUsage` helpers take a trailing optional `userId`, threaded from the
already-verified `user.id` at all 13 COGS call sites (`gemini/image.ts` ×2, `gemini/video.ts`,
`kling/video.ts`, `gemini/text.ts` ×9 incl. the classifier chain + `runFlowWithSchema`);
`run_cogs` now groups by `(run_id, user_id)`; `api/producer/run.ts` scopes the roll-up with
`.eq('user_id', user.id)` — sound because the roll-up sits on the UPDATE path, past the 403
ownership guard at `run.ts:105-107` (the INSERT path returns at :132). **Deliberate design call:**
`x-run-id` is still NOT ownership-checked at write time — a DB round-trip per generation call would
violate "telemetry must never slow the request path". Forged rows are now *detectable and
filterable* instead of silently merged. **⚠ ACTION FOR NEIL: re-run `supabase/events.sql`** (still
idempotent — `user_id` is deliberately the LAST view column so `create or replace view` can append
it in place; an earlier draft used `drop view`, rejected in review because a DROP discards any
accumulated GRANTs and briefly breaks the reader). **Legacy data:** pre-2026-07-24 `cogs` rows carry
`user_id = null`, match no owner, and roll up to 0 — expected, not a regression.

**Slice B — watchdog heartbeat coverage (improved, with a named architectural limit).** Beats only
fired *inside* `renderFinalVideo`; two windows had none: (a) between `concat` and `audio master`
sat the music-bed mix AND `masterAudio` — two full-program passes; (b) the whole upload/sign tail in
`final.ts` (multi-MB `putMedia` + two `getMediaUrl`) before the terminal write. Either exceeding
`WATCHDOG_STALE_MS` (120s) lets a poll mark a *succeeding* render `failed:watchdog_stalled`, the
client stops polling, and `withRetry` re-fires a whole render. Not hypothetical — the canary's
final_render stage ran ~196s wall. Added `onStep` beats before the bed mix, before `masterAudio`,
before `putMedia`, and before signing. Thresholds deliberately NOT raised.

> **⚠ FINDING (pre-existing, NOT introduced by this slice, NOT fixed — for the Fable review):**
> every ffmpeg invocation in `renderFfmpeg.ts` is **`spawnSync`** (line 1 import, dispatcher at
> :454), so a pass blocks the Node event loop for its full duration. A heartbeat's `writeSidecar`
> is async, so a beat queued immediately before a blocking pass **cannot flush until that pass
> ends** — the ffmpeg-side beats therefore act as pass-*boundary* flushes, not as pre-pass
> freshness. Net effect is still a strict improvement (more flush points ⇒ smaller max gap), and
> the `final.ts` upload/sign beats are unaffected (those are `await`ed async ops, event loop free).
> But it means **no heartbeat can refresh the sidecar *during* a single long pass**: the watchdog's
> effective resolution is "one ffmpeg pass," and any single pass exceeding 120s still false-kills a
> healthy render regardless of beat placement. Plausible at the 12-scene end. Options if it bites:
> async `spawn` in the render path (large, risky, TUNED-adjacent), or a beat-emitting ffmpeg
> progress reader. Reasoned from the code, NOT measured in production.

**Verification (re-run independently in the main loop, not taken from the executor's report):**
`npm run build` green; `npx vitest run` **956 passed / 22 skipped** (baseline 945/22, delta +11 =
exactly the 11 tests added). Bundle-leak clean. New tests: `tests/unit/runEventsUserId.test.ts`,
`tests/unit/renderTailHeartbeat.test.ts` (storage-seam, manual clock, negative-control verified by
the executor: removing the two beats fails it), plus 5 cases in `modelCostsRunId.test.ts`. No
prompt text, system instruction, response schema, model ID, or rate-limit RPC contract touched.
Also caught in review: the working tree's `package-lock.json` had reverted commit `33b20f9`'s
`@types/react` CI-sync entry (a stray `npm install`); restored to HEAD rather than committed.

**FABLE REVIEW OF THIS BRANCH — RUN 2026-07-24** (Fable 5, Neil-triggered via `/model` mid-session;
scoped to `git diff main...feat/loop-arch-fastfollow-telemetry` + the 3 posed questions; no repo
re-exploration). **Verdict: branch structurally sound, no blocker, merge-safe.** Per question:

1. **x-run-id: attribution-without-verification STANDS for flag-ON.** Write-time ownership check
   rejected — a DB round-trip per generation call taxes every legitimate request to defend an
   already-filterable, read-side-scoped, RLS-deny-read, rate-limit-bounded telemetry sink. Two
   same-family residuals, both LOW, documented not fixed: (a) `api/events.ts` lets any caller
   attach a well-formed `run_id` to NODE events too — legit producer node events always carry the
   authed owner's user_id, so the discipline is: any per-run fail-rate analysis must scope by
   `(run_id, user_id)` exactly like `run_cogs`, never `run_id` alone; (b) `imgate:${runId}:${sceneIdx}`
   lets someone who KNOWS a victim's runId burn that pair's 2/24h idempotency budget → victim's
   gate check 429s → silent coverage skip (fail-open, pennies) — runIds are unguessable `apr_`
   UUIDs, so treat them as capability tokens (don't print them in shared logs/screenshots).
   **Optional P5-window adder (one query, zero hot-path cost):** a forgery DETECTOR — flag events
   rows where `events.user_id ≠ producer_runs.user_id` for the same run_id; turns "filterable"
   into "alarmed" during exactly the window the telemetry gates P5.
2. **spawnSync heartbeat limit: async-spawn refactor NOT justified.** Sharpened by two facts read
   this review: `concatScenes` is a FULL x264 re-encode of the whole program (the true longest
   single pass — scales with total program length), while `mixMusic`/`masterAudio` are `-c:v copy`
   (audio-only, fast) — so the only pass that could plausibly cross the 120s stale threshold at
   12 scenes is concat. But `api/render/final.ts` has `maxDuration: 300` (vercel.json), and
   `WATCHDOG_MAX_AGE_MS = 330s` sits correctly just above it: at the scale where concat would
   threaten 120s, the TOTAL render is already flirting with the 300s platform kill — the binding
   constraint neither beats nor async-spawn can move. Calibration is correct; leave thresholds
   alone. **Watch item instead of code:** `concatMs` + per-scene ms are already console-logged —
   during the P4/P5 window, if any real run shows concat >90s or total wall >270s, escalate to a
   chunked/off-serverless render design (P6 territory), not to watchdog tuning.
3. **The 3 deferrals: all stand as deferrals, with ONE upgraded to a flag-ON precondition** — see
   below. #4/#5's silent skips bias the very `gate_verdict` precision analysis flag-ON exists to
   run ("no flags because images are good" is indistinguishable from "no flags because the gate
   never ran"). The `check_fail` event name already exists in the RunEventName vocabulary, so
   emitting a skip-reason event at both silent-skip sites is small, non-TUNED, executor-sized.
   The substantive fixes (reference rehydration; separate gate RL bucket) stay deferred.
   **Flag-ON conditions are therefore now: (a) live smoke of `checkSceneImage` vs real
   `sceneImageModel` output (pre-existing), + (b) gate-skip visibility events — Neil GO'd
   2026-07-24, BUILT below.**

**Gate-skip visibility + forgery detector — BUILT 2026-07-24** (Neil GO; `code-executor` on Opus
4.8, reviewed in the Opus main loop). Closes flag-ON condition (b). New `check_skip` event in the
`RunEventName` vocabulary — deliberately NOT folded into `check_fail`, because a fail means the
check RAN and flagged, while a skip means it never ran; merging them would corrupt the flag-rate
metric flag-ON exists to measure. No DB migration needed (`events.event` is plain `text`;
`api/events.ts` validates `z.string()`, no enum — verified). Emitted at both silent-skip sites in
`services/producerOrchestrator.ts`: (1) the swallowed `imageGateCheck` catch, with a bounded
classifier → `rate_limited` (IMAGE_GATE_429, incl. the shared `gemini:image` bucket + the internal
daily/per-scene gate budgets) / `aborted` (55s client abort) / `unauthenticated` / `other`, plus the
raw message truncated to 200 chars; (2) `reason:'no_identity_reference'` when `run.input.avatar.url`
is missing or not a `data:` URL — confirmed against `imageGate.ts` `splitImageData` that a remote
URL is NOT usable (it would ship as bogus base64), so the predicate is right. **Gate call volume and
fail-open behavior are byte-identical — pinned by an explicit `toHaveBeenCalledTimes` assertion so a
later "optimization" can't quietly drop the call.** Also added `public.run_attribution_anomalies`
(`supabase/events.sql`): the read-side ALARM for the forged-`x-run-id` design — any row means a
caller attached telemetry to a run they don't own. Expected empty; check it during the P4/P5 window.

> **⚠ TWO ANALYSIS FOOTGUNS — read before computing gate precision.** (i) **A scene can emit TWO
> `check_skip` rows** (`no_identity_reference` fires before the call; a 429 then fires from the
> catch). Any coverage query must count DISTINCT `(run_id, sceneIdx)` or filter by `reason` — a raw
> `count(*)` over-reports the gap. (ii) **`check_skip{no_identity_reference}` coexists with a
> recorded `gateVerdict{pass:true}`** — that combination means "label was checked, identity was
> NOT", not a clean pass. Precision analysis must exclude the identity dimension for those scenes
> or it will credit the gate with identity passes it never performed. Both are intended behavior,
> not defects — but a naive query over this data reads them wrong.

**Verification (re-run independently in the main loop):** build green; `npx vitest run` **962 passed
/ 22 skipped** (was 956/22, delta +6 = exactly the tests added); `npm run check:bundle-leak` clean
(0 markers). No TUNED prompt/schema/model-ID and no rate-limit RPC contract touched.
**⚠ ACTION FOR NEIL: the `supabase/events.sql` re-run now also creates `run_attribution_anomalies`,
which JOINS `producer_runs` — apply `producer_runs.sql` first on a fresh project (already applied on
Neil's).**

**Fast-follow 3 — the 3 documented deferrals: re-verified still accurate, still ACCEPTED (no code
change).** Fable-review findings 3/4/5 confirmed present in the code as described: (3) adscript
worst case ~8 model calls vs the blueprint's ≤4 — `runFlowWithSchema` re-invokes the whole handler
(`text.ts:367-383`); (4) identity gate no-ops on resumed runs — `slimCheckpointInput`
(`producerRunService.ts:156-171`) drops `data:` URLs >700KB, so `run.input.avatar.url` can vanish →
`personMatchesReference: null`; (5) gate + generate share `gemini:image:${user.id}`
(`image.ts:95` and `:136`), so a gated pooled run can 429 the gate. **Standing recommendation for
flag-ON:** #4 and #5 both depress gate *coverage* SILENTLY, which biases the very `gate_verdict`
precision analysis that decides whether the gate is worth keeping — before flag-ON, the gate should
emit a skip/`check_fail` reason so coverage gaps are visible in telemetry rather than invisible.
Not built (it is a scope change beyond the fast-follows); flagged for Neil's call.

### 6. Parked
P5 (flip Producer engine to default, retire `useOneShotGeneration.ts`) — gated on 2–4 weeks of P2/P4 telemetry post-merge. P6 (video believability flag, server-held manual-lane job state) — data-gated, see plan.

## Canary cost estimate (6-scene run, gate flags OFF — for Neil's approval)

All figures are ESTIMATES from `api/_lib/modelCosts.ts`'s own model (text prices billing-grade; image/video rows are estimates; the plan's working numbers: ~$0.04/image, ~$0.40–1.00 per scene-video).

| Stage | Provider / model | Calls | Est. cost |
|---|---|---|---|
| Research/script/storyboard/prompts/EDL/classifiers | Gemini flash tier via `api/gemini/text` | ~8–12 | $0.03–0.10 |
| Scene stills + end frames + thumbnail | Gemini image (`sceneImageModel`/thumbnail model) | ~8–10 | $0.30–0.45 |
| Scene videos (6 × 5–8s) | Veo Fast / Kling via routing | 6 | $2.40–6.00 |
| Voiceover | ElevenLabs TTS/STS (plan credits, NOT in run_cogs) | ~6 | $0.05–0.30 |
| Music bed (if enabled) | Gemini music or static bank | 0–1 | $0–0.10 |
| Final render | FFmpeg (compute only) | 1–2 jobs | $0 marginal |
| P4 gate calls | — flags OFF — | 0 | $0 |
| **Expected total** | | | **≈ $3–7** |
| **Max retry cost** (withRetry 2× on video stage + schema regens + watchdog re-render) | | | **≈ $12–14** (video dominates; watchdog re-render is compute-only) |
| **Proposed hard cap** | | | **$15** — abort the run if live `run_cogs` (lower bound!) crosses it; natural backstops: Veo 5/hr + Kling 12/hr rate limits cap hourly burn regardless |

## Known-partial telemetry
`run_cogs` is labeled PARTIAL/ESTIMATED in `supabase/events.sql` (this commit): excludes ElevenLabs, FFmpeg compute, post-run reshoots/regens; video rows are submit-time estimates. Not for pricing/margin decisions.
