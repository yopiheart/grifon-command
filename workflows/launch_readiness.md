# Workflow: Launch Readiness

**Objective:** Track what's required before GRIFON COMMAND can take real paying users at `app.grifon.ai`.

This is the meta-workflow. It doesn't do the work itself — it points to the workflows that do, and tracks overall progress. **Source of truth = the code + `git log`.** This file summarizes; it does not replace.

> **⏭ NEXT SESSION (2026-07-05+): THE LAUNCH TRAIN.** The launch gate is now the **unified One-Shot / First Cut "Producer" flow** — see the paste-ready kickoff in the 2026-07-05 section below. Everything in the older ⏭ pointer further down is historical (its items closed in the 2026-06-16/17 sections).

## Status as of 2026-07-05 late (scene-image model eval — LITE_PASS, swap awaiting Neil's eyeball)

Neil brought the Gemini Omni Flash sources; the session produced (1) roadmap item #18 (Omni
b-roll PoC parked, two-layer editing architecture — `post_beta_roadmap.md`) and (2) an approved,
eval-gated plan to move `sceneImageModel` to **`gemini-3.1-flash-lite-image`** (Nano Banana 2
Lite: ~4s/img, ~25% cheaper, 1K-only) for `generateSceneImage` + `executeStudioCommand`, with
`generateThumbnail` split to a new `thumbnailModel` const staying on preview and `avatarModel`
untouched (2K support + identity anchor).

**Phase A eval ran and PASSED.** Harness: `tools/eval_scene_image_models.mjs` (`9330b87`) —
7 cases × both models, identical TUNED-parity prompts, 14/14 ok → `.tmp/model-eval/` +
manifest. Fresh-context adversarial critic (gemini-eval separate-critic SOP) verdict:
**LITE_PASS — zero lite regressions** on person-leak (03/05 clean), product/label fidelity
(03/04/07), identity lock, camera mandate, FILIPINO_CAST_LOCK. Lite was strictly CLEANER on the
venue case (preview invented a third person's disembodied hands + a "TIP" jar with pseudo-text
brochures; lite rendered exactly two Filipinos, tighter place identity) and honored
HIGH_ANGLE_SELFIE where preview flattened it. Avg latency 4.5s vs 10.7s (2.4× faster).
Main-loop spot-check of pairs 03 + 06 confirmed the critic's findings first-hand. Lite nits
(non-blocking): slightly softer microtexture, occasional crowded hand anatomy (01/02/07).
Shared-baseline notes for the prompt backlog (BOTH models, flag-only, TUNED): 07 left-hand vs
commanded right hand; HIGH_ANGLE_SELFIE "looks UP" self-contradicts looking-down scene actions.

**Gate:** Phase B (the constant swap + 1K clamp) fires ONLY on Neil's eyeball approval of the
`.tmp/model-eval/` pairs. `.tmp` is defreezer-wiped — if the PC reboots first, re-run
`node tools/eval_scene_image_models.mjs` (~$0.60) to regenerate the pairs.

