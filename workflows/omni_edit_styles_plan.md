# Omni Edit Styles — Product Integration Plan (PRD)

> **Provenance:** grilled via `/grill-me` + premortem and **approved by Neil 2026-07-06**
> (plan-mode session, cafe PC). This repo copy is the durable source of truth — the
> original lived in `~/.claude/plans/`, which the defreezer wipes.
> **Build branch:** `feat/omni-edit-styles`. Slice 1 landed 2026-07-06 (commit 54a3367).
> **Slice-1 follow-up RESOLVED (live smoke 2026-07-06):** fire leg measured at
> **13.4s** end-to-end (clip download + Files-API upload + ACTIVE-wait + create)
> on a 1.2MB/4s clip — comfortably inside Vercel's 60s ceiling. No upload split
> needed for typical scene clips; revisit only if 16:9/1080p sources push
> upload times past ~40s. Full smoke record: omni_edit_presets.md Proposal 001.

## ⏸ RESUME STATE (2026-07-07 — read this first when resuming)

**Where we are:** Slices 1 + 2 + 3 of 4 are BUILT, LIVE-SMOKED, and
**NEIL_APPROVED** on `feat/omni-edit-styles` (`54a3367`…`a19dafe`). 515 unit
tests green. **Next: Slice 4 (telemetry + beta rollout), then PR to main.
Nothing is merged to main yet.**

**Done + verified:**
- Slice 1 — proxy (`api/gemini/omni-video.ts` + poll), `api/_lib/omniPresets.ts`
  (born TUNED, 4 templates verbatim), budget/rate/kill-switch guards. Live smoke
  PASSED (fire 13.4s, Vercel-60s concern closed). Neil eyeballed + approved the
  render (THIRSTY-wall ruling: semi-intended, kept unpinned).
- Slice 2 — EditVideo "Applying style" stage, QA gate (`api/_lib/omniGate.ts`),
  fallback ladder, re-roll, styled-URL swap, dev seed hook in App.tsx. Live
  smoke found + fixed 2 real bugs: (a) blocked-at-poll classification (Google
  defers safety verdict under background:true), (b) **Neil eyeball catch:**
  Omni rendered the literal `#FFCC00` slot value as typography → gate now fails
  any hex render + fire-time `forbiddenWords` (pinned unit tests). The doubled
  "NA" audio Neil heard = Omni's own track, discarded in real renders (VO mux +
  trim-to-VO-end). Full record: `omni_edit_presets.md` Proposal 001.
- **Slice 3 (2026-07-07, `/goal`-driven, built via code-executor):**
  - **3a `efac36a`+`8e99515`** — `// STYLE` picker row in GenerateVideo (2 hero
    styles, hero-sampled brand swatch via `utils/dominantColor.ts`, EMPHASIS/
    TITLE chip, CAPTIONS toggle w/ per-style default VOX-off/Premium-on,
    Business lock) hops an `OmniStyleLock` (types.ts) through App to EditVideo.
    Slot follow-ups closed: `subject_desc`←storyboard `sceneDescription`,
    `brand_primary_hex`←picker. Captions-off = client-side scriptLine/voiceWords
    omission at Render Final (subtitles only, overlayText stays — Neil decision;
    post music-length math so timing is unchanged; zero tuned-file edits).
    Brand-check (adversarial critic): BRAND_PASS_WITH_NITS 41/50 after fixes.
  - **DB migration `omni_style_credits` (LIVE, applied via Supabase MCP)** —
    `subscriptions.omni_style_credits` column; `grant_credits` regrown as 4-arg
    (`p_omni default 0`, old 3-arg DROPPED — overload would break 3-named-arg
    rpc calls); `consume_credit('omni_style')` branch. RPC-smoked on the smoke
    uid (grant→consume true→consume-on-zero false); advisors: no new findings.
    Doc mirror updated: `supabase/credits.sql` (`81cf24c`).
  - **3b `bf337b2`** — `omni_ads` MeterUnit (business 5, tunable) + PLAN_LIMITS/
    useQuota/QuotaWallModal parity; fire path PEEKS via `peekOmniAllowance`
    (402 `omni_quota_exceeded` for zero-allowance; re-rolls of a charged ad pass
    via the `omniad:` marker); DEFERRED consume in new
    `api/gemini/omni-video/consume.ts` called by EditVideo when the pass
    settles; strict-majority-fallback = no charge + NO marker (a flipping
    re-roll can still charge); monthly→`omni_style`-credit cascade in
    `consumeOmniAd` (mirror of `consumeFinishedAd`). Majority rule is the pure
    `shouldConsumeOmniAd` in `api/_lib/omniBilling.ts` (tie = charged, per PRD
    >50% tunable). Accepted beta trust boundary documented in consume.ts.
  - **3c `6c47924`** — `omni_style_single` AddOn (₱499/49_900c, `omniStyleCredits:1`)
    in ADD_ON_CATALOG → handleTopup accepts it (purchase UN-gated, Neil
    decision) → webhook grants the omni bucket (both branches) → consume via 3b.
    Upsell CTAs: EditVideo allowance-exhausted note + STYLE row `N OF 5 LEFT`
    meter chip / `BUY 1 — ₱499` chip at 0/0 (`/checkout?topup=omni_style_single`).
