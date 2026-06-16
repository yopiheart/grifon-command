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

**Why first:** can't build 3 new styles on a base we haven't re-confirmed. This is the
"siguraduhin ayos na" gate.

### 2. Test the new ElevenLabs music bed — BANK THE FREE WIN
*(same smoke session, ~30 min, GATED)*

> **🚧 BLOCKED (2026-06-16 smoke):** the smoke ran but **failed at the API** — the
> ElevenLabs key in `.env` is missing the **`music_generation`** permission
> (`HTTP 401 missing_permissions`). The endpoint + request were correct; this is a
> **key/tier capability**, not code. **Action for Neil:** enable `music_generation`
> on the ElevenLabs account/key (likely a higher tier / explicit feature toggle in the
> dashboard), then re-run. Also note: **Python isn't installed on this cafe PC** —
> `tools/smoke_music_bed.py` can't run as-is; the smoke used a Node equivalent. Until the
> permission lands, this step is parked and the new ad styles ship on the existing static beds.

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
1. **Services** first — closest to the existing product/testimonial flow.
2. **Real Estate** — more bespoke scene logic.
3. **App / commercial** — most bespoke.

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
