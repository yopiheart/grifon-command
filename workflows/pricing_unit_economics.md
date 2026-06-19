# Workflow: Pricing & Unit Economics

**Objective:** The canonical, defensible source of truth for Grifon's pricing ladder, per-unit COGS, margin targets, and the acquisition (CAC/LTV) layer. Finalized 2026-06-19 with Neil. Tune the numbers when the three open data points land (bottom).

This pairs with the implementation plan `~/.claude/plans/free-tier-let-greedy-matsumoto.md` (ephemeral — defreezer wipes it) and `config/planFeatures.ts` / `utils/planGate.ts` / `api/_lib/{quota,paymongo}.ts` (the code that enforces this).

---

## 1. The metering unit — FINALIZED: per finished ad, not per scene

**Old behavior (to change):** `consumeMonthly('video_ads')` fires on **every Veo/Kling clip** ([api/gemini/video.ts:76](../api/gemini/video.ts#L76), [api/kling/omni-video.ts](../api/kling/omni-video.ts)). Since the pipeline renders one clip per scene, "15 video ads" actually meant ~15 *scene renders* ≈ 2–3 finished ads. **This under-delivers vs the label and breaks trust** (Bryan reads "15 ads," gets ~3).

**Finalized model:** advertise AND meter in **finished ads**. One credit = one completed one-shot render job, capped at N scenes. The **scene cap is the margin dial** — without it, one user's 12-scene epic blows the per-ad COGS.

> **Implementation status (Slice 3, 2026-06-19) — SHIPPED.** Metering moved from per-clip to **per-finished-ad**: every video proxy now carries a `finishedAdId`; `meterVideoRequest`/`consumeFinishedAd` ([api/_lib/quota.ts](../api/_lib/quota.ts)) charge ONE `video_ads` credit the first time an ad is seen and let later scenes/regenerations through free (idempotent via a `vidjob:` marker). Free renders 0 → lands on [LockedVideoPreview](../components/LockedVideoPreview.tsx) instead of a raw 402. Scene cap (`SCENE_CAP` in [utils/planGate.ts](../utils/planGate.ts): free 0 / starter·pro 4 / business 6) is enforced **client-side** in Render All. Free exports are watermarked at the central export surface ([Step7FinalOutput](../components/Step7FinalOutput.tsx)).
>
> **Parked hardening (follow-ups):** (1) *server-side* scene cap — a naive per-job counter wrongly counts regenerations against the cap, so the cap is client-only for now; per-ad credit metering is the load-bearing margin control. (2) Watermark **full sweep** — applied only at Step7 exports so far; the scattered per-module download sites (ImageModal, gallery tiles) still export clean. Both tracked for a focused pass.

---

## 2. Cost per finished ad (verified unit prices, 2026-06-19)

- **Veo 3.1 Fast 1080p = $0.12/sec** (Gemini API). Quality ~$0.40/s, Lite ~$0.08/s.
- **Nano Banana 2 image ~$0.10** (4K/premium ~$0.15). Text (flash-lite) + voice (ElevenLabs) + final render = rounding error.
- FX ≈ ₱58/$. **Video gen ≈ 80% of every ad's COGS.**

Per finished ad = ~₱70 fixed (≈8 plan-stage images + text + voice + render) + (scenes × ~₱56/8s-clip), +~30% regen buffer:

| Scene cap | Raw cost | +30% regen | Ad length |
|---|---|---|---|
| 4 scenes | ~₱294 | **~₱380** | ~16–32s (FB/reels sweet spot) |
| 6 scenes | ~₱406 | ~₱528 | ~24–48s |
| 8 scenes | ~₱518 | ~₱673 | ~32–64s |

Business **Commercial/Spec** ad on Veo Quality + 4K images ≈ **₱1,000–1,300/ad** — premium cost, must be pay-per (see top-ups).

---

## 3. FINALIZED pricing ladder

Net revenue after fees (worst case VAT-registered + card): Pro ₱2,497 → ~₱2,140 net (÷1.12 VAT − 3.5% PayMongo); Business ₱4,997 → ~₱4,300. *Under ₱3M annual sales = non-VAT 3% percentage tax (better margin); annual billing cuts PayMongo drag.*

**PlanId = `'free' | 'starter' | 'pro' | 'business'`.** Autopilot is NOT a checkout PlanId (invite-only, see below).

| Tier | Price/mo (annual) | Included finished ads/mo | Scene cap | Video | Key unlocks |
|---|---|---|---|---|---|
| **Free** | ₱0 | **0** (1 full *plan*, no video) | — | — | Market research, script, storyboard plan, avatar, thumbnail, offer optimizer. Watermarked exports. Email support. |
| **Starter** | ₱997 | **1** | up to 4 scenes | Veo Fast 1080p, auto | Bare on purpose: 1 finished ad, auto-edit only. **No** presets/editing styles/caption packs/advanced mode/brand profiles. No watermark. *Trial door + price anchor that funnels to Pro.* |
| **Pro** ⭐ | ₱2,497 (₱2,081 annual) | **8** | **up to 4 scenes** (FB/reels-optimized) | Veo Fast 1080p, auto | Video gen + AI editor (raw/auto toggle) + format presets + editing styles + FB caption/headline packs. 3 brand profiles. Community + monthly call. Priority support. No watermark. |
| **Business** | ₱4,997 (₱4,164 annual) | **15** standard + Commercial/Spec metered | **up to 6** (8 for spec) | Fast 1080p standard; Quality+4K for spec | Everything in Pro + Director/Advanced mode + 4K images + premium image model + Commercial/Spec Studio + 10 brand profiles + 10 team seats + white-label + weekly strategy call + dedicated account manager. |

**Autopilot — hidden / invite-only (decision 2026-06-19).** NOT a public pricing card, NOT in the checkout catalog. From ₱29,997/mo, done-for-you, costed per engagement. Sold via conversation/application — exclusivity is a sales tool (Scarcity + Liking). Surface an "Apply for Autopilot" nudge only to high-usage Pro/Business users; reach it via a private link / application form.

### Why Starter at ₱997-for-1-ad (chosen over one-off pay-per-ad, ~70% confidence, 2026-06-19)
Two jobs: (1) **trial door** — lowest monthly commitment to taste video; ~59% margin (₱997 → ~₱860 net − ~₱350/ad = ~₱510). (2) **price anchor** — ₱997/ad vs Pro's ₱312/ad (₱2,497÷8) makes Pro look like a steal → Cialdini contrast funnels fence-sitters up. Kept deliberately *thin* (price + feature gaps both point at Pro) so it never cannibalizes Pro. Chosen over one-off pay-per-ad because a billion-scale SaaS is valued on **MRR** — a ₱997 subscriber is a retained asset with card-on-file (one-click upgrade), not a transaction that resets to zero. The 30% risk is commitment friction (a recurring "yes" is harder than a one-off); hedged by keeping the ₱499 single-ad as a fallback (below). Revisit with real Free→Starter vs Free→pay-per-ad data (roadmap #16).

### Top-up credits (overage = highest-margin revenue, never a loss)
Priced ~2x marginal cost so every extra ad is profitable:
- **Standard finished ad** (Fast 1080p): **₱499 single** (also the no-commitment fallback door for Free users + Starter overage), or **5-pack ₱2,250** (₱450/ad).
- **Cinematic/Spec ad** (Business, Quality+4K): **~₱1,200/ad** (covers the ~₱1,000–1,300 cost). Keeps the expensive Quality renders pay-as-you-go.

---

## 4. Margin logic (why this hits target)

Target **65–70% blended gross margin** (healthy for gen-AI SaaS; pure software is 80%+, video COGS drags it).

- **Pro:** 4-scene cap → ~₱380/ad. At conservative avg ~2 ads/mo (busy SMBs), COGS ~₱760 → **~64% margin**. At avg 3.5, ~₱1,330 → ~38% — so the 4-scene cap + breakage is what holds the line. Included 8 is the *marketing* number; breakage makes it safe.
- **Business:** volume tier, structurally lower % (~50–55%) but higher absolute profit (~₱1,700–2,100/user/mo). Spec/cinematic is **always profitable** because it's pay-per-credit, not bundled.
- **No unit is loss-making.** Top-ups cover heavy users above cost; the scene cap bounds bundled COGS.

**Levers if margin slips:** tighten scene cap → shift heavy users to top-ups → default Veo Fast everywhere except Business spec → raise price (real pricing power exists: positioned as "replaces the ₱30K agency").

---

## 5. The acquisition layer — CAC/LTV (track SEPARATELY, do NOT bake into COGS)

**Decision (Neil, 2026-06-19):** do *not* add Grifon's own ad/acquisition spend on top of per-ad COGS. Gross margin answers "does each plan make money to run?"; CAC answers "can I afford to go get the customer?" — different questions, different buckets. Mixing them makes every pricing decision muddy.

Two rules that decide if ad spend is sane:
- **LTV : CAC ≥ 3 : 1**
- **CAC payback < 2–3 months** (critical for high-churn SMB)

Rough Grifon math: Pro ~₱1,180 gross profit/mo × ~4–6 mo tenure → LTV ≈ **₱4,700–7,000** → can spend up to **₱1,500–2,300 to acquire one Pro customer**, payback ~2 mo. Comfortable.

**Key insight specific to our model:** the **Free consultation IS our CAC.** The ~₱70/free-plan COGS is a customer-acquisition cost, not gross-margin cost. Real acquisition cost:

> **CAC = (FB cost per free signup + ₱70 free-plan COGS) ÷ (Free→Pro conversion rate)**

Free→Pro conversion is the whole ballgame (10% → ₱2,200 CAC, healthy; 3% → ₱7,300, underwater). This is *why* the end-of-plan locked-video upsell (`components/LockedVideoPreview.tsx`) is a CAC controller, not polish.

---

## 6. OPEN — confirm before going live (parked in post_beta_roadmap.md)

Quota/price numbers above are placeholders until these land from beta render logs + analytics:
1. **Avg scenes (and seconds) per finished ad** — validates the scene-cap COGS.
2. **Regeneration rate** — validates the 30% buffer.
3. **Avg finished ads a real Pro user makes/month** — the breakage number that sets safe included quota.
4. **CAC inputs:** FB cost per free signup · **Free→Pro conversion rate** · avg paid tenure (churn).

When these arrive, re-run §2–§4 and lock final included counts.

---

## 7. Restructure build progress (resume breadcrumb — branch `feat/pricing-restructure-starter-ladder`)

The pricing restructure ships as vertical slices. **Slices 0–5 are committed + pushed.** Resume at Slice 6 with a fresh session (this doc + the slice list below are enough context — the ephemeral plan `~/.claude/plans/free-tier-let-greedy-matsumoto.md` is gone).

**Done:**
- **0–1** — ladder Free/Starter/Pro/Business; Autopilot invite-only; PlanId narrowed; top-ups registered (commit `8f70bea`).
- **2** — one-shot wizard: `DirectorOneShot` + `useOneShotGeneration` + shared `utils/sceneRender.ts`; steps preserved (`821903f`).
- **3** — per-finished-ad metering (`meterVideoRequest`/`consumeFinishedAd`, `finishedAdId` plumbed through all 3 video proxies); client `SCENE_CAP`; Free→`LockedVideoPreview`; Free exports watermarked at `Step7FinalOutput` (`e84a4df`).
- **4** — Director (step) mode → Pro+ (CMO call, not Business-only); advanced 4K/quality/model controls → Business; engine names (Veo/Kling) hidden behind outcome labels; `grifon_dev_unlock` localStorage bypass for dev (`041c400`).
- **5** — beta modules graduated off `grifon_admin` onto plan tiers (`MODULE_TIER`: generate_video Starter+, edit_video+signal_modulator Pro+, cinematic_studio Business); AI editor AUTO/RAW toggle (`2849b12`).
- **6** — pricing polish + **functional** top-up flow + standalone ₱499 door, three commits:
  - **6a** (`3933850`) — honest Starter copy (dropped the false "auto-edited for you"; auto-edit is Pro+); Pro "AI video editor — …keep viewers watching to the end" with a `SignatureScribble` underline (Pro only); value stack 15→8 ads + total ₱170k→₱135k; marquee `₱499/AD` beat.
  - **6b** (`2c4c781`) — top-ups previously took money and granted nothing. Now end-to-end: Supabase migration `topup_credits` (subscriptions `video_ad_credits`/`cinematic_credits` + `grant_credits`/`consume_credit` RPCs, mirrored to `supabase/credits.sql`+`schema.sql`); `api/_lib/credits.ts`; `quota.ts` `consumeFinishedAd` falls back to a purchased credit when the monthly allowance is exhausted (`consume_credit` **fails closed**); `webhook.ts` grants from `metadata.add_ons` on subscription activation AND on a standalone `purchase_type='topup'` event; `billing.ts` `?action=topup` + credit balances in the usage snapshot.
  - **6c** (`25bb11b`) — `config/topups.ts`; `checkoutService.fetchTopupIntent` + topup flag through confirm/ewallet (tags the 3DS return_url); parallel `TopUpCheckoutPage` (subscription `CheckoutPage` untouched); `/checkout?topup=` route; ₱499 door in `LockedVideoPreview`; 1-ad/5-pack row in `QuotaWallModal` (incl. the Business top-plan branch); `useQuota` surfaces credits.
  - **Verified:** build green, 271 tests pass (new credit-fallback + `creditsForAddOns` tests), bundle-leak 0, brand-check BRAND_PASS_WITH_NITS 43/50 (0 critical), smoke-tester PASS (/pricing desktop+mobile, topup route mounts).

- **7** — verification + sign-off pass (decisions confirmed with Neil 2026-06-19):
  - **7a — 375px Dashboard locked-tile check: PASS.** `/app` is hard auth-gated with no test path (and `grifon_dev_unlock` hides locked tiles), so a live authed smoke wasn't feasible — verified instead via a blind brand-critic over the locked-tile grid reasoning at 375px. Verdict BRAND_PASS_WITH_NITS 41/50, **0 critical**: the feared badge overflow/overlap does NOT occur (`pr-12` + `right-3` holds even for the longest "BUSINESS" label). Applied the 3 in-scope nit fixes on the tier badge (`Dashboard.tsx`): `text-[9px]`→`text-[10px]` (clears the must-read legibility floor), `tracking-widest`→`tracking-wide`, `shrink-0` on the `Lock` icon.
  - **7b — render default: KEEP Lite/720p. Do NOT bump to Fast/1080p.** No code change (the default already is Lite/720p). At Lite@1080p the per-resolution duration whitelist allows only one 8s clip, so `autoRouteModelForType` would force-clamp every talking scene to 8s and break the smart-duration pacing (`suggestDurationForScript`) — Neil: "might destroy our working formula." The COGS doc's "default Veo Fast everywhere except Business spec" (§4 lever) stays a **future, smoke-gated** option; reopening it requires a full N-scene Director render smoke eyeballing talking + b-roll pacing (see `agent_lessons.md` 2026-06-19). Decision: parked, not pursued now.

**✅ Pricing restructure COMPLETE (Slices 0–7).** Branch `feat/pricing-restructure-starter-ladder` — ready for PR/merge. Below are the parked, non-blocking follow-ups that survive the restructure.

**Parked follow-ups (not blocking):**
- **Unbuilt features removed from pricing copy — build vs permanent-cut decision (2026-06-19)** — these were sold on the pricing cards / checkout with NO implementation behind them, and were stripped from `config/planFeatures.ts` in the honesty pass (commit `bf1e47c`): **brand profiles** (Pro "3", Business "10" — no profile data model/storage/UI), **team seats** (Business "10" — no multi-seat/invite system), **white-label exports** (Business — no feature AND forbidden by our own ToS, [TermsOfService.tsx:62](../components/TermsOfService.tsx#L62)). Decision needed: build any of them post-launch (brand profiles + team seats are plausible Business value; white-label stays cut unless the ToS clause changes), or leave permanently cut. Do NOT re-add to copy until built. Related live commitment: Business "Weekly strategy call + dedicated account manager" is now a real human-service promise — staff/cap it or soften to monthly.
- **Monthly video meter fails OPEN (Major, pre-existing)** — `consumeMonthly` gates on `rateLimitCheck`, which returns `true` on RPC error (documented fail-open). So a Supabase hiccup lets a video render proceed free, never reaching the fail-*closed* credit fallback — inconsistent direction for a real-money allowance. Fix needs an error signal on `rateLimitCheck`/`consumeMonthly` (REQUIRES NEIL — `_lib` signature). Found by PR-review-loop critic 2026-06-19 (M1).
- **`consumeFinishedAd` peek-then-consume race (Major, pre-existing Slice 3)** — concurrent scene-clips of a brand-new `finishedAdId` can each peek `used=0` and each consume a unit before the per-ad marker is set, burning a user's quota faster than 1/ad. Fix = claim the marker atomically *before* metering (REQUIRES NEIL — changes `quota.ts` consume semantics). Found by PR-review-loop critic 2026-06-19 (M2/M3).
- **Webhook grant-failure is silent (lost-credit edge)** — `grantCredits` returns `false`/logs on RPC error but `webhook.ts` ignores the return and 200s. After the atomic claim is taken, a `grant_credits` RPC failure means the paid credit is never granted AND the replay is deduped → lost credit. Pre-existing (the grant ignored its boolean before the C1/C2 fix too); narrow (needs the grant RPC to fail after the claim succeeds). Proper fix is contract-level (idempotent grant keyed by intent_id, or claim-confirm-after-grant) → REQUIRES NEIL. Found by the PR-review-loop critic 2026-06-19.
- **Webhook handler test gap** — `api/webhook.ts` has no unit/integration test (only `paymongo.test.ts` signature/catalog coverage). The C1/C2 idempotency-claim fix was verified by the fresh-critic loop, not a test. Add a handler test (mock signature + admin RPC) covering: single grant on first delivery, dedupe on concurrent/replayed delivery, 5xx-on-claim-error.
- **Cinematic top-up CONSUMPTION** — `video_ad_cinematic` credits are *granted* and bankable, but not yet *consumed*: the Commercial/Spec render path sends no cinematic signal to the video proxy, so the server can't tell a spec render from a standard one. Needs a render-path cinematic flag + the Business spec metering model. Until then the cinematic top-up is intentionally **not surfaced** in the purchase UI (`config/topups.ts`).
- Server-side scene-cap hardening (client-only today); watermark full sweep (Step7 only today); Starter auto-edit path (edit_video is Pro+, so Starter has no auto-edit despite the §3 label); migrate remaining client-side prompts (thumbnail/avatar/scene) server-side.