- 511 unit tests green (484 → 511); Slice-3 spend so far: $0 (no paid renders yet).

**Slice 3: NEIL_APPROVED (2026-07-07, verbatim: "Okay bro goods na to. Sige
proceed na tayo sa slice 4.")** — after: machine-PASS smokes (≈$2.00: charged
path, re-roll idempotency, exhaustion 402 + ₱499 CTA, credit fallback,
checkout page); his TWO eyeball catches fixed same-day (`855eb0a`: Vox
masthead → gate forbidden-word; hook overlay stamping the styled title →
overlays dropped on styled scenes); a verification render (≈$0.80) confirming
both fixes in output + the captions toggle proven VISUALLY with real VO
(ElevenLabs invoice was failed → Neil paid it → working); and his 3
verification-eyeball questions resolved as seed artifacts. Full verbatim
records: `omni_edit_presets.md` Proposal 001. The verification render also
closed the Slice-2 gate-clean re-render item. 515 unit tests green.
NOT smoked: the GenerateVideo picker-row visual (needs a real all-rendered
pipeline run — fold into the Slice-4 beta wizard smoke).

**Open items (fold into Slice 4):**
1. Slice-4 telemetry MUST track: `gate_unavailable` rate (fail-open silently
   disables every gate check), block/gate-fail/fallback rates per preset ×
   scene type, dolly-zoom commit rate, invented-price/insert-risk sightings.
2. Registry step 0: flip preset rows (premium-reel-v2, vox-explainer-v1,
   dolly-zoom-v1) to `product_shipped` with code pointers — picker shipped +
   Neil verdict in. display-text-pop-v1 stays (not reachable via the current
   routing table).
3. Pre-existing bugs (independent tickets, found en route): `/api/render/final`
   400 on EDL `transitionIn: null` (hook scene, nondeterministic); Render Final
   unlocks after a 0-track voice consolidate attempt.
4. Possible tuned-template hardenings (Neil-gated, only if telemetry shows
   need): vox "never render the word VOX / publisher logos"; "never invent
   prices or currency amounts" for inserts.

**Session re-arm (defreezer wiped it):**
- `.env` needs the usual keys PLUS `OMNI_STYLES_ENABLED=true` (kill switch —
  without it every omni call 503s) and `MEDIA_STORE=r2`.
- Smoke account is DURABLE (Supabase cloud): `smoketest-dc@grifon.dev` /
  `GrifonDcSmoke!2026`, uid `28552c97-6619-43a6-8cb2-21ba18a636c5`, business
  sub active until 2026-08-05. Login is email+OTP — mint codes via admin
  `generate_link` (needs a non-browser User-Agent header with the secret key).
- Smoke-render artifacts in R2 under that uid are cron-reaped after 48h.
- Dev seed hook for EditVideo smokes: localStorage `grifon_dev_unlock`='1' +
  `grifon_dev_editor_batch`=<JSON batch> (consumed on load) — no paid scene
  generation needed to drive the AI Editor.

