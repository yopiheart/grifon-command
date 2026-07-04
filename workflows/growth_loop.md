# Workflow: Data-Driven Growth Loop (ingest-only)

**Status:** Endorsed spec, not yet built. Neil approved persisting this evaluation 2026-06-24
(chose "build data plumbing now, parallel to beta"). This is the durable record so it survives the
defreezer — **do not start building from it without re-confirming the active phase with Neil.**

**Objective:** Make Grifon improve over time from real data, and let Neil automate his *own* growth
marketing for Grifon as **approver/reviewer only**. Two halves share one foundation:
1. **App-improvement loop** — capture client feedback + product telemetry → ranked "what to fix."
2. **Creative-performance loop** — *read* ad results (ingest-only) → learn *why* a creative sold →
   propose the next creative → Neil ships.

**Scope locked (grill, 2026-06-24):** for **Grifon's own growth** (single-tenant, not a client-sold
feature) · **ingest-only** (read performance; Neil still publishes/pauses — no autonomous spend) ·
**build the plumbing now**, in parallel with beta.

---

## Why this is worth building here (the verdict)

Grifon today is a **creative *generator*** — it makes scripts/storyboards/avatars/video and **Neil
posts them manually.** Confirmed in code:
- **No ad-platform integration** (no Meta/TikTok/Google Ads API anywhere).
- **No pixel / analytics / telemetry / event tracking** (only `rate_limits` for quota; the
  `quota.ts` comment literally says *"revisit when real telemetry contradicts the model"*).
- **No performance fields** in `types.ts` (`strategicAudit` is Gemini self-grading, not real results).
- **No feedback capture** (no NPS/survey/form/table).
- Supabase has **3 tables**: `subscriptions`, `rate_limits`, `user_voices`.

So "learn from past creative results" is **impossible today — the app never sees results.** This is
not one feature; it is a **measurement foundation that does not exist**, then loops on top. It is
still the right bet because:

1. The roadmap already anticipates it — Item #16 (CAC/LTV instrumentation), Item #7 (OfferOptimizer
   rescue *triggered by low CTR/conversion*), Item #2 + `autopilot_oneclick_spec.md`.
2. The **learning brain already exists and is proven**: `viral-autopsy` → `viral_swipe_file.md` →
   `grifon-cmo`, with a hard human-gate + 3-corroboration rule. We feed it *real* performance data
   instead of only external swipe videos. We are not inventing the loop — we are feeding it.
3. Neil's *"approver lang ako"* **matches the repo's strongest doctrine**: TUNED prompts in
   `services/geminiService.ts` / `api/_lib/prompts.ts` are *never* auto-edited.

**Reframe:** ingest-only ≠ "an AI that runs ads." It is **an AI that *reads* ads and proposes the
next creative.** Lower risk, faster to value, and the only version with data to learn from on day one.

---

## What exists vs. net-new

| Capability | State | Where |
|---|---|---|
| Server-side Purchase signal | ✅ **reuse** | `api/webhook.ts` fires on PayMongo payment — perfect CAPI Purchase source |
| Funnel routes (landing/pricing/app) | ✅ exist | `App.tsx` `detectInitialRoute()` |
| Consent pattern (consent_at/consent_ip) | ✅ **reuse** | `supabase/user_voices.sql` — template for pixel/feedback consent |
| Exit-intent trigger | ✅ **reuse** | `hooks/useExitIntent.ts` — feedback / win-back trigger point |
| Activity taxonomy (`visit/ad/research/...`) | ✅ **reuse** | `services/recentWorkService.ts` — seed for event taxonomy |
| Tier definitions (free/starter/pro/business) | ✅ exist | `utils/planGate.ts`, `api/_lib/userPlan.ts`, `subscriptions` |
| Creative learning loop | ✅ **reuse** | `viral-autopsy` → `viral_swipe_file.md` → `grifon-cmo` |
| Server-secret pattern (no `VITE_` leak) | ✅ **reuse** | `api/_lib/` handlers; `straw-man-audit` guards it |
| Event/telemetry table + service | ❌ net-new | new `events` table + `services/analyticsService.ts` |
| Meta Pixel + Conversions API (CAPI) | ❌ net-new | new `api/_lib/metaCapi.ts` + client pixel init |
| Feedback capture | ❌ net-new | new `feedback` table + in-app widget |
| Ad-performance ingestion | ❌ net-new | new `ad_performance` table + `tools/meta_insights_pull.py` |
| Creative→performance attribution | ❌ net-new | stamp generated creatives with an ID; join to ad results |
| Segmentation + hashed-email rosters | ✅ **built (Phase 3)** | `tools/segment_pull.py` + `retargeting-briefs` skill (roster-export-only; Neil uploads) |
| Automated Custom Audience push | ❌ deferred | crosses ingest-only; revisit after consent capture + live data |

---

## The metrics taxonomy (the data that matters when reviewing an ad)

