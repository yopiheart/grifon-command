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

- Suite: 914 passed / 22 skipped. Build + bundle-leak clean at every phase tip.
- DB: P2 SQL **applied by Neil**. P4's `producer_scenes.gate_verdict` line **NOT applied** (added after his apply; app works without it).
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

**Defect found (P3-introduced, NOT fixed — proposal only, per the test-only mandate):**
`toCheckpoint` in [../services/producerDeps.ts](../services/producerDeps.ts) omits `thumbnailUrl`
from `artifacts`, but the resume path
([../components/OneShotAd/ProducerFlow.tsx](../components/OneShotAd/ProducerFlow.tsx),
`thumbnailUrl: art.thumbnailUrl`) reads it back. Before P3 the thumbnail was not a producer
artifact; P3 promoted it to a node. Consequence: the cover frame is lost on any reload /
cross-device resume, and `normalizeStages` (which marks the thumbnail stage done only
`if (run.thumbnailUrl)`) re-runs the node — one extra paid image (~$0.04) per resume, plus First
Cut silently hiding the cover download. **Proposed one-line fix:** add
`thumbnailUrl: run.thumbnailUrl,` to the `artifacts` object in `toCheckpoint`, and flip the
`KNOWN GAP` test's assertion to `toBe('thumb://cover.png')` in the same commit. Not a
double-spend or data-corruption risk; safe to defer, but it fires on every P3 resume. Needs Neil's
go-ahead (touches `services/`, live-on-merge with P3).

### 2. Verify Vercel preview for `feat/loop-arch-p4-image-gate`
Unverifiable from the cafe PC (no gh/vercel CLI, Vercel MCP unauthenticated). Check the Vercel dashboard → Deployments, or authorize the Vercel connector. Do NOT deploy or change env vars.

### 3. Canary (ONLY after Neil approves the cost estimate below)
One end-to-end Producer run (6 scenes, 9:16, gate flags OFF) against the P4 preview. It live-exercises: flow schema ladder, watchdog, run telemetry rows (verify `run_cogs` + `cost_usd` against real Postgres), P3 parallelism. Wizard-driving rules: load `.claude/skills/director-smoke/` first; delegate browser work to `smoke-tester`.

### 4. P4 metering redesign (design ready, build only after Neil picks)
Problem: gate checks currently consume the customer's monthly `images` meter (~2× burn; one gated 12-scene run ≈ a Starter plan's whole 25/mo). Constraints: authenticated, rate-limited, idempotent per scene, tracked as internal COGS, **no public unmetered endpoint**. Recommended shape (mirrors the Omni per-ad budget pattern in `api/gemini/omni-video.ts`): keep auth + the burst rate limit, REPLACE `consumeMonthly('images',…)` in gate mode with a **hard per-run gate budget** via the existing `rate_limit_check` RPC — key `imgate:ad:${runId}` (fall back to `imgate:user:${userId}` daily when no runId), limit = 2× MAX_SCENES (24) per 24h, NOT dev-bypassed — plus a per-scene idempotency key `imgate:${runId}:${sceneIdx}` (limit 1) so retries can't re-bill. COGS keeps logging `image_gate` with runId (internal cost tracking). Result: no customer-quota drawdown, still bounded, still authenticated, abuse capped at pennies/run. Alternative (simpler, weaker): keep metering but on a new internal `image_gate` meter with generous limits mirrored in `quota.ts` MONTHLY_LIMITS + parity test.

### 5. Open Neil decisions (blockers per item)
- Merge the PR chain (his call; P1–P3 are live-on-merge).
- Approve canary cost estimate (below).
- Pick the P4 metering redesign option → then implement → then live smoke `checkSceneImage` vs real `sceneImageModel` output → only then flip `IMAGE_GATE_ENABLED` + `VITE_IMAGE_GATE_ENABLED`.
- Apply `supabase/producer_runs.sql` re-run (adds `gate_verdict` column; idempotent).
- Approve the scoped **Fable review** of the two high-risk slices (`api/gemini/text.ts` flow ladder; `api/gemini/image.ts` gate mode) — not yet run.

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
