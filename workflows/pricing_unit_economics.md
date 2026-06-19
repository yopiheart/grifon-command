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
