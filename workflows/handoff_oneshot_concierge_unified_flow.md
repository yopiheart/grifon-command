# Handoff: Unified One-Shot + Concierge consumer flow (Path B) → smoke test

**Resume in one line:** Build the real consumer flow —
`intake → Running → storyboard approval → First Cut` — using Fable 5's recovered
Running + First Cut screens, so users NEVER see the 8-step wizard. Then run the SIGLA
end-to-end smoke test. Start next session with **`/clear` then `/grill-me`** pointed here.

Created 2026-07-01. Owner: Neil. Related: [concierge_director_plan.md](concierge_director_plan.md),
[oneshot_flow_fixes.md](oneshot_flow_fixes.md),
[handoff_2026-06-09-one-shot-ad-v1.md](handoff_2026-06-09-one-shot-ad-v1.md) (Fable 5's original).

---

## SHIPPED 2026-07-01 (autonomous build session, branch `feat/oneshot-firstcut-recovery`)
The grill locked the design (see the grill decisions below + the plan file
`~/.claude/plans/origin-feat-oneshot-firstcut-recovery-gr-sunny-hedgehog.md`), then 6 of
7 slices were built, each committed + pushed, **build + tsc + all 376 unit tests green**:
- **Slice 1** — server run-state + no-double-spend spine: `supabase/producer_runs.sql`
  (run header + per-scene job queue + atomic `producer_claim_scene` RPC),
  `api/producer/run.ts` (checkpoint + resume-read), `api/producer/advance.ts`
  (seed/claim/record/complete/flag/requeue), `services/producerRunService.ts`.
- **Slice 3** — `services/producerOrchestrator.ts` RUNTIME (was types-only): rebuilt from
  Fable 5's blueprint against current signatures + **two gates** (storyboard-image + First
  Cut), **fan-out video with atomic claim**, persist-after-every-transition, `applyPreset`.
  `services/producerDeps.ts` wires the real services.
- **Slice 5** — `components/OneShotAd/StoryboardGateScreen.tsx` (pre-render cost gate).
- **Slice 4 + 7** — `components/OneShotAd/ProducerFlow.tsx` (research → avatar cast →
  runAutopilot → Running → storyboard gate → First Cut, resume-on-mount from server) +
  FeedbackWidget after delivery. Mounted **opt-in behind `?osaEngine=producer`** so the
  live useOneShotGeneration→Step 8 path stays intact. (`?osaEngine=steps` forces legacy.)
- **Slice 6** — First Cut **AUTO/IMPACT/CLEAN** switcher (uses existing
  `FinalRenderRequest.preset`; IMPACT/CLEAN Pro+; raw-export BUNDLE deferred).

## SHIPPED 2026-07-02 (review-fix session, commits 54cc749 → 429f14c)
A three-agent fresh review (server spine / orchestrator / UI) of the slices found 3
criticals + a half-wired double-spend protocol + 4 UX majors. All smoke-blockers fixed
(Neil-approved scope: minors + Concierge hardening deferred), **build + 394 tests green**:
- **A1** guided-vertical fields (`servicePhotos`/archetypes/`isLocalService`/`businessAddress`)
  now thread intake → orchestrator → shared `mapReportToWizard` (was: silently dropped —
  Service/RealEstate ads degraded to generic product ads).
- **A2** run errors now render a Retry/Start-over screen (was: silent bounce to empty intake).
- **A3** `tests/producerOrchestrator.test.ts` — 18 tests over the spend-bearing state machine
  (the blueprint suite was dead: outside `tests/**`, importing a deleted path).
- **B1** `recordScene`/`job_handle` wired: claim → submit → record → poll → complete; resume
  POLLS a recorded handle instead of re-rendering. `services/geminiService.ts` got a
  **transport-only** split (`submitVideo` extracted from `generateVideo`; zero tuned content
  changed, bundle-leak check 0).
- **B2** `requeue` guarded (flagged/done/failed or >10min stale claims) + all scene writes
  return `changed:boolean` for lost-race detection.