**Next up — Slice 4 (telemetry + beta rollout), then PR to main.** Scope per
this PRD's slice list: block/gate-fail/fallback-rate logging per preset ×
scene type (PLUS the new items: `gate_unavailable` rate, dolly-zoom commit
rate, invented-insert sightings), Omni pricing in `api/_lib/modelCosts.ts`
COGS telemetry, allowlist beta flag, launch-gate metric review with Neil
(fallback >30% in beta = hold public release). Registry row flips are step 0.
Neil has loaded $10 Fable extra usage for this session. Plan→Goal pipeline
applies: draft the Slice-4 `/goal` for Neil's approve/edit/skip BEFORE code
edits; implementation → code-executor; smokes → smoke-tester (foreground).

**Paste-ready kickoff for next session:**

> Read `CLAUDE.md` and `workflows/omni_edit_styles_plan.md` in full (esp. the
> RESUME STATE section) — do not /compact, start fresh. We're building Slice 4
> (telemetry + beta rollout) of Omni Edit Styles on branch
> `feat/omni-edit-styles`. Slice 3 is NEIL_APPROVED. I've restored `.env`
> (incl. `OMNI_STYLES_ENABLED=true`, `MEDIA_STORE=r2`). Step 0: flip the three
> shipped preset registry rows to product_shipped. Then plan Slice 4, draft
> the /goal for my approval, and delegate to code-executor. No tuned-file
> edits without asking me.

---

## Context

