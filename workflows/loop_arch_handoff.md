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

## Standing orders from Neil (2026-07-23, verbatim constraints)

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

### 3. Canary (ONLY after Neil approves the cost estimate below)
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