Canonical list to instrument per creative/campaign. Propose adding to `UBIQUITOUS_LANGUAGE.md`.

**Attention / hook — "why does it stop the scroll":**
Hook rate (3-sec views ÷ impressions) · Hold rate (avg % watched, ThruPlay) · thumbstop ratio ·
avg watch time · video-play curve.

**Click / interest:** CTR (link) & CTR (all) · CPC · CPM · outbound CTR.

**Conversion / money — "sale not expense":** LP views · Add-to-Cart · Initiate-Checkout ·
Purchases · CVR (purchases ÷ LP views) · CPA / cost-per-result · ROAS · AOV.

**Fatigue / lifecycle — "when to test, when to turn off":** Frequency (rising → fatigue) ·
CPM trend · ROAS decay over time · results-trend slope. Test/kill thresholds are **admin-tunable**,
never hardcoded (precedent: the `quota.ts` "revisit when real telemetry contradicts the model" note).

**Grifon-funnel-specific (single-tenant growth):** Free signup (Lead) · free→paid CVR by
source/creative · checkout-abandon rate (Initiate-Checkout fired, no Purchase) · tier-upgrade rate ·
paid tenure (for CAC/LTV, Item #16).

---

## The loop SOP (ingest → debrief → propose → approve → ship)

1. **Ingest** — `tools/meta_insights_pull.py` pulls campaign/adset/ad metrics into `ad_performance`.
2. **Attribute** — join each Grifon-generated creative (stamped with an ID at export) to its metrics.
3. **Debrief** — the *growth-debrief* skill reads `ad_performance` + funnel data → ranked
   "why this won / why it failed" against the metrics taxonomy.
4. **Propose** — winners → `viral-autopsy` → `viral_swipe_file.md` patterns → `grifon-cmo` remix →
   **gated proposal** (3-corroboration rule holds).
5. **Approve** — Neil reviews. TUNED-prompt changes require his explicit gate.
6. **Ship** — approved change lands via `surgical-edit` + `verify-changes`; Neil publishes the ad.

---

## Phased build (highest impact first — ship as vertical slices)

### Phase 0 — Give Grifon eyes (foundation; everything else is blind without it)
- **Meta Pixel + server CAPI.** ✅ **COMPLETE 2026-07-03** (`feat/meta-pixel-funnel`, merged `2e918b2`).
  Client pixel fires PageView (incl. SPA route changes), ViewContent (pricing), Lead (email OTP
  **and** first OAuth sign-in), InitiateCheckout (checkout intent resolve), and a browser Purchase
  on both success paths that dedups against **server CAPI Purchase via `api/webhook.ts`**
  (`purchase:${intentId}` event id; webhook stays authoritative on legacy hosted checkout).
  `api/_lib/metaCapi.ts` live; access token **server-only**. Consent-gated end to end: cookie
  banner on landing/pricing/auth gates the pixel; the marketing opt-in (email metadata or the
  OAuth sessionStorage stash) gates hashed-email CAPI sharing. Remaining: confirm
  `VITE_META_PIXEL_ID` + `META_CAPI_ACCESS_TOKEN` in Vercel env.
- **In-app telemetry.** New Supabase `events` table (user_id, event, module, step, meta jsonb, ts) +
  `services/analyticsService.ts` (mirror `recentWorkService.ts`). RLS like `user_voices`. Answers
  "why visitors don't convert" + "who hit checkout and bailed."

### Phase 1 — Client feedback loop (cheap, low-risk, fast)
- New `feedback` table + micro-widget (NPS / "what's frustrating you"), triggered after generations
  and via `useExitIntent.ts`. Combine with Phase-0 drop-off → ranked list feeding `app_audit.md`.

### Phase 2 — Ad-performance ingestion + creative learning (the core of the brief)
- **2a (built):** `tools/meta_insights_pull.py` (WAT-style deterministic pull, like `analyze_video.py`)
  → `ad_performance`. Creative→performance attribution via the `grifon-<jobId>` ad-name stamp.
- **2b (built):** the `growth-debrief` skill + `tools/growth_debrief_pull.py` — reads
  `ad_performance` + `events` + `feedback` → ranked "why it won / why it failed" debrief in
  `growth_debriefs.md` → routes winners into the viral-autopsy/CMO loop above (gated). Live data
  pending Neil's `ads_read` token; aggregation verified against a committed fixture.

### Phase 3 — Segmentation + retargeting briefs (Neil-as-approver) ✅ **built**
- The `retargeting-briefs` skill + `tools/segment_pull.py` join `subscriptions` tiers to the `events`
  funnel + `feedback` → 5 audiences (checkout-abandoners, power-users-still-free, free-not-converted,
  detractors, promoters). Per-segment creative briefs via `grifon-cmo` + `grifon-creative-director` +
  Director AI → land in `retargeting_briefs.md` → **Neil approves → publishes.**
- **Roster-export-only** (the chosen boundary): the tool writes **hashed-email CSV rosters** for Neil
  to upload to a Meta Custom Audience **by hand** — no automated push (stays ingest-only). stdout is
  PII-free; rosters are an opt-in `.tmp/` artifact, never committed.
- **Consent gate:** any real upload is **blocked** until a marketing-consent capture ships (its own
  task, touches the consent UI). Verified against a fixture; live pull waits on Phase-0 telemetry.
  See [`growth_loop_phase3_checklist.md`](growth_loop_phase3_checklist.md).

**Deferred (correctly):** autonomous publish/spend + automated Custom Audience push. Out of scope per
ingest-only + the human-gate doctrine. Revisit only after the loop proves its judgment on live data.

---

## Skills assessment (new vs. enough)

**Reuse (enough):** `viral-autopsy`, `grifon-cmo`, `grifon-creative-director`, `straw-man-audit`
(MANDATORY on every new `api/` + pixel/secret/consent surface), `surgical-edit`, `verify-changes`,
`gemini-eval`, `brand-check`.

**Net-new (small, worth creating):**
- `workflows/growth_loop.md` — **this file** (the SOP).
- A **growth-debrief skill** ✅ **built (Phase 2b)** — reads `ad_performance` + funnel + feedback,
  writes the ranked "why it won / failed" debrief that feeds CMO. The one genuinely new agent
  capability. Backed by `tools/growth_debrief_pull.py` (deterministic aggregation) + a committed
  fixture; lands entries in `growth_debriefs.md`.
- `tools/meta_insights_pull.py` ✅, `tools/growth_debrief_pull.py` ✅, `tools/segment_pull.py` ✅ —
  deterministic WAT pulls. (`tools/funnel_report.py` folded into `growth_debrief_pull.py` — one
  consolidated read, not two.)
- A **`retargeting-briefs` skill** ✅ **built (Phase 3)** — segments users + writes per-segment
  creative briefs (roster-export-only, consent-gated). Backed by `tools/segment_pull.py` + a fixture;
  lands briefs in `retargeting_briefs.md`.
- *(Decided: folded inline, not a separate skill)* the **`grifon-media-buyer`** persona Neil named —
  frequency / ROAS-decay / budget-pacing *metrics reading* — now lives **inside `growth-debrief`**
  (it plays the media-buyer, then hands strategy to CMO / visuals to CD). Revisit a standalone
  persona only if the judgment outgrows one skill.

---

## Conflicts / risks

- **Privacy/consent surface.** Pixel + telemetry + feedback = new PII → update the `terms`/`privacy`
  routes, reuse the `user_voices` consent pattern, run `straw-man-audit`.
- **Secret leakage.** Meta access tokens are **server-only** — never `VITE_`-prefixed (would bundle
  into the browser). Exactly the `api/_lib/` + straw-man-audit boundary.
- **TUNED-prompt doctrine.** The loop only *proposes*; Neil gates. No `/goal` or agent auto-applies
  to `geminiService.ts` / `api/_lib/prompts.ts`.
- **Defreezer.** All state lives in Supabase/committed code; nothing local survives reboot.
- **Bundle/perf.** Pixel must respect DESIGN.md and load deferred; don't bloat first paint.
- **Scope creep.** Ship **Phase 0 first as a thin vertical slice** (pixel + Purchase CAPI + one
  telemetry event end-to-end) before building the full taxonomy.

---

## Verification (per phase, when built)

- **Phase 0:** test signup → `Lead` in Meta Test Events; PayMongo test payment → server `Purchase`
  via CAPI (dedup with pixel); query `events` for a wizard-step row. Run `verify-changes` +
  `straw-man-audit`.
- **Phase 1:** submit feedback → row in `feedback`; exit-intent fires once.
- **Phase 2:** run `meta_insights_pull.py` against a real ad account → rows in `ad_performance`;
  one creative joins to its metrics; dry-run a full loop cycle.
- Build-gate Stop hook must pass for any `api/`/`services/`/`components/`/`App.tsx` touch.

## Relationship to existing roadmap

This is the **instrumentation layer** that Item #16 (CAC/LTV) says it lacks ("the instrumentation to
capture it may be a separate small task if logs are thin"), and the **perf-tracking prerequisite**
Item #7 (OfferOptimizer rescue) explicitly waits on. Phase 0 unblocks both.

**First action when built:** Phase 0 only, as one vertical slice, with its own plan + `/goal`
(cite the build-gate + `verify-changes`). Each later phase is its own plan + goal.

> **Build sheet:** the plug-and-play Phase 0 checklist (credentials, env vars, build order,
> verification, ready-to-fire `/goal`) lives at
> [`growth_loop_phase0_checklist.md`](growth_loop_phase0_checklist.md). The `events` table migration
> is already written at [`../supabase/events.sql`](../supabase/events.sql).