Four Omni presets are `neil_approved` in `workflows/omni_edit_presets.md` (premium-reel-v2, vox-explainer-v1, dolly-zoom-v1, display-text-pop-v1). The PoC lab (`tools/omni_edit.py`) proved the Gemini Omni Flash edit pass end-to-end: believability holds on clean talking clips, directed text renders letter-perfect, grounding works via API prompt text, and safety-filter blocks are a survivable prompt×video interaction (unbilled, pre-generation). This plan productizes them as **sellable named Edit Styles** (roadmap #11 / #18 Layer 2) inside the existing GenerateVideo → EditVideo pipeline.

Grilled 2026-07-06; all decisions below are Neil-confirmed. Premortem run; all four seeded failure modes confirmed as real risks and folded in as mitigations.

## Decisions (Neil-confirmed, 2026-07-06)

| # | Decision | Choice |
|---|---|---|
| 1 | Ship vehicle | **Main pipeline first** — extend the existing post-render LOOK surface; Concierge inherits it (it reuses GenerateVideo→EditVideo unchanged). Director-brain auto-pick stays deferred with AUTO mode. |
| 2 | Granularity | **Whole-ad style, auto-routed per scene** — deterministic client/server routing by scene type (talking/b-roll/mixed) + filter-risk pre-screen. Per-scene override deferred to Concierge. |
| 3 | Menu | **2 hero styles**: `PREMIUM REEL` and `VOX EXPLAINER`. `dolly-zoom-v1` runs on b-roll scenes inside both bundles; `display-text-pop-v1` is an internal move where a display word fits. |
| 4 | Billing | **Business tier + included cap + top-up**: N Omni-styled ads/mo included in Business (default **5**, tunable), metered per finished ad (idempotent, `vidjob`-style marker). Beyond cap: new `omni_style` AddOn (~₱499/ad, tunable) via the existing webhook→grant→consume credits path (`cinematic_credits` precedent). |
| 5 | Fallback UX | **Subtle note + threshold refund**: calm one-liner per fallen-back scene ("Scene 3 used the standard edit"). If a **majority** of scenes fell back, the ad does NOT consume an omni allowance/credit (auto-uncharge). Never a scary error; the ad always ships (FFmpeg-only fallback). |
| 6 | QA gate | **Auto-gate every Omni output** (cheap Gemini vision check: directed-text letter-perfect, no invented captions, face-intact heuristic). Fail → **1 paid re-roll** → fail again → FFmpeg-only fallback (counts toward the fallback threshold). |
| 7 | Slot filling | **Auto-derive + one new input**: brand color swatch (default from hero image dominant color). transcript←script lines/voiceWords, subject_desc←scene description, topic_context←Market Research brief, title/emphasis←keyword extraction (deterministic client code, no tuned-prompt edits). Prefilled editable chips for emphasis/title. |
| 8 | Pass placement | **Visible "Applying style" stage in EditVideo with preview** — per-scene progress (ActiveJobsPanel pattern), styled clips replace previews, gate+fallbacks resolve BEFORE Render Final. User re-rolls bounded: **1 user re-roll per scene** pre-render (tunable). |
| 9 | VOX captions | **Style owns the caption default, user can flip**: VOX → captions OFF, Premium Reel → captions ON; single "Captions" toggle in the picker. |

## Premortem mitigations (all four confirmed by Neil)

1. **Real user footage ≠ test clips** → staged rollout behind a feature flag (dev-unlock/allowlist beta before public Business release); plan-time filter-risk pre-screen routes risky scenes straight to FFmpeg-only (standing req §3); telemetry on block-rate + gate-fail per preset × scene type (standing req §5); **launch gate metric: fallback rate >30% in beta = hold public release**.
2. **Preview-model rug-pull** (`gemini-omni-flash-preview`) → model ID in config/env, **kill switch** env flag (`OMNI_STYLES_ENABLED`): off = picker hides / "temporarily unavailable", ads still ship FFmpeg-only; no marketing guarantees tied to Omni specifically; model-version change triggers preset re-validation (Bake-and-Leap registry pattern).
3. **COGS blowout** → server-side **hard per-ad omni budget** (max seconds = scenes × cap, retries counted — mirrors PoC `enforce_budget`); bounded retries (1 gate re-roll + 1 user re-roll per scene, worst case 3× per scene); idempotent per-finished-ad metering so regenerations don't double-consume; add omni pricing to `api/_lib/modelCosts.ts` COGS telemetry.
4. **Latency kills adoption** → fire all scene interactions **in parallel** (wall-clock ≈ slowest scene, not sum); background-safe jobs (sidecar status pattern, user can leave and return via ActiveJobsPanel); expectation copy ("Premium styles take ~3–5 minutes"); 720p Omni output + existing free FFmpeg 1080p upscale.

## Architecture (verified integration surface)

**The seam:** scene clips are signed Supabase URLs on `SceneBatchEntry.renderedUrl` (types.ts:129); final render composes from them (`components/EditVideo.tsx:206` `handleRenderFinal` → `api/render/final.ts`). The Omni pass takes `renderedUrl`, edits server-side, uploads to the same `gemini-videos` bucket, and swaps in the new signed URL before `/api/render/final`. Audio path unchanged — Omni audio is discarded; VO mux (`voicedOverlays`) already owns sound.

**New server pieces:**
- `api/gemini/omni-video.ts` + `api/gemini/omni-video/poll.ts` — proxy envelope copied from `api/kling/omni-video.ts` (auth → rate-limit → quota → forward), mechanics from `tools/omni_edit.py`: Files-API upload + ACTIVE-wait, `interactions.create` (input parts + `response_format {type:'video', aspect_ratio}`), `interactions.get` poll loop (a third async shape vs Veo operation-name / Kling task_id), video-bytes extraction (both response shapes), `putMedia` + signed URL + poster.
- `api/_lib/omniPresets.ts` — **NEW TUNED FILE**: the 4 approved prompt templates verbatim from the registry + slot filling + sanitized retry variants + the style→preset routing table (style × sceneType → preset|null). Changes gated like other tuned files.
- QA-gate check (server-side, inside the poll-done path or a small endpoint): one Gemini vision call per output.
- New rate-limit key `gemini:omni:${uid}` sized for a parallel burst (e.g. 8/600s), separate from the Veo/Kling 5/3600 wallet. `GRIFON_DEV_UNMETERED_VIDEO` bypass honored.

**Data model:** add `omniStyle?: OmniStyleId` at the batch level (alongside `editorBatch.lockedPresetId`, hop via `App.tsx` like `renderLock.ts` does) and per-scene outcome metadata on `SceneBatchEntry` (e.g. `omniOutcome?: 'styled' | 'fallback' | 'excluded'` + the styled URL). Follows the `shotIntent` precedent (types.ts:98).

**Billing wiring:** new AddOn `omni_style` in `PLAN_CATALOG`/`ADD_ON_CATALOG` (`api/_lib/paymongo.ts`) + `config/topups.ts`; new credit kind in `api/_lib/credits.ts` + `supabase/credits.sql`; new monthly unit `omni_ads` in `api/_lib/quota.ts` `MONTHLY_LIMITS` (business: 5, all others 0) + parity test (`tests/unit/quota.parity.test.ts` pattern); consume-on-first-scene idempotent marker like `consumeFinishedAd`; majority-fallback un-consume path (grant-back or deferred consume at pass completion — **prefer deferred consume**: only consume when the pass completes with a majority styled).

**Tier gate:** `planAtLeast(plan, 'business')` helper in `utils/planGate.ts` (mirror `musicGenEligible`); picker locked with Business badge for lower tiers (upsell), server enforces via `getUserPlan` in the proxy (client gate is nav-level only — the proxy is the real wall).

**Caption toggle:** implemented as a request-level option on the final-render request (captions off for this render), NOT an edit to tuned preset contents in `renderPresets.ts`/`renderFfmpeg.ts`. Exact mechanism to be confirmed at build time; if it can't be done without touching tuned content → escalate to Neil.

**Cleanup cron:** write omni clips as `${uid}/${uuid}.mp4` at bucket root (already reaped by `api/cron/cleanup-gemini-videos.ts`); if a subfolder is used instead, extend the cron's one-level descent list.

## Build slices (vertical; each build-gated + brand-checked; implementation → `code-executor`)

1. **Slice 1 — Proxy + presets (server only, dev-flagged):** `api/gemini/omni-video.ts` + poll, `api/_lib/omniPresets.ts`, rate limit, hard per-ad budget, kill-switch flag, cron coverage. Verifiable via a curl/script smoke on one committed raw asset.
2. **Slice 2 — Pipeline pass + QA gate:** EditVideo "Applying style" stage — per-scene routing, parallel fire-then-poll, vision gate + 1 re-roll + fallback ladder, URL swap, per-scene outcome notes, 1 user re-roll per scene, preview before Render Final.
3. **Slice 3 — Picker + billing:** style picker UI in GenerateVideo next to the LOOK picker (2 hero styles, brand color swatch, editable chips, captions toggle, Business badge/gate), `omni_ads` monthly meter + deferred-consume + majority-fallback uncharge, `omni_style` top-up AddOn end-to-end (catalog → checkout → webhook → grant → consume).
4. **Slice 4 — Telemetry + beta rollout:** block/gate-fail/fallback-rate logging per preset × scene type, COGS log entries, allowlist beta flag, launch-gate metric review with Neil.

## Guardrails

- **TUNED files:** no edits to `services/geminiService.ts`, `api/_lib/prompts.ts`, `renderPresets.ts`, `renderFfmpeg.ts` tuned content. `omniPresets.ts` is born TUNED (verbatim from the registry).
- Preset templates keep prompt hygiene (no identity legalese, no manipulation vocab); sanitized retry variant per template.
- FFmpeg presets are NOT replaced — they remain the free/Pro styles and the deterministic layer every Omni style composes with (Neil decision 2026-07-06).
- Smoke tests → `smoke-tester` subagent (foreground) only; **Neil eyeballs the rendered MP4s himself** (Scene-6 lesson).
- Plan→Goal pipeline applies: draft a `/goal` per slice citing the build-gate pass message before code edits.

## Verification

Per slice: `npm run build` + `npm run test` (build-gate Stop hook pass), new unit tests (routing table, deferred-consume/uncharge logic, quota parity). End-to-end (Slice 2+): dev-unlock + `GRIFON_DEV_UNMETERED_VIDEO` + `smoketest-dc@grifon.dev`, smoke-tester drives: generate a small ad (director-smoke skill pre-flight) → pick VOX style → visible pass completes → styled previews + any fallback notes → Render Final → captions honored per toggle → final MP4 → **Neil eyeball**. Registry rows flip to `product_shipped` with code pointers only after Neil's verdict.

## Defaults flagged as tunable (Neil can adjust without re-planning)

Included cap (5 omni ads/mo), top-up price (₱499), user re-rolls (1/scene), beta fallback-rate launch gate (30%), majority threshold for uncharge (>50% scenes fallen back).