- **B3** checkpoint writes are revision-guarded (stale tab can't regress run state).
  **`supabase/producer_runs.sql` changed — re-copy it into the SQL editor (adds `revision`).**
- **C1** presets gated by new `presetUnlocked` (Pro+), not the dev-only wizard lock (was:
  no paying tier could pick IMPACT/CLEAN). **C2** FeedbackWidget fires while First Cut is up
  (was: never). **C3** reshoot/preset stays ON First Cut (busy substate; was: full Running
  screen + free-take reset). **C4** `presetId` + `takesUsed` persisted across reloads.

**Deferred from the review (post-smoke):** 12 minors — bg-black scrims vs DESIGN.md,
inline gold button in `index.tsx`, seed doesn't prune on smaller re-seed, stage name not
enum-validated, dead `image_url`/`'failed'` schema surface, cross-origin `download` attr
won't save, all-scenes-fail dead-ends without a reshoot gate, abort flags interrupted
scenes, no `aria-live`, research cache from blueprint unwired, casting outside the state
machine, Concierge `mode`/`prefill` unvalidated.

**STILL OPEN (need Neil):**
1. **Slice 2 — rate-limit re-scope** (`api/gemini/video.ts` `VIDEO_LIMIT` per-clip →
   per-ad-launch). TUNED infra — **your explicit sign-off gate**, deliberately untouched.
   Until done, a >5-scene fan-out self-throttles on the hourly wall.
2a. **SHIPPED 2026-07-03 (post-smoke fix session): the two bugs the smoke caught.**
   - **End-frame morph restored** (`renderEndFrame` in producerOrchestrator + gate END inset):
     the producer rebuild had dropped the start→end hook-morph the 8-step wizard still had
     (utils/sceneRender.ts). Mirrors its heuristics; pair stays in sync on regen/reshoot.
   - **Checkpoint-size bug fixed** (the wave-2 image re-spend root cause): base64 scene images
     rode the artifacts jsonb twice → >2mb parser cap + Postgres statement timeouts → silent
     stale checkpoints → resume re-bought images. Now: images persist once per scene on
     `producer_scenes.image_url`/`end_frame_url` (new `record_image` action, 4mb cap),
     checkpoints slimmed at the transport boundary (`slimCheckpointArtifacts`), `input` sent
     only on create, resume rehydrates images from rows (ProducerFlow.fromRow).
   - **`supabase/producer_runs.sql` changed again** — `end_frame_url` column (already applied
     to the live DB via migration 2026-07-03). Preview harness gained a **Storyboard Gate tab**
     (`/one-shot-flow-preview.html`) — eyeballed ✓. 407 unit tests + build + bundle-leak green.
   - **Next paid step (HOLD for Neil's GO): a GATE-STOP run** — intake → storyboard gate,
     eyeball morph frames, do NOT click FILM IT (~₱20 images, zero video spend).
2b. **Live producer smoke — ATTEMPTED 2026-07-02, BLOCKED on Gemini billing (then paid); resume HERE.**
   Neil-approved TEST SPEC filled (One-Shot producer, SIGLA, Product, auto-cast, 9:16, Taglish,
   Codex-generated SIGLA hero, METERED). Ran it end-to-end via smoke-tester: **sign-in, producer
   engine, and full SIGLA intake threading all PASSED on screen** — then died at market research.
   Every `POST /api/gemini/text` → `429 RESOURCE_EXHAUSTED`, `free_tier_requests limit: 0` on
   `gemini-2.0-flash`. The `.env` `GEMINI_API_KEY` is on a **no-billing project** (likely a
   defreezer-restored personal free key). Zero credits spent, `producer_runs` still 0. The two
   hard gates (resume + no-double-spend) were NOT reached. **To resume: fix the Gemini key
   (enable billing OR swap in a billing-enabled key — see `smoke_test_setup.md` step 0 probe),
   then re-fire the already-staged run (~2 min to clear research, ~6–10 min full).** Everything
   else remains staged (SQL applied, business acct 999 cr, metered `.env`, dev server). Also
   minor UX find: quota 429 spins "Researching your market…" through the full retry backoff with
   no quota-specific error — short-circuit `limit:0`-class errors instead of retrying the wall.
   (Original parked note below still applies for the mechanics.)
   **Live producer smoke — PARKED 2026-07-02, resume HERE.** Everything is staged; it was
   stopped pre-launch (zero spend, `producer_runs` empty) because the run lacked a
   Neil-approved TEST SPEC. **Resume = open `workflows/smoke_test_setup.md`, fill the
   ⛔ Test Spec gate template (draft one for Neil: One-Shot producer flow, Product,
   Auto-cast, 9:16, Taglish, the committed Sunrise handheld hero or a Codex-generated
   asset — NEIL DECIDES), get his approve/edit, THEN fire.** Staged already: SQL applied
   to live DB (incl. `revision`); smoke account = `neilmaglaya.business22+smoke@gmail.com`
   (business plan, 999/999 credits); OTP read hands-free via Neil's Gmail connector
   (scopes fixed); per-session env = unmetered script + `npm run dev` (defreezer wipes
   both). Gates stay hard pass/fail: **resume gate** (kill tab mid-render → exact-place
   resume, recorded handles POLLED not re-submitted) and **no-double-spend gate**
   (`producer_scenes.attempts` = 1/scene; one submit call per scene; `video_ads` metered
   once — note: unmetered flag bypasses metering locally, so that leg rides the
   unit-tested finishedAdId dedup unless smoked metered).
3. **Concierge wiring** — the container currently drives One-Shot (auto research+script);
   Concierge-via-ExpertMode reuses the SAME orchestrator (`createProductionRun` already
   supports `mode`+`prefill`+`doneStages`) — wire ExpertMode's script+direction into a run.
4. **Raw-export bundle** (Pro+) — clean scene clips + VO + SRT + thumbnail + project file
   zip. Per-clip trim already runs in `buildScene()`; needs the export path + zip.
5. **Reshoot credit-charge** — 2-free-takes UX ships; paid take is flag-gated free (defer).
6. **Apply `supabase/producer_runs.sql`** in the Supabase SQL editor before the smoke.

## Status as of 2026-07-01 (what's DONE)
- **Fable 5's One-Shot Running + First Cut screens RECOVERED** and previewable with
  **zero API** at `/one-shot-flow-preview.html` (`npm run dev`). On branch
  **`feat/oneshot-firstcut-recovery`** — **PR #41**.
  - `components/OneShotAd/FirstCutScreen.tsx` (review: hero video + reshoot film-strip + flag/free-takes)
  - `components/OneShotAd/RunningScreen.fable5.tsx` (Building screen w/ live scene gallery)
  - `components/OneShotAd/previewMock.ts`, real `osa-*` keyframes in `index.css`
  - `services/producerOrchestrator.ts` — **types-only** (`AutopilotRun`)
- **Full Fable 5 autopilot ENGINE preserved** (build-safe, excluded from tsc, NOT wired):
  `components/OneShotAd/_fable5-recovered/` (orchestrator runtime + deps + run store + test + container + README).
- **8-step wizard locked to admin/dev-only** (`App.tsx` `directorUnlocked = devUnlock`).
- `restore-gh.ps1` ASCII bug fixed. `gh` recovery path proven (auth as `yopiheart`).

## The TARGET flow (One-Shot AND Concierge share Running + First Cut)
1. **Intake** — the ONLY thing that differs between modes:
   - **One-Shot** = current `components/OneShotAd/LaunchScreen.tsx`: offer/brand/price/niche/format/strategy
     + assets + presenter + settings + voice → **AUTO market research → AUTO script**.
   - **Concierge** = current `components/ExpertMode/*`: businessType + brand/product + **custom script**
     (ScriptStudio) + **per-scene shot direction** (SceneDirection) + assets + presenter + settings + voice.
     **NO market research, NO auto-script** (user brings the script).
2. **Running** (Fable 5 screen) — pipeline builds live; storyboard scene gallery fills in.
3. **Storyboard approval gate** — user verifies/regenerates the storyboard scene IMAGES and
   **approves BEFORE the expensive video render** (cost + quality gate — Neil's explicit ask).
4. Pipeline continues: thumbnail → video generation → voiceover → edit/assemble → final render.
5. **First Cut** (Fable 5 screen) — finished video: **download / reshoot a scene / make another.**
   Review/feedback lands here (see the `post-delivery-tip-feedback` branch).

## THE CORE REQUIREMENT (Neil, verbatim intent)
Every intake input — **details, assets, settings, voice** — must be **acknowledged / threaded
through every stage**: market research → script → storyboard → thumbnail → video generation →
final edit. Fable 5's orchestrator threads one `AutopilotInput` through all stages by design →
**this is the reason to revive/adapt that engine** (it structurally guarantees nothing is dropped).

## Decisions — LOCKED (Neil, 2026-07-01)
1. **Storyboard approval = a dedicated approve STEP/screen** (reads as a real gate, not a loading pause).
2. **Engine = adapt Fable 5's orchestrator** (threads every input through every stage; in-flow final render).
   It's purpose-built for the "acknowledged at every stage" requirement.
3. **Two reshoot moments — KEEP BOTH:** pre-render storyboard-image approval (step 3) + First Cut
   rendered-clip reshoot (step 5).
4. **Final-edit choice lives at FIRST CUT (delivery), NOT intake / NOT Running.** (CMO call.)
   - Default = **AUTO** edit, already assembled + auto-playing (dream outcome delivered instantly).
   - Options: preset switcher (**AUTO / IMPACT / CLEAN**) + **"Don't edit — download raw clips."**
   - **Tier:** finished AUTO ad = **all tiers** (the bait; never gate the wow / Free→Pro is priority #2);
     **preset choice + raw-project export = Pro+** lever.
   - **Raw export = a BUNDLE:** per-scene clips + voiceover track + captions/SRT + thumbnail + edit
     project file ("full project files, hindi lang video").
   - **Positioning:** *"Hindi ka naka-kulong / you're not locked in"* — kills Bryan's #1 objection. Placement
     rationale: Launch = abstract friction pre-payoff; Running = don't interrupt the magic; First Cut =
     informed + emotionally bought in = highest-satisfaction moment = best spot to plant the Pro nudge.
   - First Cut copy: gold **DOWNLOAD AD**; row `AUTO ✓ · IMPACT · CLEAN`; quiet Pro line
     *"May sariling editor? Kunin mo yung clean scene clips + voiceover + captions — i-edit mo sa paraan mo."* `[PRO]`
5. **Clean atoms in, styled ad out — Bryan NEVER sees a flawed clip.** (Neil + CMO call.)
   - **Dead air → auto-trim PER SCENE, before First Cut.** Today's forced-alignment dead-air trim
     (`api/_lib/renderFfmpeg.ts`, VO end, never mid-word) runs at the final concat — move it to run PER
     CLIP so every scene in the First Cut film-strip AND every exported clip is already lip-synced + tight.
   - **Morphs / melts / artifacts → caught by the RESHOOT gates, not trimming** (you can't trim a bad
     generation). Storyboard approval (image-level) + First Cut flagged-clip reshoot; Fable 5's engine
     already auto-flags failed scenes. Nothing flawed ever reaches delivery/export.
   - **Rename "raw clips" → "clean scene clips / your footage."** Export = trimmed, lip-synced, flaw-free
     clips (UN-styled) + voiceover + captions/SRT + thumbnail + project file. The AI editor adds the STYLE
     (stitch + transitions + SFX + music + overlay text + auto-captions + animations) per preset.
   - Split: **per-scene stage = clean atoms; AI-editor stage = composition/style.**

## Still open for `/grill-me`
- **Concierge pipeline variant** — skip `market_research`, inject the user's custom script + per-scene
  direction; everything downstream identical to One-Shot.
- **Reshoot economics** — Fable 5 had "2 free takes, then 1 credit." In scope now or later?
- **Presets** — final list (AUTO / IMPACT / CLEAN / HYPE?) and whether IMPACT/CLEAN gate to Pro or stay free.
- **Review/feedback wiring** — tie to the `post-delivery-tip-feedback` branch; exact trigger point in/after First Cut.

## After the flow is built: the SIGLA smoke test (already scoped this session)
- **Mode:** Concierge · **Niche:** Product · **Avatar:** Auto-cast · 9:16 · Taglish.
- **Hero asset:** regenerate via the `codex-image` skill (`.tmp/` is wiped each reboot). Prompt:
  *"Photorealistic vertical product hero: a Filipino woman's hand holding a 60ml amber glass wellness
  bottle labeled 'SIGLA / IMMUNITY SHOT / Calamansi-Ginger-Honey / 60ml', handheld, label facing camera,
  bright Filipino kitchen bg with calamansi + ginger, commercial product photography, no text overlays."*
- **Script (hook to formula — [scriptGuardrails.ts](../utils/scriptGuardrails.ts): hook ≤12 words / curiosity gap / no brand):**
  1. Hook (talking-avatar): *"Akala ko normal na 'yung 3PM crash ko."*
  2. Discovery (product-highlight): *"Isang shot pala ng SIGLA — calamansi, luya, pulot."*
  3. Transformation (auto): *"Ngayon, buong araw akong may sigla — walang crash."*
  4. CTA (auto): *"Try mo — SIGLA ka rin. Link nasa baba."*
- **Pre-flight (director-smoke skill):** `scripts/enable-dev-unmetered-video.ps1` → `grifon_dev_unlock='1'`
  → restart `npm run dev`. Drive via the `smoke-tester` subagent (foreground). **Click the Concierge
  MODULE TILE — never the dashboard search bar.** Review scenes on the intended surface — never the
  8-step wizard StepIndicator.
- **Pass:** 1:1 line→scene · product matches hero · per-scene shot intents respected · final MP4
  assembles (trimmed + voice) · `gemini-eval` no Critical · **Neil eyeballs the renders.**

## Lessons banked this session (so we don't repeat them)
- Recovering a deleted-branch commit needs `gh` + auth; commits survive on GitHub even after branch
  deletion (use `gh api .../contents/PATH?ref=<sha>`). This project has **no build-time Tailwind** —
  it's the runtime Play CDN in `index.html`; any dev preview mounting real components must replicate
  that head (existing `dev/adPreview.tsx` dodged it with inline styles).
- **Smoke-tester rules to encode** (recurred this session): navigate by clicking the module tile, not
  the search bar; "show me the flow" ≠ "generate it" (don't fire API calls for a UI walkthrough).
