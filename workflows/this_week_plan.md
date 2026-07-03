# This Week's Plan — Core Product First (week of 2026-06-16)

**Decision (Neil, 2026-06-16):** Before any front-end / website / payment / pricing
work, the priority is the **core product — the generated video ads**. New ad styles
for **Services / Real Estate / App-commercial** are the headline deliverable this week.
Website + the scope-honesty punch-list (test-mode checkout, video-tier copy) stay
**parked** until the product is locked.

**Principle:** lock the foundation cheap and fast → bank the free quality wins → *then*
build the headline. All three new ad styles ride the **same render pipeline**, so
re-verifying that pipeline first is what lets us tell a "new style bug" from an
"old base bug" later. Music bed + presets both feed the new styles, so they go first.

---

## The order

### 1. Verify the previous pending render issues are actually closed — FOUNDATION
*(~½ day, one smoke session — delegate to `smoke-tester`, `director-smoke` pre-flight)*
Open render-side items to confirm:
- scene-6/5 END-CLEAN ghost-tail
- end-card overlays live eyeball: ₱ glyph renders in **every** preset font, gold recap
  legibility, anchor-ding timing
- BEAN BLOCK avatar defaults to a **female Filipino voice**
- regression harness green: `$env:RUN_REGRESSION='1'; npx vitest run tests/regression/script-gen.regression.test.ts`
- **R2 cutover check (FREE RIDER — this session renders anyway):** R2 Production env vars
  added + redeploy triggered 2026-06-16 (`2d6a887`). Confirm the rendered media URL is the
  **R2 domain, not `*.supabase.co`**, and it plays. If good → R2 is live in prod. ✅ **DONE
  2026-06-25 (Neil): Supabase org downgraded Pro → free** after ~1 week proven, killing the
  temporary egress-bridge cost. Verified safe first (egress ~0, DB 12 MB, Storage 554 MB — all
  within free caps). ⚠️ Follow-up: 554 MB / 320 stale Storage objects remain → Phase 5 cleanup
  trigger (see [`r2_media_migration.md`](r2_media_migration.md)).

**Why first:** can't build 3 new styles on a base we haven't re-confirmed. This is the
"siguraduhin ayos na" gate.

### 2. Test the new ElevenLabs music bed — BANK THE FREE WIN
*(same smoke session, ~30 min, GATED)*

> **✅ API UNBLOCKED (2026-06-16):** `music_generation` permission enabled; the smoke now
> PASSES — two 30s beds generate to `.tmp/` (re-run via the Node equivalent, since Python
> isn't installed on the cafe PC). Awaiting Neil's ear test.
>
> **✅ MERGED TO MAIN (2026-06-16, `4d57cfa`).** R2 reconciliation done: `api/music/compose.ts`'s
> 3 direct `admin.storage.from(RENDER_BUCKET)…` calls (cache-check / upload / sign) ported to the
> `mediaStore` facade (`putMedia` / `getMediaUrl` / `listMedia`); `RENDER_BUCKET` import dropped,
> `musicBedKey` kept. Bed-cache existence check reworked — R2's `presignGet` mints a URL even for a
> missing key, so the check now `listMedia`s the bed key's parent prefix and matches the exact
> basename before signing (self-consistent with the slash-containing `rotationSeed` key scheme).
> Tests rewired to mock the `mediaStore` boundary + a phantom-cache-hit regression. Build + full
> suite green (225 passed); pushed. **Music-under-VO is now part of the main one-pass smoke** —
> ships dark behind `GRIFON_MUSIC_GEN_ENABLED` (default off → 503 → static-bed fallback).

Branch: `claude/gemini-audio-stack-transfer-eglwp5` (fetch when starting).
- `ELEVEN_LABS_API_KEY=sk_... python3 tools/smoke_music_bed.py` → two MP3s in `.tmp/`
- Listen bar: **invisible > impressive** — bed must disappear under a VO, **no singing /
  vocal intro**. Compare vs static beds in `api/_lib/assets/music/`.
- Stray vocal on a take → discard + rerun (don't judge on one bad roll).
- **Gate:** only if generated ≥ static → set `GRIFON_MUSIC_GEN_ENABLED=true` in the real
  `.env`, then drive a **Pro/Business** render through the AI Editor for full E2E.
- **Ear test is Neil's** — the subagent can generate the MP3s; the quality call is Neil's.

**Why here:** cheap, and a good bed lifts **every** render — so bank it before the
new-style build and the new styles inherit it for free.

### 3. Test the existing edit-style presets — THE BRIDGE
*(~½ day)* `classic` / `impact` / `hype` / `clean` in `api/_lib/renderPresets.ts`
(roadmap #11). Confirm current baseline + the sincerity guard (Testimonial never `hype`).

**Why before the new styles:** presets *are* the editing-style layer. We need the baseline
in hand before deciding whether Services / Real Estate / App reuse these or need new ones.

### 4. Build the new ad styles — THE HEADLINE
*(the week's main work — one vertical slice at a time: spec → build → smoke → next)*
Logged as roadmap **#12 Services**, **#13 Real Estate**, **#14 App / commercial**.
Sequence by reuse:
1. **Services** first — closest to the existing product/testimonial flow. ✅ **SHIPPED**
   (2026-06-21/22, Phase 1 + Phase 2 + formula v2 — see roadmap #12).
2. **Real Estate** — more bespoke scene logic. ✅ **SHIPPED** (2026-06-22, agent-led
   walkthrough + avatar-in-property — see roadmap #13).
3. **App / commercial** — most bespoke. ⚡ **RE-SCOPED to App-only (Neil, 2026-07-03):**
   the "general commercial spots" half now rides the **Cinematic Ad Studio** lane
   ([`cinematic_ad_studio_prd.md`](cinematic_ad_studio_prd.md), Seedance 2.0 4K). The
   App vertical (UI/screen shots, download/sign-up CTA) stays on the existing pipeline —
   spec via `grill-me` → `app_adstyle_spec.md`, then the #12/#13 vertical-slice pattern.

Per style: run `grill-me` to write the spec **before** code; build one vertical slice
(types + service call + UI + state through one style) before starting the next; smoke each
via `smoke-tester` before moving on. TUNED-prompt edits in `services/geminiService.ts` /
`api/_lib/prompts.ts` need Neil's explicit go (surgical-edit rule).

### 5. Website / payment / pricing — AFTER (Neil's call)
Scope-honesty punch-list (A: test-mode checkout on public pricing, B: video-tier
expectation) stays parked until the product is locked. See the saved audit.

---

## Status notes (2026-06-16)
- Build is green (`✓ built in 2.84s`). Earlier build-gate failure cleared via the R2 commit.
- Uncommitted R2 migration work is in the tree (`api/_lib/r2.ts`, `mediaStore.ts`, modified
  `api/render/final.ts`, `renderJob.ts`) — **not** part of this plan; do not clobber when
  switching to the music branch.
- `claude/gemini-audio-stack-transfer-eglwp5` is not fetched locally yet.