**→ Neil PASSED the eyeball gate same session; Phase B SHIPPED.** `sceneImageModel` →
`gemini-3.1-flash-lite-image` (scenes + Image Editor studio), new `thumbnailModel` const keeps
thumbnails on `gemini-3.1-flash-image-preview`, `avatarModel` untouched, 1K clamp in
`generateSceneImage` (lite is 1K-only; thumbnails/avatars keep 2K). Diff by `code-executor`,
build + 423 tests green, services/CLAUDE.md LOCKED list updated (6 constants, real line numbers).
**Live in-app smoke was BLOCKED on the auth wall** (no persisted session, known Playwright
hard-wall — roadmap #15A); Neil chose commit-now: the A/B eval already exercised the exact
model + tuned prompts live against the API, so **the next real producer/wizard render is the
live confirmation — eyeball scene-image quality + generation speed on that run.**

## Status as of 2026-07-05 (FULL PENDINGS REVIEW — launch gate = the producer smoke)

Full June→July pendings review ran this session (all workflow docs + all 12 remote branches audited).
**Direction reality since 2026-06-17:** the product's launch surface is the **One-Shot Producer flow**
(`feat/oneshot-firstcut-recovery`, PR #41, 407 tests green, opt-in behind `?osaEngine=producer`); the
8-step wizard is admin/dev-only. The "beta-ready, invite the first user" verdict of 2026-06-17 predates
this pivot — **the real gate today is finishing the producer live smoke**, which died 2026-07-02 on a
no-billing Gemini key (every `/api/gemini/text` → 429). Full state:
[`handoff_oneshot_concierge_unified_flow.md`](handoff_oneshot_concierge_unified_flow.md).

### Priority stack for launch (most → least)

1. **Producer flow smoke + land it** — blocked on the Neil-batch below; then drive the two unreached
   hard gates (resume mid-run, no-double-spend) + fix the 429-quota UX find (endless "Researching your
   market…" spinner with no quota-specific error).
2. **Slice 2 — video rate-limit re-scope** (per-clip → per-ad-launch, `api/gemini/video.ts`). Neil
   sign-off gate; without it >5-scene ads self-throttle.
3. **[`oneshot_flow_fixes.md`](oneshot_flow_fixes.md) verify-and-close** — ProducerFlow likely fixed
   most of the 3 defects (minimize=abandon, no resume, completion dumps into dev wizard). 30-min pass.
4. **Growth telemetry go-live** — code shipped; remaining = Vercel env vars
   (`VITE_META_PIXEL_ID`, `META_CAPI_ACCESS_TOKEN`) + apply `supabase/marketing_consent.sql`.
   Day-one beta funnel data can't be backfilled.
5. **R2 Phase 5 cleanup** — 554 MB / 320 stale Supabase Storage objects; free tier goes **read-only**
   past 1 GB. Agent-doable, no gate. [`r2_media_migration.md`](r2_media_migration.md).
6. **Nightly regression live** — add `GEMINI_API_KEY` as a GitHub Actions secret + get the workflow on
   `main` (it silently skips until then). [`nightly_regression.md`](nightly_regression.md).
7. **Branch hygiene** — land `docs/believability-content-look` (the SUPERSET: seedance/cinematic
   tooling + skills not on main, only 9 behind); push + PR the committed-but-unpushed
   `drawplan-refactor`; merge the trivial `claude/anthropic-pdf-loop-eval-zidz7n` timeout bump.
8. **Expert-mode Bucket B decision** (HELD merge) + Slice-0 merge-vs-evolve — gates Concierge, which
   is Business-tier, not free-beta. Branch is 69 behind main → salvage = cherry-pick (A4 upload gate,
   Bucket B relight), not merge. Decide soon, build later.
9. **`claude/privacy-dashboard-bugs-mfk10d`** (passwordless OTP) — real unmerged auth code; conflict-
   check vs main's newer OAuth funnel work before merge-vs-redo.

Everything else stays parked per `post_beta_roadmap.md`'s own resume triggers — none has fired.

### The Neil-batch (one sitting unblocks four workstreams)

1. Fix the Gemini key billing (enable billing OR swap a billing-enabled key into `.env`) → #1
2. Apply `supabase/producer_runs.sql` (**re-copy from repo — schema changed 2×**) +
   `supabase/marketing_consent.sql` in the SQL editor → #1 + #4
3. Add `GEMINI_API_KEY` as a repo Actions secret → #6
4. Confirm the two Meta env vars in Vercel → #4
5. Three GO calls: GATE-STOP paid run re-confirm (~₱20, zero video) · Slice-2 rate-limit sign-off ·
   Bucket B merge eyeball
6. Ear-test the two generated music beds (pending since 2026-06-16; regenerate to `.tmp/` if wiped)

### Doc + branch hygiene findings (Session B scope)

- **Stale docs to refresh/archive:** [`this_week_plan.md`](this_week_plan.md) (week of 06-16, all
  shipped); [`advanced_mode_cleanup.md`](advanced_mode_cleanup.md) (targets the now-admin-only 8-step
  wizard — mark superseded, fold salvage into
  [`concierge_director_plan.md`](concierge_director_plan.md));
  [`handoff_2026-06-08-pr9-merged-launch-pendings.md`](handoff_2026-06-08-pr9-merged-launch-pendings.md)
  (#1 burn-in looks shipped mid-June, #2 headless-autopilot likely superseded by the producer flow —
  verify + close).
- **Branches to delete after believability lands:** `wip/seedance-merge-backup` (strict subset),
  `claude/seedance-4k-ads-skill-wnwn57` (feeder, fully contained), `fix/hook-endframe-product-only`
  (already superseded), `claude/video-ads-workflow-fgg2sy` (verify overlap with `e16058e` first).
- Stray modified `tests/unit/__snapshots__/drawPlan.snapshot.test.ts.snap` in the working tree —
  stale snapshot, regenerate or discard; don't commit blindly.

### Paste-ready kickoff — Session A (the launch train)

```
Read workflows/launch_readiness.md (2026-07-05 section) + workflows/handoff_oneshot_concierge_unified_flow.md first. Today = the launch train.

Neil-batch status (tick what I did before this session):
[ ] Gemini key billing fixed / swapped in .env
[ ] producer_runs.sql applied (re-copied fresh from repo)
[ ] marketing_consent.sql applied
[ ] GEMINI_API_KEY added as GitHub Actions secret
[ ] Meta pixel env vars confirmed in Vercel
GO calls: GATE-STOP paid run = GO / NO-GO · Slice-2 rate-limit re-scope = GO / NO-GO

Then, in order:
1. Fetch feat/oneshot-firstcut-recovery (PR #41). Re-fire the staged producer smoke per the handoff's TEST SPEC on the smoke account (neilmaglaya.business22+smoke@gmail.com). Delegate all browser driving to smoke-tester (foreground). director-smoke pre-flight NOT needed (One-Shot flow, not the 8-step wizard).
2. Drive the two hard gates: resume mid-run + no-double-spend.
3. Fix the 429-quota UX find (quota-specific error instead of endless research spinner) — non-tuned UI.
4. Slice 2 rate-limit re-scope in api/gemini/video.ts with my explicit sign-off on the diff (TUNED-adjacent infra).
5. If all green: surface the "flip ?osaEngine=producer to default + first invite" decision to me — do NOT flip it yourself.

Rules: code-executor for multi-file edits, verify-changes before reporting done, commit + push early (defreezer). If blocked >30 min on anything, write status here and move to the next item.
```

**Session B (hygiene sweep, agent-heavy — interleave or follow):** R2 Phase 5 cleanup → land
believability superset + drawplan PR + timeout bump → delete superseded branches → archive/refresh
the stale docs above.

> **⏭ NEXT SESSION (2026-06-14+):** (1) **ONE FINAL_RENDER live-verify session** (Neil at the wheel, director-smoke pre-flight, smoke-tester delegation, unmeter first): end-card recap + price-anchor overlays (SHIPPED 2026-06-13 code-side — eyeball band placement at 0.26h, gold recap legibility, ₱ glyph rendering in EVERY preset font, anchor ding timing) + the parked scene-6/5 regen (END-CLEAN ghost-tail kill) + tighter trim pads + Scene Pipeline defaulting to a female Filipino voice for the BEAN BLOCK avatar. (2) ~~Billing-success page live-verify~~ — **CLOSED 2026-06-13: Neil tested the "Founding Creator" share card + native share live and confirmed it works ("its perfect already").** Remaining Neil-gated render backlog: product-aware hook text dodge (vision pass is face-only today); EDL responseSchema; structured `gender` field on `FilipinoLibraryEntry` (replaces the description-regex match — api/_lib/, needs approval gate).

## Status as of 2026-06-16 (DIRECTION SHIFT — core product first; website/pricing parked)

**Decision (Neil, 2026-06-16):** Before any website / payment / pricing work, the priority is
the **core product — the generated video ads**. New ad styles for **Services / Real Estate /
App-commercial** are this week's headline (logged as `post_beta_roadmap.md` #12/#13/#14). Full
ordered plan: [`this_week_plan.md`](this_week_plan.md). Launch target = **free, hand-picked
beta** (no payment) → **Gate 3-prod live billing is OFF the critical path.**

**Gate snapshot:** 1, 2, 3-dev, 4, 5, 6, 7 CLOSED. 3-prod (live billing) deferred — not needed
for a free beta.

**Real blockers to inviting anyone (not infra gates):**
1. **✅ LOGIN — RESOLVED 2026-06-16.** Was transient. Verified via Supabase MCP: project
   `varoqxjccqmskzeejagn` is `ACTIVE_HEALTHY`, `.env` `VITE_SUPABASE_URL` matches it, and the
   auth logs show Neil's Google login succeeding (`/callback` 302 → `/user` 200) with **zero
   failed-login/error events in 24h**. Neil confirmed he can log in now. Gate 2 genuinely green.
2. **✅ FINAL_RENDER eyeballed live — RESOLVED 2026-06-17 (Neil's smoke).** End-card overlays
   (₱ glyph per preset font, gold recap legibility, anchor-ding timing), scene-6/5 ghost-tail, and
   the BEAN BLOCK female-voice default all confirmed in Neil's most-recent render smoke.
3. **✅ Resume-pill on refresh — verified working (Neil, long-standing).** Wizard state survives a
   hard refresh; the `[RESUME]` pill restores all step state (`App.tsx:611-623`, `:1330`).
4. **✅ R2 media migration — LIVE IN PROD, RESOLVED 2026-06-17 (Neil).** `MEDIA_STORE=r2` + the four
   `R2_*` vars wired into Vercel Production, redeployed, prod render eyeballed from
   `*.r2.cloudflarestorage.com`. Supabase egress risk (had hit 356% of free-tier quota) closed.
   Only Phase 5 cleanup remains — deferred, not a blocker. See
   [`r2_media_migration.md`](r2_media_migration.md).

**→ All Tier-0 launch gates are now cleared. Grifon is beta-ready; invite the first hand-picked user.**

**New since 2026-06-13:**
- **R2 media migration** — Phase 1 (dormant facade, default supabase, `4c499c1`) + Phase 2
  dev-verified (bucket+token+CORS live, `643dbe9`). The fix path for the Supabase **egress** risk
  (hit 356% of free-tier quota, refills ~June 18). Next: Vercel env. See [`r2_media_migration.md`](r2_media_migration.md).
- **Beta polish** shipped (`7b47a35`): responsive Step 6 thumbnail tile + footer dead-link guard.
- **ElevenLabs music bed** (generation): was BLOCKED on the key's `music_generation` permission;
  **Neil enabled it 2026-06-16** — re-test pending. Static beds remain the shipping default.
  Note: Python is absent on the cafe PC; the smoke runs via a Node equivalent.
- **Pricing scope-honesty punch-list** captured (public pricing page sells paid plans through a
  **test-mode** PayMongo checkout; video-tier expectation) — parked with website work until the
  product is locked.

## Status as of 2026-06-13 late (END-CARD OFFER RECAP + PRICE-ANCHOR CALLOUT SHIPPED — code-side)

The overlay bundle from the NEXT SESSION pointer is in. Neil answered the open question: **auto-pull, editable** — the recap prefills from the wizard's `clientDetails.offer`, both fields editable in the AI Editor before FINAL_RENDER (price anchor typed, placeholder-guided). Flow: `App.tsx` threads `offer` into both `setEditorBatch` call sites → `EditVideo` STEP_2 · END_CARD panel (two inputs, 80-char clamped) → `FinalRenderRequest.endCard` (new zod-validated field, [api/render/final.ts](../api/render/final.ts)) → new `planEndCardLayers` in [api/_lib/renderFfmpeg.ts](../api/_lib/renderFfmpeg.ts) burns the gold recap (0.26h band) over a smaller white price-anchor line into the **last scene only**, both popping in (0.3s/0.8s) and holding to the end; ding on the anchor. EDL brain untouched (tuned files clean — overlays come from the request, not the model).

**Adversarial review (7-angle /code-review) folded in before commit:** prefill >80 chars would have 400'd every render (clamped); end-card pops were leaking into camera punchTimes (excluded); 1-scene-ad hook/end-card band collision (end card skipped when last scene is the hook, logged); recap duplicating the EDL punchline (normText dedup vs the scene's drawn overlay + scriptLine); recap SFX at 0.3s evicting the cut whoosh / EDL overlay sound under the 0.4s min-gap (recap silent, anchor owns the ding); end card now respects the BURN-IN toggle; type triplication consolidated on `FinalRenderEndCard`; em-dash placeholder corrected to a hyphen (em-dashes strip per the 2026-06-10 caption rule — typed em-dashes still strip silently, WYSIWYG gap accepted). **Deferred (deliberate):** preset-driven end-card y-band (HOOK_TOP_FRAC precedent; revisit if the live eyeball wants per-preset tuning); options-object refactor of `renderFinalVideo`'s positional params; planScene multi-overlay generalization (end card stays request-level by design). Verification: build green, suite green (**204 passed**, 6 new `planEndCardLayers` tests). **Live FINAL_RENDER eyeball pending** — folded into the next render session (see pointer above).

## Status as of 2026-06-13 (voice auto-preselect by avatar gender SHIPPED — `c6b2ce9`)

First item of the render backlog closed. The AI Editor (FINAL_RENDER) and Scene Pipeline default-voice pickers now prefer a voice matching the wizard avatar's gender — explicit Step 4 pick stored on `Avatar.gender` (new optional field), uploads/old drafts inferred from the describeImage text via [utils/voiceSelect.ts](../utils/voiceSelect.ts). Gender re-orders WITHIN each tier only (Filipino library → my voices → recommended stock → stock), never overrides a manual pick; `Any`/ambiguous keeps old defaults exactly. Library voices match via curated description ("Female, 30s ·…"), stock via `labels.gender`. 10 new unit tests; build + suite green (198 passed); 5-angle adversarial review folded in (memoized inference, stock-tier ordering fix, dead fallback removed). **Deliberate:** my-voices tier stays gender-blind (user-authored clones); TextToSpeechTile unchanged (not the render path). **Live eyeball still pending:** Scene Pipeline should default to a female Filipino voice for the BEAN BLOCK avatar — fold into the next render session (the same one that verifies the overlay bundle). Dev pre-flight from this session: `GRIFON_DEV_UNMETERED_VIDEO=true` is in `.env` (re-run `scripts/enable-dev-unmetered-video.ps1` after defreezer).

## Status as of 2026-06-12 (FULL-FUNNEL KINETIC REDESIGN MERGED TO MAIN — landonorris-inspired)

The `claude/landing-page-redesign-g7zaca` bundle (entrance → daily habit, one kinetic visual language) was **verified on PC by Neil and merged to `main` via `--no-ff` (`1a9097d`); origin updated `08be4b2..1a9097d`.** Vercel auto-deploys `main` to prod. Source of truth = `git log`; this is the summary.

**The redesign (pre-merge, on the branch):** landing rebuilt with kinetic ad-montage hero, Instrument Serif gold accents, marquees, SignatureScribble system, cream proof band, scattered proof gallery, pinned START FREE pill w/ hide-zones, squiggle scroll-spy nav; pricing kinetic pass; auth gateway outcome-first + **GitHub OAuth live in Supabase** (Apple wired but OFF, needs $99/yr account — `config/authProviders.ts` is the per-provider kill switch); route veil page transitions; checkout/billing-success/dashboard restyle. DESIGN.md amended (serif-accent token, proof-band `#F2F1EA` light-band exception, heading LAW). `.AI` suffix dropped everywhere. Full pre-merge detail: [`handoff_2026-06-11-funnel-redesign.md`](handoff_2026-06-11-funnel-redesign.md).

**This session's verification + conversion pass (CMO-locked, on top of the bundle):**

| Theme | What shipped |
|---|---|
| Animations "broken" — root cause | NOT a bug: every motion system gates on `useReducedMotion()`; Neil's PC had Windows animation effects OFF → Chrome reported `prefers-reduced-motion: reduce` → all static by design. Confirmed live (Playwright matchMedia + marquee `playState`). DevTools "no-preference" emulation unblocked verification. |
| Checkout price-switch lag | Real. `CheckoutPage.tsx` re-fetched the intent on every monthly↔annual toggle. Now caches per cycle+add-ons key and **pre-warms the opposite cycle** → instant swap, math stays server-authoritative (`d113216`). |
| Hero CTA (CMO) | Split layout kept (vertical-phone visual; centering pushes CTA below fold). Copy → **"CREATE MY FIRST AD — FREE"** (first-person outcome); risk-reversal moved to a ★ click-trigger trust row. Pinned pill gained "₱0 today · no card". |
| Receipts Rail (NEW `ReceiptsRail.tsx`) | Replaces the static testimonial grid. Scroll-pinned horizontal strip, canvas/heading morph dark→cream + cards zoom 92→100% on pin; **7 cards = 3 real quotes interleaved with 3 clearly-labeled SAMPLE-AD receipts (proof-wall stats restated — never invented reviews) + a RESERVED CTA end-card**; ticker 01→07. Mobile: cream snap-carousel that auto-plays left→right then hands off to swipe (suspends mandatory snap for the glide). Pill hides across the rail. |
| Footer rebuild | Lando anatomy: publish-everywhere gold **glint** marquee, trust row, link cols (wiring unchanged), giant "ALWAYS *shipping* THE AD." scribble tagline, **sculpted griffin emblem** (`public/griffin-emblem.png`) rising out of the card edge w/ breathing gold aura + START FREE on its chest, gold closing strip (centered on mobile — last fix before merge). |
| Director AI card | AnimatedBorder → **viewfinder frame** (breathing gold corner brackets + blinking REC) so it no longer twins the guarantee's rotating arc. |
| Polish | Scribble underline dropped below baseline (descender collision); mobile "TRUSTED BY…" headline centered. |

**Commits this session (all on `main` via the merge):** `d113216` checkout prefetch · `80218db` vite `*.webm` watch-ignore (locked screen recordings were crashing the dev server) · `219231b` rail+footer+CTA v1 · `51f955e` rail v2 light-flip + mobile auto-play + viewfinder + glint · `9f56f48` griffin emblem · `48bbb5a` gold-strip mobile centering.

**Griffin asset note:** the ChatGPT-generated PNG had the checkerboard **baked in as white pixels** (no real alpha). Keyed out via a .NET LockBits pass (`scripts`-free, inline) — grayish near-white → transparent, feathered. If regenerated, request a true transparent PNG or a solid `#09090b` background.

**Tooling re-arm (defreezer):** `gh` restored via `scripts/restore-gh-cli.ps1` but **was never auth'd** — the merge went through plain `git` (push creds already worked this session), not `gh`. Next session needs `gh auth login` (or `$env:GH_TOKEN`) before any PR-based flow.

**Known-open from the redesign:** billing-success share card unverified (see NEXT SESSION); reduced-motion users still see only ad-frame-0 in the hero montage (content gap, not just motion — parked); ImageAdsGen/OrganicCalendar `referenceImageMode` bug still parked (render-side, untouched here).

## Status as of 2026-06-10 (VALIDATION RENDER EXECUTED — hook blob KILLED · 11-fix hardening day)

The queued [`validation_render.md`](validation_render.md) ran end-to-end on a fresh brand (**Bean Block** Bukidnon Arabica — real Shopee hero, woman-holding-bag) through MarketMind → Director (all auto-prefill regression checks PASS) → storyboard → Kling/Veo RENDER ALL → Signal Modulator → AI Editor → FINAL_RENDER. **Both validation targets confirmed:**

1. **Hook blob: DEAD.** Frame-stepped the fresh Kling Omni morph — grounds→bag tracks through the orange anchor, zero flesh tones. ~1/10 vs the 8/10 baseline. Phase D (`109d367`) + the anchor-color fix validated live.
2. **Viral Editor 2.0 on clean footage: works** — title-stack hook, word-pop captions, preset rotation, CTA hold; surfaced a quality punch-list that became the fix chain below.

**11 fixes shipped + pushed this session** (`7cd60cb`→`42200d9`), every one root-caused from a live failure Neil hit:

| Theme | Fixes |
|---|---|
| Scene-gen person/product leaks | CAMERA_MANDATORY gated to avatar/both modes (face demand was pulling the hero's person into product frames); HOOK ANCHOR color now derives FROM the product (was recoloring the bag); PRODUCT_IDENTITY_CORE gated off no-ref frames + NO_UNSOLICITED_PRODUCT (invented fake-label props) |
| EDL stochastic drift (no responseSchema) | scenes-array guarantee, overlayText/sfxCues coercion to the render contract, formulaCheck/globalSfxPicks defaults, UI nullish guards — module-crash + FINAL_RENDER 400 class closed |
| Renderer quality (Neil's scene-by-scene reviews) | caption VO-sync (chunks pace the speech window; overlay-overlapped chunks sacrificed); hook word fusing (uppercase-aware advance + explicit gap); hook moved to top safe band (was blocking the product); preset rotation stabilized (signed-URL tokens were re-rolling the style per re-render); em-dash strip; PAD_SEC 0.3→0.18 + last-scene razor trim 0.06s; `[renderFfmpeg:trim]` per-scene log |
| Voice | normalizeTaglish was DEAD CODE — wired into BOTH TTS paths (client voiceService + server consolidator); "swabe"→"swah-beh" entry |
| Video prompts (TUNED, Neil-approved) | END-CLEAN negatives on A-Regular + Option B (which had NO negative phrase at all) — Kling/Veo bake ghost/dissolve into final frames; renderer can't cut what overlaps speech |
| Dev infra | `GRIFON_DEV_UNMETERED_VIDEO` now bypasses hourly rate-limit too (Neil hit 402 then 429 mid-smoke); `scripts/enable-dev-unmetered-video.ps1`; director-smoke skill pre-flight step 0 = unmeter first |

**Known-open:** ghost-during-speech on scene 6 is source-clip damage (only a regen fixes the existing clip); scene 6 CTA intentionally suppresses captions (punchline owns the band); ImageAdsGen/OrganicCalendar still have the parked referenceImageMode wiring bug (now also skips PRODUCT_IDENTITY_CORE text — fold into that Tier-4 fix).

## Status as of 2026-05-22 (Omni hook arc C–G logged · RENDER ALL → Signal Modulator hand-off verified)

This file skipped 12 days — the Omni hook arc (Sessions C–G) shipped + closed without landing here. Two things bring it current: (1) the Omni arc summary, (2) a verification verdict on the RENDER ALL → Signal Modulator hand-off.

**Branch reality:** the `checkout-redesign-preview` bundle the 2026-05-10 section gates on **has since merged to `main`** (merge `a32add0`). All work below — checkout redesign, Phase 4(a–h), the Gemini-calm dashboard redesign, and the full Omni arc — is on **`main`**; HEAD is `81f34b3`. The "branch is checkout-redesign-preview" reboot notes in older sections are frozen history — `main` is the live branch now.

### The Omni hook arc — Sessions C–G (wizard hook scene → Kling Omni)

Five sessions routing the wizard's Scene-1 **Hook** to Kling Omni O1 for morph-driven drama. Full prose lives in the per-session handoff docs; the net:

| Session | Outcome | Handoff |
|---|---|---|
| C | Routed hook → Kling O1 on a *guessed* model name; reverted after a doc-check found Omni needs its own proxy + body shape. | [session-c](handoff_2026-05-18-session-c-reverted-omni-discovery.md) |
| D | Omni proxy + `Kling_O1` routing built (`api/kling/omni-video.ts`); `end_frame` morph hotfixed (`2d943b6`) after a frame-check caught camera-motion-only. | [session-d](handoff_2026-05-19-session-d-shipped-track-b-pending.md) |
| E | `generateVideoPrompts` Option A split into A-Hook + A-Regular; existing `scene.transitionEffect` signal plumbed through instead of a new classifier (TUNED, `4a82d99`/`31d65f4`). | [session-e](handoff_2026-05-19-session-e-shipped-session-f-pending.md) |
| F | Effect sweep — 5 hook transition effects graded on Omni; non-morph-family effects down-converted in A-Hook (TUNED, `84d542d`). | [session-f](handoff_2026-05-22-session-f-omni-effect-sweep.md) |
| G | Dead-first-second investigation — Omni holds `first_frame` static ~1–2s. Proven a **structural Omni limit**: both no-code levers (front-loaded prompt, shorter duration) FAILed empirically. No code shipped. | [session-g](handoff_2026-05-22-session-g-dead-first-second.md) |

**Open from the arc:** the dead-first-second fix (post-render head-trim) is parked as [`post_beta_roadmap.md` #9](post_beta_roadmap.md). Session F leftovers still open: VIRAL VFX MENU prune, cross-product validation (effect sweep is coffee-substrate only, n=1), the 10 `tests/unit/geminiService.schemas.test.ts` failures.

### RENDER ALL → Signal Modulator hand-off — VERIFIED 2026-05-22

Question: does finishing **RENDER ALL** in Generate Video hand off to the per-scene **Signal Modulator** (voice) step? **Verdict: yes — fully wired and correct. Not broken.**

| Stage | Where |
|---|---|
| RENDER ALL completes | `runQueue` emits `{type:'complete'}`; each scene `'done'` → `sceneResults[idx]`. |
| Hand-off CTA | `// SEND TO SIGNAL MODULATOR ↗` shows when `renderedCount === seedPrompts.length` — [GenerateVideo/index.tsx:1518](../components/GenerateVideo/index.tsx#L1518). |
| Batch + switch | `SceneBatchEntry[]` (sceneIdx, scriptLine, renderedUrl, type) → [App.tsx:699](../App.tsx#L699) `setSceneBatch` + `setActiveModule('signal_modulator')`. |
| Auto-tab | Signal Modulator auto-selects the Scene Pipeline tab when `sceneBatch.length > 0` — [SignalModulator/index.tsx:28](../components/SignalModulator/index.tsx#L28). |
| Per-scene voice | `ScenePipelineTile` loops `synthesizeSpeech` per scene; empty-batch fallback `// NO_SCENES_RECEIVED`. |

**Live spot-check (Playwright, dev):** Signal Modulator opened standalone — voice library + budget chip loaded; one TTS synth succeeded (budget 60→59, take logged). The ElevenLabs path `ScenePipelineTile` depends on (`voices` / `budget` / `synthesizeSpeech`) is healthy. A full live RENDER ALL E2E was deliberately *not* run — the code trace was conclusive and a full render would burn ~$3–5 + Veo credits for marginal added confidence (Neil's call).

**Two known behaviors (not bugs):**
- The hand-off CTA needs a *fully clean* RENDER ALL (`renderedCount === seedPrompts.length`). Any scene ending `'failed'` (a genuine 502, not an auto-resuming 429) hides the CTA until the user re-renders it — a partial RENDER ALL has no hand-off path.
- `ScenePipelineTile` marks any scene with a blank `scriptLine` (e.g. a b-roll scene with no VO line) as `'failed' / EMPTY_SCRIPT_LINE`.

**Dev-env note:** `[useSubscription] realtime CHANNEL_ERROR` logs under `npm run dev` (Supabase realtime websocket) — does not affect plan-tier resolution or budget loading; cosmetic in dev.

## Status as of 2026-05-10 (Phase 6 fixes shipped — beta-merge gate is Neil's call)

Phase 5 full 3-module E2E (MarketMind → Offer Optimizer → Director AI) ran 2026-05-10 against the Flying Barista Blend hero. Surfaced 4 findings; Phase 6 closes 4 of 4 in code (acceptance criteria pending Neil's next live Playwright wizard).

### Shipped this round

| Phase | Commit | Closes | What changed |
|---|---|---|---|
| 6a | `5acea2f` | FINDING-3 | `retryWithBackoff` now retries on `PROXY_TIMEOUT` (504) with separate 2-retry budget; REGEN button always renders on failed scenes (label flips between `GENERATE` and `REGEN`). |
| 6b | `8fdc1f9` | FINDING-1 | `Step1ClientDetails` now syncs prop changes via `useEffect(() => setFormData(data), [data])` — the `useState(data)` was capturing the prop only at mount, silently swallowing the auto-prefill update from `App.tsx`. |
| 6c | `6c26161` | FINDING-2 + FINDING-4 | Storyboard schema's `referenceImage` enum widened from `"avatar" \| "product"` to add `"both"` and `"none"`. New `REFERENCE_IMAGE_CLASSIFICATION_RULE` in `api/_lib/prompts.ts` teaches the narrative-generator to use `"both"` for avatar+product scenes (e.g., SCENE_07-shaped) and `"none"` for product-adjacent generic B-roll (e.g., SCENE_06-shaped). New `DUAL_REFERENCE_LOCK` branch in `generateSceneImage` composes avatar identity + product identity rules. `NO_LOGO_HALLUCINATION` rephrased from negation ("don't invent labels") to preservation ("PRESERVE the uploaded label EXACTLY") with explicit composition-flexibility escape clause. |
| 8b | `ab2cf23` | FINDING-5 | Diagnosed via full-res inspection of Karit Coffee verification run: SIDE_PROFILE_TALK and DYNAMIC_SHOULDER were silently collapsed to frontal portrait when IDENTITY_LOCK fired. Trimmed `AVATAR_CAMERA_ANGLES` from 6 → 4 (kept INTIMATE_CLOSE_UP, MEDIUM_FRONTAL, WIDE_BUST_SHOT, HIGH_ANGLE_SELFIE — the framings the model reliably renders). Strengthened `CAMERA_MANDATORY` wording to tell the model explicitly that DISTANCE + ELEVATION are non-negotiable AND that scene-prompt actions execute AT the framing (not instead of it). |

### Acceptance criteria — Phase 6 + Phase 8b VERIFIED LIVE 2026-05-10

Karit Coffee wizard E2E (clean catalog hero at `.tmp/NEW HERO IMAGE.jpg`) produced:

- **Phase 6a (PROXY_TIMEOUT retry):** synthesis completed cleanly, no scene timeouts, no manual REGEN needed.
- **Phase 6b (Step 1 offer auto-prefill):** field populated with MarketMind big idea after `SEND TO DIRECTOR`.
- **Phase 6c schema/classification:** narrative-generator emitted ALL FOUR new tag values across the 9 scenes (`"none"` for SCENE_01 + SCENE_03 generic B-rolls; `"avatar"` for character-only; `"both"` for SCENE_05 avatar-holding-bag; `"product"` for SCENE_06 + SCENE_08 bag-only). The CRITICAL ANTI-PATTERN held: SCENE_03 ("pile of dark, over-roasted coffee beans on a rustic wooden table") was correctly tagged `"none"` instead of `"product"` — the same shape that misfired in Phase 5.
- **Phase 6c image preservation:** SCENE_05 ('both' mode) preserved the Karit Coffee label exactly (SPECIALTY LAVOR / Coffee / orange band / Karit / lotus glyph). Product-only scenes (SCENE_06, SCENE_08) preserved hero perfectly. Neil's eyeball: *"they all work!!! I love the result now. Product images across all scenes are consistent! Perfectly copy the hero image we used."*
- **Phase 8b (camera-angle):** code-side ship verified by build + tests baseline. Live wizard re-verification deferred to Neil's next run (would burn 10-15 min + API credits to re-run synthesis just for camera angles).

**Caveat noted:** Neil credited BOTH the clean catalog hero AND the Phase 6c code fix for the product-consistency win. Can't isolate which contributed more without an A/B (lifestyle hero vs catalog hero on same code). Both interventions ship together. Recommend follow-up: add Step 2 UX guidance ("upload clean product shots, no people in frame") so beta cohort gets the best of both.

When Neil runs the next full Playwright wizard E2E with the Flying Barista Blend hero (`.tmp/bukidnon-brew-hero-real.jpg` if the .tmp/ survives, otherwise re-drop):
- **SCENE_07 (avatar+bag):** Hero label preserved — "FLYING BARISTA BLEND" wordmark + winged barista + Espresso MOBIL + Italian flag emblem. Avatar identity-lock still holds.
- **SCENE_06 (intentional B-roll):** Generic stale coffee beans on a textured dark surface — NO replica of the hero photo, NO Caucasian woman, NO Espresso Mobil. Narrative-generator emits `"none"`.
- **SCENE_04, SCENE_09 (bag-only):** Hero label still preserves (regression guard).
- **SCENE_02, SCENE_03, SCENE_05, SCENE_08 (avatar-only):** Avatar identity locks; no product bleed-in.
- **THUMBNAIL:** Continues to preserve hero label (regression guard, separate code path).
- **Step 1 offer field:** Auto-fills from MarketMind's bigIdea or Offer Optimizer's directorPayload after `SEND TO DIRECTOR`.
- **storyboard.json:** Narrative-generator emits `"both"` for SCENE_07-shaped scenes and `"none"` for SCENE_06-shaped scenes.

### Merge gate — Neil's decision

Bundle on `checkout-redesign-preview` HEAD `6c26161` is **code-side beta-ready**. Phase 6d is "surface merge to Neil" — NOT auto-execute. When ready:

```bash
git checkout main
git merge checkout-redesign-preview
git push
```

Shared-state action; explicit go-ahead required. If Neil prefers verify-first, run the next live Playwright wizard against the Flying Barista Blend hero before merging.

### P2 follow-ups (NOT blocking beta)

- ~~**Test suite repair**~~ — **DONE 2026-06-09.** Was 15 failures across 3 files (the original 10 prompt-text assertions, plus 4 EDL tests whose fetch mock predated audio base64-inlining, plus 1 proxy-retry test expecting the legacy `{text}` envelope). Prompt-invariant tests now introspect the `api/_lib/prompts.ts` builders directly; flow-mode mocks return parsed objects; the EDL mock routes blob: fetches. Suite green: 118 passed / 10 skipped-by-design. Every `/goal` can now cite `npm run test` exit 0 (see `workflows/loops.md`).
- **`Step2BusinessInfo` same `useState(data)` anti-pattern:** currently safe by mount-timing (Step 2 mounts AFTER auto-prefill ran). Single-line fix when needed; not currently broken.
- **SCENE 1 hook schema extension:** SCENE 1's `referenceImage` is hardcoded to `"none"`. Latent: if a user's script hook explicitly shows the actual product, the SCENE_07-style fake-label bug returns. Surface if/when seen in a real run.
- **Generate Video module:** intentionally deferred from Phase 5 ("test these 3 modules first"). Not blocked, just gated.

---

## Status as of 2026-05-09 (v1.x bundle E2E sign-off — all 4 image rules PASS, but new P0 logo-carry-through gap blocks beta)

**One commit pushed (`43fa52c` — initial sign-off doc). Phase 4a in-flight: this section corrects two findings after Neil's review of bundle artifacts.** Ran ITEM A (resume-pill in real Chrome) + ITEM B (Playwright wizard E2E with hero photo upload). All 4 v1.x scene-image rules now PASS clean (initial eval had SCENE_06 wrong — pulled back). **Real beta blocker is a separately-surfaced finding: focal-point bag scenes drop the uploaded hero photo's brand label**, regenerating the bag from scratch with no logo. SCENE_04 B-roll proves the model CAN carry hero through (preserved gibberish text), so this is a structural prompt-pipeline gap, not a model limitation. Plus the SCENE_02/SCENE_05 timeouts, now scoped as a fix not just a finding.

### What ran today

- **ITEM A — resume-pill in real Chrome.** Hard-refresh mid-Step-3, sign back in, click DIRECTOR card → `// PREVIOUS_SESSION_DETECTED` pill renders correctly with `[ RESUME ]` button + IndexedDB row visible for user UUID. **Closes the v1.x P0 spike from 2026-05-08 late-late-evening's item #9** — Playwright-MCP context had separate IDB origin semantics from real Chrome; not a real bug.
- **ITEM B — full Director wizard E2E via Playwright MCP** (TESTIMONIAL + Bukidnon Brew + 9:16 + Filipino female avatar Kaye + uploaded hero photo). Synthesis batch produced 5 of 7 storyboard scenes; SCENE_02 and SCENE_05 hit 55s `PROXY_TIMEOUT`. Bundle artifacts saved to `.tmp/run-2026-05-09/` (avatar, scene PNGs, full-page screenshot, REVIEW_SUMMARY.md).
- **Bonus signal:** all 4 v1.x script-side fixes from c45c018 visible in this live run, beyond regression-harness verification — script body opens `"Ako si Kaye."`, CTA uses `"Click below"` (not "link sa bio"), full offer carries (`"limited batch at libreng shipping sa order"`), Discovery uses verb-completion (`"Hanggang sa natuklasan ko..."`).

### v1.x scene-image rules — rule-by-rule verdict

| # | Rule | Verdict | Evidence |
|---|---|---|---|
| 1 | AVATAR_CAMERA_ANGLES (≥ frontal-ish bias) | **PASS** | SCENE_03 frontal, SCENE_06 3/4 frontal. No side-profile drift. (Sample limited — SCENE_02 was the third avatar scene + timed out.) |
| 2 | IDENTITY_LOCK (hair + wardrobe match Step 4) | **PASS clean** | SCENE_03 + SCENE_06 both show shoulder-length wavy brown hair worn DOWN, beige collared sweater. The hair-down-vs-tied-up drift Neil flagged on the prior run is fixed. |
| 3 | FACE_TO_CAMERA (eyes + mouth visible on scriptLine scenes) | **PASS** *(corrected)* | SCENE_03 ✅ eyes open + smiling. SCENE_06 ✅ — narrative-driven sensory beat (`"warm golden hour glow, scenting the aroma, eyes closed in appreciation"`) is intentional storytelling, not a rule violation. The FACE_TO_CAMERA rule should yield to narrative when the scene is *about* the closed-eyes moment. Initial eval was too literal-rule-bound; corrected per Neil's review. |
| 4 | BAG_ORIENTATION_RULE (front of bag faces camera) | **PASS clean** | SCENE_01_END, SCENE_03, SCENE_04, SCENE_07 all show bag front-facing. Brand-new rule from c45c018 is firing correctly across all 4 product-bearing scenes. |

### P0 finding (separately surfaced) — Logo carry-through dropped on focal-point bag scenes

The 4 v1.x scene-image rules all pass — but a different, structural gap emerged that **does** block beta. Pattern across the 5 successful scenes:

| Scene | Bag visible? | Hero logo preserved? |
|---|---|---|
| SCENE_01_END | focal point on coaster | ❌ blank kraft, no label |
| SCENE_03 | held by avatar Kaye | ❌ fake `"250g + bean illustration"` generated |
| **SCENE_04** | **incidental B-roll behind mug** | ✅ **hero `"Coffee"` wordmark visibly preserved** (even with gibberish text) |
| SCENE_07 | centered hero shot | ❌ blank white label panel |

**Pattern:** focal-point bag scenes regenerate the bag from scratch (no logo). B-roll preserves hero through context-attachment. **SCENE_04 is the control** — proves the model CAN carry hero text when the bag isn't the prompt's focal point.

**Hypothesis (from Phase 4 code map):** the storyboard schema at [services/geminiService.ts:1544-1545](../services/geminiService.ts#L1544-L1545) outputs `"referenceImage": "avatar" | "product"` (singular). Avatar+product scenes can only carry ONE reference. SCENE_03 (avatar holding bag) tags as `"avatar"` → `getReferenceData()` at [components/Step5Storyboard.tsx:102-120](../components/Step5Storyboard.tsx#L102-L120) only passes the avatar URL → the bag has no hero anchor → model regenerates it. `generateSceneImage` at [services/geminiService.ts:1609-1617](../services/geminiService.ts#L1609-L1617) ALREADY accepts both refs as `inlineData`; the bottleneck is the schema and the data plumbing, not the image-gen call itself.

**Implication for beta:** beta cohort is Filipino SMB owners uploading their REAL product with their REAL brand logo. Scenes generated WITHOUT their brand on focal-point shots break the entire value prop. **This is a real blocker.**

**Fix path (Phase 4d in the plan):** expand schema enum to include `"both"`, update `getReferenceData()` to plumb both URLs when needed, rephrase `NO_LOGO_HALLUCINATION` away from "do not render any logo" toward "preserve uploaded label exactly." Tuned-file edit, requires `grill-me`.

**Validation gate first (Phase 4b):** re-test with a real-label hero photo before any prompt edit. SCENE_04 evidence is strong but circumstantial; the re-test confirms the schema-extend fix is the right shape (vs. a narrower text-only fix if real labels survive).

### Synthesis-reliability findings (now in scope as fixes, Phase 4c)

1. **2 of 7 scenes hit 55s `PROXY_TIMEOUT`** — SCENE_02 (Kaye rubbing temples at desk) and SCENE_05 (hands pressing zip-seal close-up). **Both are hand-detail-heavy.** Other avatar scenes with relaxed hand poses (SCENE_03 holding bag, SCENE_06 cupping mug) succeeded. Sample is small but the pattern is suggestive — model spends extra latency on detailed hand poses, especially when paired with the uploaded reference photo.

2. **No per-scene REGEN button on failed scenes.** Confirms the open punch-list item (Step5Storyboard.tsx — REGEN only renders when `imageUrl` exists; failed scenes only show UPLOAD). Beta users will hit this and have no in-flow recovery.

3. **Label inconsistency across product-bearing scenes.** SCENE_01_END = blank kraft, no label. SCENE_03 = white label panel with bean illustration + "250g" text. SCENE_04 = leaked gibberish text from hero photo (`"Coffee" + "TWEN LADET FOUM"`-style nonsense). SCENE_07 = blank white label panel. Three different label treatments across one ad. Beta cohort will read it as "the product changes mid-ad."

4. **NO_LOGO_HALLUCINATION partial leak** when hero reference photo contains AI-gibberish text. Most scenes correctly suppress brand text; SCENE_04 inherited the seed photo's nonsense.

### Decisions to make before merge to `main`

The 4 v1.x rules pass clean, but the logo-carry-through P0 + the SCENE_02/SCENE_05 timeouts are real beta blockers. Plan-mode-approved sequencing (see `~/.claude/plans/continuing-from-2026-05-08-wizard-splendid-volcano.md` Phase 4):

| Phase | What | Cost |
|---|---|---|
| **4a (in-flight)** | Doc correction commit (this section) | ~10 min, no code |
| **4b** | Validate logo hypothesis via real-label hero re-test (Neil drops a real product photo, regenerate SCENE_03 + SCENE_07 + SCENE_01_END) | ~15 min |
| **4c** | UX/timeout fixes — `retryWithBackoff` broaden to include PROXY_TIMEOUT + per-scene GENERATE button on failed scenes (no grill-me; transport + UI only) | ~30 min |
| **4d** | Logo carry-through fix — schema extend `referenceImage` to `"both"`, plumb both refs, rephrase `NO_LOGO_HALLUCINATION` (TUNED file, needs grill-me) | ~1 hour |
| **4e** | Surface merge-to-main decision to Neil | 0 — Neil's explicit go-ahead required |

**Bundle is NOT beta-ready until 4d ships.** Merge gate is Neil's call after Phase 4 lands.

### Files saved for review

```
.tmp/run-2026-05-09/
├── REVIEW_SUMMARY.md       — full rule-by-rule report + bundle decision tree
├── avatar.png              — Step 4 reference (Filipino female, hair down, beige sweater)
├── step5-progress.png      — full-page Step 5 screenshot showing all 7 scene cells
└── bundle/                 — extracted Creative_Director_Assets.zip
    ├── scene_1_start.png   — instant packet → trash bin
    ├── scene_1_end.png     — kraft bag on coaster + beans
    ├── scene_3_start.png   — Kaye holding bag, smiling, frontal
    ├── scene_4_start.png   — French press pour + bag in BG (gibberish leak)
    ├── scene_6_start.png   — Kaye smelling mug, eyes closed (intentional sensory beat)
    └── scene_7_start.png   — hero bag shot
```

### Cafe-PC reboot reminders (unchanged)

- All commits on `checkout-redesign-preview` are pushed to origin — durable across reboot.
- `.tmp/` files do NOT survive across reboots. If you want the screenshot bundle persisted, commit it now (gitignored by default).
- Branch is **`checkout-redesign-preview`**, not main. HEAD is `c45c018` (v1.x bundle). 25 ahead of main, 4 behind in unrelated docs.
- If `node_modules/` missing on next session: `npm install`.
- Run `.\scripts\restore-git-identity.ps1` if `git commit` fails with "Author identity unknown".
- Run `.\scripts\restore-playwright-mcp.ps1` if Playwright MCP needed (requires VS Code restart — kills active Claude Code conversation; do at session start).
- `.env` `GEMINI_API_KEY` confirmed present and valid (`AIza...BZqA`, 39 chars).

---

## Status as of 2026-05-08 late-late-evening (full Director AI wizard E2E smoke — both formulas — v1.x bundle expanded)

**Working tree clean. No new commits.** Pure verification session. Drove the full 8-step wizard end-to-end via Playwright MCP for both `MrBeast` and `TESTIMONIAL` formulas using a real account, real Supabase session, real Gemini API calls. **Pipeline works end-to-end on both formulas.** State propagation confirmed (Step 3 manual edits survive Step 5 paraphrase, persist through Step 8 final script). 9 v1.x carry-forwards identified — all surgical, none blocks beta.

### What ran tonight (post-3a-ship)

- **Full MrBeast wizard E2E** — 8 steps, real Bukidnon Brew product, OFW-wife audience, hero image upload, ~$0.80 in image gen. CMO-graded the script (A−), CD-graded the avatar (A) + storyboard (A) + thumbnail (A).
- **Full TESTIMONIAL wizard E2E** — also 8 steps, same inputs. Generated **8 scenes** (vs. MrBeast's 6 — TESTIMONIAL produces longer body, more beats). CMO-graded both attempts at Step 3.
- **Stochastic variance evidence:** Two TESTIMONIAL Step 3 runs with identical inputs produced different outputs. Run 1 had full offer in CTA (`"free shipping at ebook"`) but missed name self-intro. Run 2 had `"Ako si Nena"` (Intro spec ✓) but dropped the recipe ebook from CTA. The prompt is **not enforcing all rules consistently** — needs hardening.
- **Memory updated** — `feedback_mrbeast_thumbnail_evolution.md` saved per Neil's correction: drop the "3-5 word headline overlay" rule from CD skill. 2024+ MrBeast pattern is no overlay or 1-3 word context tag only; ad headline UI carries words anyway.

### v1.x prompt + UX bundle (9 items, ~120 lines surgical edit total)

All in `services/geminiService.ts` (TUNED file — needs explicit user approval per services/CLAUDE.md, which Neil has now given for this list). Same surgical territory as the offer-softening fix already on the v1.x roadmap. Could ship as one bundled commit with regression harness + new UI tests verifying.

| # | Issue | Fix location | Severity |
|---|---|---|---|
| 1 | TESTIMONIAL CTA softening (carries scarcity, drops value-adds) | `geminiService.ts` TESTIMONIAL CTA beat anchor | v1.x P1 |
| 2 | MrBeast CTA also softening | `geminiService.ts` MrBeast CTA beat anchor | v1.x P1 |
| 3 | "Link sa bio" → ad-native CTAs (banned phrase + required pattern) | `geminiService.ts` MrBeast + TESTIMONIAL CTA blocks | v1.x P1 |
| 4 | Speaking-scene `FACING_CAMERA_REQUIRED` rule (Scenes 02/06 in MrBeast were eyes-closed/looking-away despite delivering script lines — breaks lip sync if voiced) | `geminiService.ts` `generateStoryboard` visual prompt anchor | v1.x P1 |
| 5 | Identity Lock hair/wardrobe extension (SCENE_03 hair came down vs. Step 4 tied-up) — extend to hair OR pass Step 4 avatar as visual reference into every scene gen | `geminiService.ts` Identity Lock spec | v1.x P1 |
| 6 | Per-scene progress UX in Step 5 (synthesis was 9 min sequential with only generic placeholder — abandonment risk for Bryan; add `3/6 SYNTHESIZED` chip + ETA + cancel) | `components/Step5Storyboard.tsx` | v1.x P1 |
| 7 | TESTIMONIAL Intro name-tag enforcement (the upgrade landed but only fired in 1 of 2 stochastic runs — needs hard `REQUIRED:` anchor) | `geminiService.ts` TESTIMONIAL Intro beat anchor | v1.x P1 |
| 8 | **Formula-swap doesn't invalidate downstream cache** — Step 2 → swap formula → Step 5 still shows old scene cards | `App.tsx` wizard state — when `scriptType` changes, dump downstream | UX bug, v1.x |
| 9 | **Page refresh wipes wizard state without resume-pill recovery** — `// PREVIOUS_SESSION_DETECTED` should fire after refresh but didn't tonight. Could be P0 if real users lose work; needs investigation in `services/wizardSessionStore.ts` | wizardSessionStore + App.tsx | **Possibly P0** — investigate before beta |

**Optional follow-up:**
- Step 2 PROCEED gating UX — default aspect ratio to 9:16 OR show visual cue when none selected
- `logoImageUrl` wiring into product-only B-roll scenes (SCENE_04 type — no avatar, no hand-occlusion). Audit whether it's actually missing first; the BRAND_MARK slot exists in CinematicSpecStudio but may not propagate to storyboard gen

**Dropped (per memory + Neil's correction tonight):**
- ~~"Step 6 client-side text overlay layer"~~ — outdated MrBeast playbook. Modern MrBeast skips overlays for ads; platform's headline UI carries words.

### What worked exceptionally well (do NOT touch in v1.x)

1. **Step 3 → Step 5 → Step 8 propagation.** Manual CTA edits in Step 3 survive Step 5 paraphrase and show up in Step 8 final script verbatim or near-verbatim. State persistence works.
2. **Hero image AI analysis flows downstream.** Step 2's auto-generated description ("rustic, minimalist packaging, soft natural lighting, calm and inviting") visibly fed into Step 5 scenes — every scene leaned into that warm earthy palette.
3. **Hero image visual style propagates to thumbnail.** TESTIMONIAL thumbnail showed the kraft bag with the same cursive `Coffee` wordmark from the uploaded hero. AI is honoring the visual reference correctly without hallucinating brand text.
4. **Identity Lock holds across most scenes.** Step 4 → Step 5 (most scenes) → Step 6 thumbnail = same person. Only known break: SCENE_03 hair detail in MrBeast run.
5. **Audience register richness across both formulas.** "Habang tulog pa ang mga bata" / "habang nasa abroad si mister" / "naghihintay ng chat" / "parang yakap ni mister" — the prompt's audience-register injection is doing real work.
6. **MrBeast formula structure preserved through 6 scenes; TESTIMONIAL through 8 scenes.** Beat-to-scene mapping reads cleanly in both formulas.
7. **3a JWT refresh** continues to work silently — no auth interruptions tonight despite ~30+ Gemini calls and a JWT-expiry-edge-case scenario triggered by long sequential image gen waits.

### Verification artifacts (ephemeral)

`.playwright-mcp/wizard-smoke/` — ~30 screenshots + 1 walkthrough.md. Per Neil tonight: **wipe before reboot, do not commit.** Real-time review was the verification — durable artifacts not needed beyond session.

### Decisions made tonight (non-obvious)

1. **MrBeast thumbnail playbook is stale.** Saved to memory as `feedback_mrbeast_thumbnail_evolution.md`. CD skill should NOT mark down thumbnails for missing 3-5 word overlay text. 2024+ MrBeast = pure visual or 1-3 word context tag only.
2. **TESTIMONIAL is the better formula for OFW-wife archetype.** Both CMO grades returned A−, but TESTIMONIAL's first-person voice + CTA cleanliness (when prompt cooperates) + denser audience-world mental pictures fit the proof-driven OFW-wife buyer better than MrBeast's narrator-distance.
3. **Stochastic variance is real and significant.** Same prompt + same inputs produces materially different scripts on different runs. v1.x prompt fixes need to make rule enforcement CONSISTENT, not just hope for one good roll. Hard `REQUIRED:` anchors with verbatim examples beat soft "should include" phrasing.

### Cafe-PC reboot reminders (unchanged from earlier today)

- All commits ahead of `main` are pushed to origin — durable across reboot.
- Branch is **`checkout-redesign-preview`**, not main.
- If `node_modules/` missing on next session: `npm install`.
- Run `.\scripts\restore-git-identity.ps1` if `git commit` fails with "Author identity unknown".
- Run `.\scripts\restore-playwright-mcp.ps1` if Playwright MCP needed for browser-level testing again. **Important:** registering it requires VS Code restart which kills the active Claude Code conversation, so do it at session start.
- The regression harness needs `GEMINI_API_KEY` in `.env` (server-side, no `VITE_` prefix). Already configured.

---

## Status as of 2026-05-08 late-evening (3a JWT auto-refresh shipped — 2026-05-06 polish bundle FULLY CLOSED)

**Working tree clean. 1 commit pushed on top of evening's 7. Branch is 9 ahead of `main`, in sync with origin.** Final deferred item from the 2026-05-06 polish bundle is now in. Beta-cohort UX no longer breaks when a Supabase JWT expires mid-call.

### Pushed this late-evening session (1 commit)

```
3a358cd  feat(auth): silent JWT refresh + 401 retry in proxyCall (3a)
```

### What shipped

| What | Where it lives | Purpose |
| --- | --- | --- |
| **3a — silent JWT refresh + 401 retry** | [services/geminiService.ts](../services/geminiService.ts) `proxyCall`, `refreshAccessToken`, `proxyFetch` | On 401 from `/api/gemini/*`, `proxyCall` calls `sb.auth.refreshSession()` once and replays the original request with the new bearer — user sees zero error, wizard flow uninterrupted. Concurrent expired calls dedupe through a module-level in-flight promise so N parallel 401s trigger ONE refresh round-trip, not N. On genuine refresh failure (refresh token expired / network down), `sb.auth.signOut()` flips `onAuthStateChange` at [App.tsx:191](../App.tsx#L191) so the user is routed back to auth — wizard persistence row in Supabase is **untouched** (no `clearSession` call), so [RESUME] still works after re-auth. Pure transport-layer change; prompts/schemas/model IDs in tuned `geminiService.ts` untouched. |
| **Unit coverage on the new transport** | [tests/unit/geminiService.proxy.test.ts](../tests/unit/geminiService.proxy.test.ts) | 3 cases: (1) 401 + valid refresh → retry once with new bearer, return 200 silently, refresh called exactly once, fetch called twice with different `Authorization` headers; (2) 401 + failed refresh → `signOut()` called + `NOT_AUTHENTICATED` rejection; (3) 200 happy path → no refresh attempted (regression guard). Mocks `supabaseClient` at the same boundary the existing schema tests use. |

### Surgical-edit principle held

- **`App.tsx`, `ErrorBoundary.tsx`, `supabaseClient.ts` not touched.** The existing `onAuthStateChange` listener already flips `isAuthenticated=false` on `SIGNED_OUT`, which routes to the auth screen via the existing render logic at App.tsx:472. No new ErrorBoundary fallback was needed.
- **Prompts, schemas, model IDs untouched** in `geminiService.ts` (CLAUDE.md tuned-file rule respected). Only `proxyCall` + 2 new helpers + the in-flight promise lock.
- **No `clearSession` on refresh-fail.** Distinct from the explicit user-clicked Sign Out at App.tsx:300 (which clears the persistence row). Refresh-fail leaves the row intact so the user can re-auth and resume.

### Verification

- `npm run build` — green (tsc + vite, 1.51s)
- `npm test` — 23 passed / 8 skipped (was 20+8 pre-edit; +3 new proxy tests)
- Regression — `$env:RUN_REGRESSION='1'; npx vitest run tests/regression/script-gen.regression.test.ts --reporter=verbose` — 8/8 passed live against Gemini (45s, all 4 product categories × 2 formulas, no prompt drift from transport refactor)
- Manual browser smoke (clearing localStorage to force a 401): **deferred to user** — CLI agent on cafe PC can't drive a browser. Unit tests cover the same code path; live token-clearing is the user's check.

### Open follow-ups (post-tonight)

**Pre-beta blockers: NONE.** 2026-05-06 polish bundle (3a/3b/3c/3d/3e/3f) + Step 2 consolidation (3g) all shipped + tested. Branch is shippable to beta cohort.

**Carry-forwards (deferred to next session):**
- **TESTIMONIAL CTA offer-integration tightening** (v1.1, ~5-line surgical edit). Add scarcity-word + value-add VERBATIM anchor. Use regression harness to verify before/after.
- **`logoImageUrl` audit** — is the Cinematic Studio `SLOT 5: BRAND_MARK` actually delivering value? Audit separately before deciding to drop.

**P1 from prior session, still open:**
- **Module name audit completion** — Generate Video, Image Ads Gen `MORE_MODULES` descriptions still engine-y. UI nav labels updated; module-detail copy may not be.
- **In-progress modules to fully ship** — Signal Modulator + Edit Video need admin-gate removal + production-ready release before they can move out of Beta.

**P2 from prior session:**
- **Landing + Pricing 7-step claim** — Gated on Signal Modulator + Edit Video shipping for non-admin users.
- **Wizard ↔ Dashboard journey unification** — Long-term Jobs-aligned restructure. Defer until real beta data.

**P3 cleanup:**
- Other non-billing SPA rewrites in `vercel.json` (`/pricing`, `/terms`, `/privacy`, `/refund`, `/support`, `/app`).

### Next session starting point

If beta cohort is being prepped: nothing blocks. Run the regression harness as a final smoke before pushing to cohort. The branch can merge to `main` and ship.

If post-beta data flags TESTIMONIAL CTA softening: 5-line v1.1 fix on the CTA prompt anchor; use the regression harness to verify before/after.

If the next session targets the deeper UX restructure: Wizard ↔ Dashboard unification is the largest open Jobs-aligned bet, but it should wait for real beta usage data before committing to a direction.

### Cafe-PC reboot reminders

- **All 8 commits ahead of `main` are pushed to origin** — durable across reboot.
- Branch is **`checkout-redesign-preview`**, not main.
- If `node_modules/` missing on next session: `npm install`.
- Run `.\scripts\restore-git-identity.ps1` if `git commit` fails with "Author identity unknown".
- The regression harness needs `GEMINI_API_KEY` in `.env` (server-side, no `VITE_` prefix). Already configured.

---

## Status as of 2026-05-08 evening (3e wiring + Step 2 consolidation + regression harness — pre-beta polish bundle DONE)

**Working tree clean. 7 commits pushed to `checkout-redesign-preview` this evening (on top of morning's 7). Branch in sync with origin.** Largest single-session prompt-engineering shift since Director AI's beta-readiness fix sprint. Pre-beta polish bundle from the 2026-05-06 session is now FULLY shipped (3a JWT remains the only deferred item from that bundle). On top of that, the **biggest strategic win:** every required wizard field now actually fires in the script generation prompt, validated across 4 widely-different product categories.

### Pushed this evening session (7 commits)

```
c7fc94a  test(regression): add 3 stress-test product categories — Service/Skincare/Gym
2c6b16d  feat(step2): consolidate goal+problem into benefit+painPoint with deeper labels (3g)
55cf40c  test(regression): add Gemini-direct script-generation regression harness
651a993  fix(mrbeast): tighten Identity beat + harden Hook anti-demographic anchor
5357780  fix(testimonial): restore Hook generation — Intro verbosity starved beat 0
a2df8c6  feat(beta-polish): wire offer/separator/audience + drop services (3e/3f)
1321e2b  feat(beta-polish): nudge suppress + TEMU gate + Sonner restyle (3b/3c/3d)
```

### What shipped / decided this evening

| What | Where it lives | Purpose |
| --- | --- | --- |
| **3b/3c/3d quick wins** | [App.tsx](../App.tsx) (nudge suppression), [Step2BusinessInfo.tsx](../components/Step2BusinessInfo.tsx) (TEMU gate `// COMING_IN_V1.1`), [index.tsx](../index.tsx) (Sonner `theme="dark"` + `unstyled` + classNames per variant) | Resume pill + Pro Tip nudge no longer collide. TEMU disabled with corner label until v1.1 re-spec ships. Toaster matches `// PREVIOUS_SESSION_DETECTED` pill aesthetic instead of sonner default white. |
| **3e wiring — the dormant bridge BUILT** | [services/geminiService.ts](../services/geminiService.ts) `generateAdScript`, [components/Step3AdScript.tsx](../components/Step3AdScript.tsx), [App.tsx](../App.tsx) | `clientDetails.offer`, `businessInfo.separator`, `businessInfo.audience` were all REQUIRED wizard fields that geminiService **completely ignored** before today. Wired per the 2026-05-06 slotting matrix: offer → CTA beat (scarcity + value-adds, never bare price); separator → Result+Proof / Proof beats ("Hindi tulad ng iba — kami X" pattern); audience → COMMON_RULES AUDIENCE REGISTER bullet (vocab + idiom + mental imagery + Visual Payoff in audience's WORLD). |
| **3f services field DROPPED** | [types.ts](../types.ts), [App.tsx](../App.tsx) state/reset, [Step1ClientDetails.tsx](../components/Step1ClientDetails.tsx) | Step 1 went from 3 fields to 2 (brandName + offer only). `clientDetails.services` was a required textarea that no service consumed. **Spec correction logged:** `logoImageUrl` was supposed to drop in 3f too, but it's actively used by [CinematicSpecStudio.tsx:51,411](../components/CinematicSpecStudio.tsx#L51) (`SLOT 5: BRAND_MARK`). Skipped, filed as separate audit. |
| **CMO-upgraded TESTIMONIAL Intro + Hook anchor** | `geminiService.ts` TESTIMONIAL block | Intro went from `"Human introduction."` (3 words, name-tag output) to persona+wound+open-loop with 3 audience-pattern examples in appendix. Speakers now produce e.g. `"Ako si Elena. Tatlong taon na sa Saudi ang asawa ko."` instead of subject-less fragments. |
| **CMO-upgraded MrBeast Identity beat** | `geminiService.ts` MrBeast block | Identity went from `"Relatable audience statement."` (3 words, vague output) to direct-address with `ka`/`mo`/`tayo` + audience-world reference + 3 examples in appendix. Speakers now produce e.g. `"Pag-uwi galing office, diretso higa na lang sa sobrang pagod"` instead of `"Sa gising na maaga, malayo sa mga bata"` (subject-less stage direction). |
| **Hook anti-demographic-label anchor (both formulas)** | `geminiService.ts` Hook beats | Banned: `"para sa mga OFW"`, `"sa mga moms"`, `"for OFWs"`. Hooks must derive curiosity from situation/visual, not audience tag. |
| **Step 2 consolidation** | [types.ts](../types.ts), [App.tsx](../App.tsx), [Step2BusinessInfo.tsx](../components/Step2BusinessInfo.tsx), `geminiService.ts`, [IntelligenceUplink.tsx](../components/IntelligenceUplink.tsx) | Dropped `goal` + `problem` from `BusinessInfo` (each fired in only ONE formula — half-orphans). Renamed `benefit` → **`Dream Result`** (placeholder: Taglish-native "Wakes up energized, naka-2 hours back every morning, mas chill ang pasok sa work"). Renamed `painPoint` → **`3 AM Worry`** (placeholder: "3 AM, hindi makatulog kasi tuition deadline na bukas — wala pang pera"). Required fields went from 8 to 6. TESTIMONIAL Before Story now agitates `painPoint` instead of `problem`; Transformation now lands at `benefit` instead of `goal`. CMO-locked via grill-me 3-question protocol. |
| **Regression harness — kills the manual UI loop** | [tests/regression/script-gen.regression.test.ts](../tests/regression/script-gen.regression.test.ts) | Vitest test, gated by `RUN_REGRESSION=1` env var (default `npm test` skips). Mocks Supabase auth + stubs global fetch to route `/api/gemini/text` straight to `@google/genai` SDK using `GEMINI_API_KEY` from `.env`. Same prompt construction code path as production. Replaces the 5-min-per-iteration "open localhost, sign in, fill 8 fields, screenshot script" loop with a 5-second CLI run that prints full JSON. **Run command:** `$env:RUN_REGRESSION='1'; npx vitest run tests/regression/script-gen.regression.test.ts --reporter=verbose` |
| **Stress-test expansion (4 product categories)** | Same regression file | 8 tests across Bukidnon coffee + MalinisPH cleaning + Glaze PH skincare + BulkPH Coach gym. Probes whether the prompt's hardcoded archetype examples (OFW family / Filipino mom / Corporate) generalize. **They do.** Model produced 4 distinct speaker personas across 4 categories with no archetype copy-paste leakage. |

### Strategic decisions made this evening

1. **Phrasing locked via grill-me + CMO verification.** Three open questions from the 2026-05-06 session resolved:
   - Q1: `clientDetails.services` → DROP (overlapped with `businessInfo.product`, no slot in matrix, slotting matrix already covered service businesses through existing fields). Hypothesis that "Market Research auto-fills services" was tested in code — no scaffolding exists, phantom feature.
   - Q2: empty-field fallback rules → silent generic fallback in geminiService (form gate already prevents empty in normal flow; fallback is belt-and-suspenders for persistence-restore edge case).
   - Q3 (audience register-tuning): SPEC CORRECTION — line 564 referenced in 2026-05-06 spec is actually in `generateMarketResearch` (MarketMind module), not `generateAdScript`. **Don't touch line 564.** Real fix lives in `COMMON_RULES` block.

2. **CMO pushback on the slotting matrix accepted.** Original matrix said audience is "register only, never content." CMO read: too academic. Audience should also shape MENTAL PICTURES — the world the script lives in. Result beat / Visual payoff lands in the audience's WORLD (OFW reunion at NAIA, mom's school dropoff, corporate Friday 6PM logout) — not generic "happy moment." Updated AUDIENCE REGISTER bullet includes this.

3. **CMO pushback on Intro examples accepted.** Original Intro examples were name-tags ("Ako si Mark, OFW dad, 5 years sa Saudi"). CMO upgraded to name + life context + **the wound's first hint** + open loop ("...pero may isang bagay na halos natalo ako"). Tested live: model copies the upgraded pattern (Bukidnon TESTIMONIAL Intro: `"Ako si Elena. Tatlong taon na sa Saudi ang asawa ko."` — open-ended, pulls into beat 2).

4. **Step 2 consolidation labels CMO-locked.** "Dream Result" and "3 AM Worry" beat alternatives like "Main Benefit/Outcome" and "Bleeding Neck Pain." Reasoning: labels load-bear more than placeholders — Bryan reads the label once and writes accordingly. "Dream Result" pulls toward Sabri Suby Magic Genie wish without naming the framework. "3 AM Worry" cues visceral 3 AM moments without academic jargon.

### Live regression evidence (8 tests across 4 product categories)

Full output committed in `c7fc94a` test artifact. Highlights:

- **Bukidnon Brew + OFW-wife audience:** TESTIMONIAL Intro `"Ako si Elena. Tatlong taon na sa Saudi ang asawa ko."` ✓; MrBeast Identity `"Tuwing umaga, kahit malayo siya, kape ang nagpaparamdam."` ✓
- **MalinisPH + BGC professional audience:** TESTIMONIAL Intro `"Ako si Miggy, laging 12 hours sa Makati office."` ✓; MrBeast Identity `"Pag-uwi galing office, diretso higa na lang sa sobrang pagod."` ✓
- **Glaze PH + skincare-frustrated millennial audience:** TESTIMONIAL Intro `"Ako si Kaye, naubos sweldo ko sa mahal na facial sessions."` ✓; MrBeast Identity `"Pagod na pagod na kaka-skincare pero acne mo nandyan pa."` ✓
- **BulkPH Coach + Pinoy gym-bro audience:** TESTIMONIAL Intro `"Ako si JC. Tatlong taon nang nagbubuhat, pero walang pagbabago sa katawan."` ✓; MrBeast Identity `"Naka-three years ka na sa gym pero stuck ka pa rin."` ✓

**Generalization confirmed.** No category copied OFW/mom/corporate prompt examples literally. The 3 AM Worry framing carried into Before Story content for skincare AND gym, not just OFW-coffee.

### One soft spot identified for v1.1 (NOT a beta blocker)

**TESTIMONIAL CTA softens offer scarcity.** Across 4/4 TESTIMONIAL stress tests, the CTA dropped or softened the offer's scarcity language:

| Brand | Offer input | TESTIMONIAL CTA output | Dropped |
| --- | --- | --- | --- |
| Bukidnon Brew | First 50 + free shipping + recipe ebook | `"first 50 may free shipping pa"` | recipe ebook |
| MalinisPH | First 20 + 50% off + free deep clean | `"subukan niyo rin ito"` | **everything** |
| Glaze PH | First 100 + free derm consult + assessment | `"first 50 orders may free skin consultation pa"` | "100"→"50", assessment |
| BulkPH Coach | First 30 + 25% off + free meal plan | `"limited slots lang ang natitira"` | "30", "25%", meal plan |

Root cause: TESTIMONIAL CTA prompt anchor says `"WARM recommendation tone (not direct-sell)"`. Warmth wins over scarcity. **MrBeast carries offers cleanly** in all 4 cases. v1.1 fix: tighten TESTIMONIAL CTA with explicit "REQUIRED: at least one scarcity word + one value-add MUST appear verbatim" anchor. ~5-line surgical edit. Not a beta blocker — TESTIMONIAL CTAs land naturally, just less hard-sell.

### Open follow-ups (post-tonight)

**Pre-beta blockers (none — bundle is shippable):**
- ✅ All polish-bundle items 3b/3c/3d/3e/3f shipped + tested.
- ✅ Step 2 consolidation (3g, new this evening) shipped + tested.
- ✅ Regression harness exists for all future prompt-tuning iterations.

**Carry-forwards (deferred to next session):**
- **3a — JWT auto-refresh + 401 error boundary** (~half day, code-heavy, independent of prompts). The only item from the 2026-05-06 polish bundle still open. Auth interruption mid-call still surfaces `PROXY_ERROR_401` to the user; persistence preserves state but they manually re-auth + click `[ RESUME ]`. Touches `services/supabaseClient.ts` + auth flow + `App.tsx` ErrorBoundary. CLAUDE.md NOT-tuned territory.
- **TESTIMONIAL CTA offer-integration tightening** (v1.1, ~5-line surgical edit). Add scarcity-word + value-add VERBATIM anchor.
- **`logoImageUrl` audit** — is the Cinematic Studio `SLOT 5: BRAND_MARK` actually delivering value? Different scope from 3f. Audit separately before deciding to drop.

**P1 from prior session, still open:**
- **Module name audit completion** — Generate Video, Image Ads Gen `MORE_MODULES` descriptions still engine-y ("Render final video assets..."). UI nav labels updated; module-detail copy may not be.
- **In-progress modules to fully ship** — Signal Modulator + Edit Video need admin-gate removal + production-ready release before they can move out of Beta.

**P2 from prior session:**
- **Landing + Pricing 7-step claim** — Gated on Signal Modulator + Edit Video shipping for non-admin users.
- **Wizard ↔ Dashboard journey unification** — Long-term Jobs-aligned restructure. Defer until real beta data.

**P3 cleanup:**
- Other non-billing SPA rewrites in `vercel.json` (`/pricing`, `/terms`, `/privacy`, `/refund`, `/support`, `/app`).

### Next session starting point

If beta cohort is being prepped: **3a JWT auto-refresh** is the only remaining polish-bundle item that affects beta UX directly. Half a day. Touches Supabase token refresh + 401 interceptor + re-auth fallback at App.tsx ErrorBoundary. No prompt risk. Independent of everything else.

If beta is shipping immediately: nothing blocks. The bundle from this evening is the cleanest pre-beta state Director AI has been in. Run **`$env:RUN_REGRESSION='1'; npx vitest run tests/regression/script-gen.regression.test.ts --reporter=verbose`** if you want one final smoke check before pushing to cohort — 45 seconds, 8 product/formula combinations.

If TESTIMONIAL CTA softening becomes a real concern post-beta data: **5-line v1.1 fix** on the CTA prompt anchor. Use the regression harness to verify before/after.

### Cafe-PC reboot reminders

- **All 7 commits pushed to origin** — durable across reboot.
- Branch is **`checkout-redesign-preview`**, not main.
- If `node_modules/` missing on next session: `npm install`.
- Run `.\scripts\restore-git-identity.ps1` if `git commit` fails with "Author identity unknown".
- Run `.\scripts\restore-playwright-mcp.ps1` if you want Playwright MCP for browser-level testing (requires VS Code restart after registration — kills active Claude Code conversation).
- The regression harness needs `GEMINI_API_KEY` in `.env` (server-side, no `VITE_` prefix). Already configured.

---

## Status as of 2026-05-08 (Checkout redesign ship + Jobs lens + canonical 7-step flow)

**Working tree clean. 7 commits pushed to `checkout-redesign-preview`. Branch in sync with origin.** This session was a large strategic + tactical batch on top of the prior session's checkout-redesign visual MVP. Two unrelated workstreams ran in parallel: (1) get the checkout preview deploy unbroken and shipping outcome-first copy; (2) bake the Steve Jobs work-backwards filter into the durable doc layer + propagate the canonical 7-step flow throughout the dashboard.

### Pushed this session (7 commits, working tree clean)

```
57eaebb  feat(dashboard): align left sidebar + mobile bottom nav with 7-step flow
4259820  feat(dashboard): expand RECOMMENDED FLOW to canonical 7 steps
364981c  docs(skills+language): Jobs work-backwards filter + canonical 7-step flow
28dd56a  copy(checkout): revert no-auto-renew badge + scope auto-renew workstream
5af2e01  copy(checkout): outcome-first rewrite — Jobs lens + CMO trust stack
6698740  fix(checkout): add /checkout SPA rewrite (404 on direct visit)
2235d2f  fix(checkout): consolidate billing endpoints to clear Vercel 12-fn cap
```

### What shipped / decided this session

| What | Where it lives | Purpose |
| --- | --- | --- |
| Vercel deploy fix (15 → 12 functions) | [api/billing.ts](../api/billing.ts) (NEW, consolidated 4 endpoints into 1 with `?action=` switch); deleted `api/billing/{intent,confirm,ewallet,status}.ts`; updated [services/checkoutService.ts](../services/checkoutService.ts) | Hobby-cap deploy was failing. Now fits the 12-function ceiling. |
| `/checkout` SPA rewrite | [vercel.json](../vercel.json) | Direct-visiting `/checkout` no longer 404s on cold load (mobile, email links, PayMongo redirects). Other non-billing routes still have the same gap — flagged. |
| Outcome-first /checkout copy | [components/CheckoutPage.tsx](../components/CheckoutPage.tsx), [components/checkout/OrderSummary.tsx](../components/checkout/OrderSummary.tsx) | Replaced "40 workflows, 15 reports..." feature list with "Replaces your marketing agency. End-to-end: research, offer, scripts, AI video ads, captions, and images — for an entire month. Walang ₱30K agency, walang freelancer." Added "Just ₱83/day" daily reframe + "7-day money-back guarantee" trust badge. |
| Auto-renew workstream scoped | [workflows/auto_renew.md](auto_renew.md) (NEW, 270 lines) | Founder pivoted from no-auto-renew → YES auto-renew like Claude/OpenAI. Backend doesn't yet support it. Full plan: PayMongo card-on-file integration, Supabase migration, renewal cron, cancel UX, 8 email templates, hybrid model (cards auto-renew, e-wallets manual), pre-merge checklist, 5 open questions. |
| Steve Jobs filter baked into both skills | [.claude/skills/grifon-cmo/SKILL.md](../.claude/skills/grifon-cmo/SKILL.md), [.claude/skills/grifon-creative-director/SKILL.md](../.claude/skills/grifon-creative-director/SKILL.md) | 4 surgical adds each: named as 4th pillar in intro, "outcome before feature" copy/design rule, "no engine names on user-facing surfaces" hard constraint, Cohesive Vision Filter operating rule. Auto-applies in future sessions without re-explaining. |
| Canonical 7-step flow | [UBIQUITOUS_LANGUAGE.md](../UBIQUITOUS_LANGUAGE.md) | New top section: Research → Offer → Director → Video → Voice (Signal Modulator) → Edit → Caption. Bryan-outcome of full chain. Signal Modulator entry rewritten — "consistent character voice per scene" is the actual customer outcome, name flagged as engine-internal. |
| Subscription-copy lesson logged | [agent_lessons.md](../agent_lessons.md) | Don't ship subscription/recurring/trial copy without backend support. Generalizes to "cancel anytime", refund-window, pause-subscription claims. Future-me reads at session start. |
| Dashboard 7-step flow path | [components/Dashboard.tsx](../components/Dashboard.tsx) (RECOMMENDED FLOW block) | Was 5 steps (Research → Offer → Director → Copy → Images), now 7 with Beta badges on Voice + Edit. Image Editor removed from canonical chain (still on Dashboard tiles). Beta steps display-only for non-admin, clickable for admin. |
| Dashboard sidebar + mobile bottom nav | [components/Dashboard.tsx](../components/Dashboard.tsx) (`NAV_ITEMS` const) | Single source of truth for both surfaces. Same 7-step order, same Beta-gating. Mobile nav tightened (`px-1.5`, `text-[9px]`) so 7 items fit ~375px width. |
| Checkout redesign session log | [workflows/checkout_redesign.md](checkout_redesign.md) | Three new dated entries logging the three checkout-redesign fixes from today + the auto-renew direction reversal. |

### Strategic decisions made

1. **Auto-renew direction (founder call):** Reverse from no-auto-renew → YES auto-renew. Implementation deferred to dedicated workstream (auto_renew.md). Tonight's "No auto-renew" trust badge reverted; only the 7-day guarantee badge remains until backend catches up.
2. **Cohesive Vision Filter is now permanent:** Both CMO and CD skills auto-apply the work-backwards filter. Engine names ("Signal Modulator", "Video Synthesis") rejected on user-facing surfaces.
3. **Module renames (UI labels only, internal keys unchanged):**
   - `signal_modulator` UI label: "Signal Modulator" → **"Voice"**
   - `generate_video` UI label: "Video Synthesis" → **"Video"**
   - `edit_video` UI label: "Video Editor" → **"Edit"**
   - `caption_headline` UI label: "Copy" → **"Caption"**
4. **Image Editor dropped from canonical chain:** Still accessible as a CORE_MODULES tile, no longer in primary nav. Director AI handles thumbnails/scenes internally.
5. **Landing + Pricing 7-step claim deferred:** Per CMO HARD CONSTRAINT (working modules only on landing/pricing), can't pitch the full 7-step flow until Signal Modulator + Edit Video are fully shipped. Dashboard surfaces only for now.

### Tomorrow morning's first move

**Decide which of two priority queues to start with:**

- **Queue A: Pre-beta polish bundle (3a–3f)** — from the prior 2026-05-06 session, ~half day remaining. Items 3c (suppress nudge), 3d (TEMU option gate), 3b (sonner toast restyle), 3a (JWT auto-refresh), 3e (offer/separator/audience wiring), 3f (drop logoImageUrl + services decision). Beta launch was the goal of that workstream.
- **Queue B: Auto-renew engineering** — fresh workstream, 2-3 sessions. PayMongo card-on-file → cron → cancel UX → emails. Doesn't block beta launch; LTV optimization for post-launch.

**My recommendation: finish Queue A first.** Three reasons:
1. Already in motion (3 sessions of momentum), don't lose the context.
2. Queue A unblocks **beta launch** which has compounding value. Queue B is post-launch optimization.
3. Queue B also requires the 5 open questions in [auto_renew.md](auto_renew.md) to be answered — defer until you have headspace.

### Pre-clear actions to take BEFORE `/clear`

- ✅ Working tree clean, all 7 commits pushed
- ✅ Session summary committed to launch_readiness.md (this section)
- ⚠️ One open item: smoke-test `/checkout?plan=pro&cycle=monthly` on the live Vercel preview to confirm new outcome copy + 7-day badge render correctly. Browser test before clearing the session loses no work but gives confidence.
- ⚠️ Three open strategic questions from the prior session (still unresolved): `clientDetails.services` (drop or wire?); empty-field fallback rules for blank offer/separator; exact replacement phrasing for audience register-tuning at [services/geminiService.ts:564](../services/geminiService.ts). These block 3e wiring tomorrow — **run grill-me first thing in the next session.**

### Two things to remember when you boot up tomorrow

1. **Cafe-PC reboot wipes everything except git.** Run `npm install` if `node_modules/` is missing, run `.\scripts\restore-git-identity.ps1` if `git commit` fails with "Author identity unknown", run `.\scripts\restore-notebooklm.ps1` if you need NotebookLM MCP back.
2. **Branch is `checkout-redesign-preview`, not `main`.** Production main untouched — grifoncommand.com still serves the old PayMongo hosted page. Switch back: `git checkout checkout-redesign-preview` after `git fetch`.

### Open follow-ups not yet addressed

- **Module name audit (P1):** Generate Video, Image Ads Gen still need their `MORE_MODULES` descriptions updated to outcome-first language (currently still says "Render final video assets from storyboards and prompts" — engine-y). UI nav labels are already updated; module-detail pages may still have old copy.
- **In-progress modules to fully ship (P1):** Signal Modulator + Edit Video need admin-gate removal + production-ready release before they can move out of Beta.
- **Landing + Pricing 7-step claim (P2):** Gated on the in-progress modules shipping. Update copy + visual to claim "7 steps, end-to-end, in one tool" once all 7 are real for non-admin users.
- **Wizard ↔ Dashboard journey unification (P2):** Long-term Jobs-aligned restructure. Defer until real user nav data is available post-launch.
- **Other non-billing SPA rewrites (P3 cleanup):** `/pricing`, `/terms`, `/privacy`, `/refund`, `/support`, `/app` lack rewrites in vercel.json — they only work via in-app navigation today. Adding a catch-all rewrite or explicit entries is a 5-min cleanup task.

---

## Status as of 2026-05-05 (Director AI beta-readiness fix sprint)

Site is live at `app.grifon.ai`. All 7 launch gates closed. Test-mode billing fully proven end-to-end on prod (checkout → PayMongo → webhook → Supabase row → UI tier upgrade). Voice cloning live for Creator+ (`fa1fec1`/`9837d0b`/`66df4ca`/`5855fb3`). Director AI storyboard rules + IDENTITY_LOCK wiring fix proven on Bukidnon Brew + TESTIMONIAL regression runs (2026-05-05 / 2026-05-06). Wizard state persistence shipped + smoke-tested (2026-05-06 evening, smoke pass next morning).

**The next ship is the pre-beta polish bundle.** After that ships and gets bundled-committed, beta launches with **MrBeast + TESTIMONIAL only** to 5–10 hand-picked Filipino SMB owners. TEMU is gated as `// COMING_IN_V1.1` for the cohort.

Live cutover for real money is blocked only on PayMongo merchant verification (Gate 3-prod below).

## Next concrete action — pre-beta polish bundle (~full day)

| # | Item | Files | Status |
|---|---|---|---|
| 3a | JWT auto-refresh + 401 error boundary | App.tsx, services/supabaseClient.ts | Pairs with persistence: state is saved, 401 catch + re-auth makes auth interruption invisible. |
| 3b | Sonner toast restyle (zinc-950 + gold + mono caps) | App.tsx Toaster config | ~5-line theme override. Current white background breaks design system. |
| 3c | Suppress "Run Market Research First" nudge while resume pill is up | App.tsx:563 | 1-line: `&& !showResumePill`. |
| 3d | Gate TEMU option in scriptType picker as `// COMING_IN_V1.1` | components/Step2BusinessInfo.tsx | Prevents broken MrBeast-cosplaying-as-TEMU formula reaching beta. |
| 3e | Wire `clientDetails.offer` + `businessInfo.separator` + `businessInfo.audience` into script generation per the Slotting Matrix | services/geminiService.ts | **CLAUDE.md-tuned, requires grill-me.** ~half day. **Highest-ROI prompt change available pre-beta.** Full brief: [script_input_wiring_brief.md](script_input_wiring_brief.md). |
| 3f | Drop unused `businessInfo.logoImageUrl`. Decide on `clientDetails.services` (drop / wire / park) | components/Step2BusinessInfo.tsx | 5-min UI cleanup once Neil decides on services. |

After all 6 ship: bundled commit, then beta launch.

## Open punch list (post-polish, prioritized)

1. **Beta launch** — MrBeast + TESTIMONIAL only. 5–10 hand-picked Filipino SMB owners. Frame TEMU as "v1.1 first access" reciprocity hook for the beta cohort.
2. **TEMU formula re-spec ship (v1.1, ~1.5–2 days)** — full design brief: [temu_respec_brief.md](temu_respec_brief.md). Grill-me protocol before touching `services/geminiService.ts`. Drop to beta cohort with reciprocity framing.
3. **Failed-scene GENERATE button** ([Step5Storyboard.tsx:478](../components/Step5Storyboard.tsx#L478)). ~5-line UX fix. REGEN button only renders when `imageUrl` exists; failed scenes have no per-scene retry. Pre- or post-beta.
4. **Step 6 tile aspect mismatch** ([Step6Thumbnail.tsx](../components/Step6Thumbnail.tsx)). ~5-line UX fix. Match Step 8's `aspect-[9/16]` / `aspect-video` pattern. Pre- or post-beta.
5. **AVATAR_CAMERA_ANGLES split / intent-awareness** ([services/geminiService.ts](../services/geminiService.ts)). CLAUDE.md-tuned, needs re-grill. ~1 day. Single biggest quality lift — fixes Scene 7 face hallucination class, Scene 2/8 wrong-angle-for-intent class. Post-beta.
6. **TESTIMONIAL prompt LANGUAGE_LOCK + grammar tuning.** CLAUDE.md-tuned, needs re-grill. ~1 hour. Address "barista level," "ro-roast," "nila," "matabang kape."

## Parked / deferred (non-blocking)

| Item | Reason |
|---|---|
| `ImageAdsGen.tsx` + `OrganicCalendar.tsx` wiring fix — same `referenceImageMode` bug, different modules | Outside current test path; Tier 4 cleanup post-beta |
| ChatGPT/Higgsfield-style persistent asset library — Supabase tables, RLS, CRUD, gallery UI | Greenfield multi-day initiative; export-bundle covers beta |
| Multi-scene queueing in GenerateVideo — auto-render all 8 scenes in sequence | Manual scene-chip swap is the v1 UX; beta will tell us if tedious |
| `// 3RD_REGENERATION_DETECTED` soft warning toast | Optional UX nudge; existing per-tier daily quotas (commit `5855fb3`) handle abuse |
| Strategic Audit prompt rewrite — current is generic and self-praising | Quality concern, not a beta blocker |
| 40-second ad length — tighten storyboard prompt to 5-6 scenes (~25-30s ads) | Beta will tell us if length is the bottleneck |
| Wizard input audit follow-up | Superseded for `offer`/`separator`/`audience` by polish-bundle item #3e. Remaining v1.2: instrument Step 1/2 fill-rates per field across beta cohort once #3e ships. Beta data > assumptions. |
| Storyboard prompt rule: max 2 consecutive same-type scenes (CMO-endorsed, Neil parked 2026-06-13 "tomorrow with other pendings") | Kills the testimonial triple-b-roll mid-ad dead zone (scenes 3-4-5 ≈ 18-24s faceless = retention drop). One tuned-prompt line in `api/_lib/prompts.ts` storyboard flow — needs Neil's explicit go since it's tuned. Convert the middle b-roll to a talking reaction beat. |
| Live-verify the 2026-06-13 fix batch (`2e70c5a`…`1ea88e3`) on next FINAL_RENDER | Neil verifying himself: (1) opening line ≤2 English words → whole VO Filipino, (2) captions land ON the spoken word (forced alignment), (3) no repeating SFX tick, (4) recap face-aware + no ₱, (5) watch "swabe" for regression now phonetics are gone. `tools/render_qa.mjs <url>` machine-watches it first. |

## Readiness Gates

| Gate | Status |
|---|---|
| **1: App works (no crashes)** | CLOSED 2026-04-23 — voiceService crash fixed, error boundaries, Director AI rules-of-hooks fix, Gemini key no longer throws at import |
| **2: Real auth** | CLOSED 2026-04-18 — Supabase email/password, session persistence, plaintext password + ALLOWED_EMAILS hardcode removed |
| **3-dev: Billing wired (test mode)** | CLOSED 2026-04-23 — PayMongo hosted-checkout, webhook signature verification, subscriptions table updates, `api/_lib/paymongo.ts` |
| **3-prod: Live billing cutover** | **IN PROGRESS** — blocked only on PayMongo merchant verification. See live cutover steps below. |
| **4: Production-safe code** | CLOSED 2026-04-23 — Zod validation in 8 endpoints, rate limiting in 10 routes, webhook bodyParser disabled for raw signature, cron cleanup for stale Gemini videos |
| **5: Mobile responsiveness** | CLOSED 2026-04-23 — phone-verified live; P1/P2/P3 from 15-finding audit deferred non-blocking |
| **6: Domain + hosting** | CLOSED 2026-05-02 — `grifon.ai` via Vercel registrar, `app.grifon.ai` SSL, env vars set, ICANN verified 2026-05-04 |
| **7: Legal** | CLOSED 2026-04 — Terms / Privacy / Refund / Support pages, effective 2026-04-20 |

### Gate 3-prod live cutover steps

Test-mode plumbing fully proven on prod 2026-05-02 (E2E test purchase activated subscription row in Supabase). Live cutover blocks only on PayMongo merchant verification.

- [ ] PayMongo dashboard: complete merchant verification (Philippine business registration required)
- [ ] PayMongo dashboard: flip to Live Mode
- [ ] Pull live `PAYMONGO_SECRET_KEY` (`sk_live_...`) — only this one is read by code (`api/_lib/paymongo.ts:6`); `PAYMONGO_PUBLIC_KEY` is stored but unused
- [ ] Update `PAYMONGO_SECRET_KEY` in Vercel → Settings → Environment Variables (Production scope)
- [ ] Register live webhook URL `https://app.grifon.ai/api/webhook` in PayMongo Live Mode dashboard, listening for `checkout_session.payment.paid`
- [ ] Copy live signing secret (`whsk_live_...`) → update `PAYMONGO_WEBHOOK_SECRET` in Vercel
- [ ] Redeploy (Deployments → ⋯ → Redeploy, no cache)
- [ ] Test purchase with a real card on Creator tier (₱997); confirm row in Supabase, then refund yourself in PayMongo dashboard
- [x] **Harden `api/webhook.ts` before accepting real-money events** — DONE 2026-06-16 (commit `917fea1`). Signature verification was already solid (`api/_lib/paymongo.ts:161`, HMAC-SHA256 + constant-time compare — forgery does not work). Added the two missing replay defenses: (a) a **freshness window** — reject events whose signed `t=` timestamp is >`WEBHOOK_MAX_AGE_SECONDS` (300s) old or future-dated, via the additive `webhookEventAgeSeconds()` helper; and (b) **idempotency** — skip the upsert when the event id already equals the stored `paymongo_last_checkout_id` for that user (dedupes at-least-once delivery + in-window replays, no new table). 7 new unit tests; build + 18 tests green. Surfaced by `straw-man-audit`.

## Locked design briefs (in-flight)

- [script_input_wiring_brief.md](script_input_wiring_brief.md) — polish bundle item #3e. Slotting matrix for offer / separator / audience across MrBeast / TESTIMONIAL / TEMU formulas.
- [temu_respec_brief.md](temu_respec_brief.md) — v1.1 ship. 7-scene product-drop scaffolding, no avatar, no VO, RAW_OUTPUT_RULE, overlays as data.

## Session archive

Full historical session prose lives in [archive/](archive/). The main file stays thin so post-`/clear` resume is fast.

- [archive/2026-05-04-voice-cloning-ivc.md](archive/2026-05-04-voice-cloning-ivc.md) — voice cloning live, IVC unlock, Signal Modulator polish (Parts 1-4), per-user daily quotas
- [archive/2026-05-05-director-ai-sprint.md](archive/2026-05-05-director-ai-sprint.md) — Step 8 redesign, wizard↔GenerateVideo handoff, Bucket A/B prompt tuning, IDENTITY_LOCK wiring fix, Bukidnon Brew regression partial pass
- [archive/2026-05-06-temu-regression-and-persistence.md](archive/2026-05-06-temu-regression-and-persistence.md) — TESTIMONIAL Run 1 observations, P0 bugs surfaced (camera angles / logo text / hand hallucination / state persistence / JWT expiry), wizard state persistence ship + smoke test plan

## How to use

1. After every session that closes a gate or ships a punch-list item, update this file's tables IN THE SAME SESSION before clearing context.
2. **The `git log` is more authoritative than this file** — when in doubt, check what code actually shipped.
3. Treat this file as a *summary* of state, not a source of truth. Source of truth = the code.
4. **Don't re-bloat this file with session prose.** Per-session detail goes into `archive/YYYY-MM-DD-<topic>.md`. Keep this file scannable in one screen.
