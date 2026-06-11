# Fable 5 Enhancement Audit — Punch List

> **Status header (resume from repo alone):** `AUDITED: A, B / PENDING: C, D / FIXES: not started`
>
> Produced by the Fable 5 enhancement pass (plan approved 2026-06-11, branch
> `claude/grifon-fable5-enhancement-go90ga`). Rules of this pass:
> **audit-first**, tiered fixes (Tier 1 = auto-fix safe; Tier 2 = per-item Neil
> approval), **render-path FROZEN** until scene-6/5 validation clears
> (findings there tagged `POST-VALIDATION`), **tuned prompts skipped entirely**
> (`api/_lib/prompts.ts`, prompt content in `services/geminiService.ts`).
> Tier 1 is narrow: docs edits, comment/typo fixes, value-identical literal
> corrections. **No deletions or renames in Tier 1.**
>
> Baseline (2026-06-11, fresh `npm install`): `npm run build` ✅ clean ·
> `npm run test` ✅ 189 passed / 12 skipped (gated) · tuned-prompt bundle-leak
> grep over `dist/assets/index-*.js` = 0 ✅

Severity: **Critical** = visibly breaks brand/UX or data/security · **High** =
clear violation/real bug · **Polish** = consistency/cleanup.

---

## Area A — Design/UI fidelity (vs DESIGN.md)

**Verdict:** Core system is healthy — GlassPanel/GoldButton/Input primitives,
gradient headers, and icon wrappers are all correct. Real findings cluster in
four groups: one genuinely-broken shadow token, amber-palette drift in
checkout/billing warning states, marketing-only `rounded-full` leaking into
wizard surfaces, and legacy `brand-*` alias classes.

**Auditor note (verified during audit):** `brand-yellow`, `brand-primary`,
`brand-yellow-dark`, and `text-primary` ARE defined in the inline Tailwind
config in `index.html:360-372` — all resolve to `#FFCC00`/`#FFFFFF`. They
render correctly today, so alias usage is **Polish (consistency)**, not broken.
`shadow-neon-yellow` however is **not defined anywhere** → silent no-op.

| # | Finding | Where | Sev | Tier |
|---|---------|-------|-----|------|
| A1 | `shadow-neon-yellow` is an undefined class — intended gold glow never renders | `components/ImageAdsGen.tsx:129`, `components/InfluencerForge.tsx:590` | High | Tier 2 (visual change — restores intended glow; pick explicit `shadow-[0_0_15px_rgba(255,204,0,0.4)]` or drop the class) |
| A2 | Amber palette used for warning/error states instead of gold accent (`border-amber-500/30 bg-amber-500/10 text-amber-200` etc.) | `components/checkout/CheckoutReservation.tsx:43`, `components/CheckoutPage.tsx:276`, `components/Billing3dsReturn.tsx:101`, `components/GenerateVideo/index.tsx:1587` | High | Tier 2 (judgment call: DESIGN.md single-accent rule vs. semantic warning color — Neil decides) |
| A3 | `rounded-full` GoldButton/ghost buttons on in-app wizard surface (marketing-only shape per DESIGN.md) | `components/Step5Storyboard.tsx:360,370,371,379` | High | Tier 2 (visual change) |
| A4 | Inline hand-transcribed Viber `<svg>` (known incident class: SVG corruption, lucide-only rule) | `components/LandingPage.tsx:647` | High | Tier 2 (extract to `components/icons.tsx` wrapper) |
| A5 | Legacy `brand-yellow`/`brand-primary`/`text-text-primary` alias classes instead of explicit tokens — value-identical to `#FFCC00`/white, zero visual delta | `components/Loader.tsx:42,44,47,68,72`, `components/InfluencerForge.tsx` (8+ uses), `components/ImageAdsGen.tsx` (5 uses) | Polish | Tier 1 (value-identical literal swap, verified same color; OR keep aliases and document them in DESIGN.md — default action: swap to explicit `#FFCC00`) |
| A6 | Inline gold buttons duplicating GoldButton styling | `components/CheckoutPage.tsx:172`, `components/Billing3dsReturn.tsx:93,108`, `components/CinematicSpecStudio.tsx:370` | Polish | Tier 2 (refactor to `<GoldButton>`) |
| A7 | `GrifonPricingPage.tsx:472-485` CTA buttons via inline `<style>` block (`gold-btn`/`ghost-btn`) instead of ui/ primitives | `components/GrifonPricingPage.tsx` | Polish | Tier 2 (or document as marketing-page exception) |
| A8 | InfluencerForge has 30+ inline button styles that could reuse `Button`/`GoldButton` | `components/InfluencerForge.tsx` | Polish | Tier 2 (batch refactor, low urgency) |
| A9 | Fake-browser traffic lights use `bg-yellow-500` (likely intentional OS-chrome mimicry) | `components/ui/Loader.tsx:58`, `components/LandingPage.tsx:473,493,513` | Polish | Tier 2 (confirm intent; likely "won't fix — intentional") |

**Clean (no findings):** gradient headers, GlassPanel/Input/Textarea specs,
`bg-black` (zero occurrences — all canvas is `bg-zinc-950`), `#FFD700` (zero
occurrences), icons.tsx lucide discipline (except A4).

---

## Area B — Code quality (non-tuned)

**Verdict:** No cross-user data leaks. Issues cluster in App.tsx wizard
state-management races and timer/closure hygiene. Tuned prompt content was
NOT read or evaluated (per pass rules); `geminiService.ts` was audited at
transport layer only. All B code fixes are behavior changes → **Tier 2**
(per-item approval), except where tagged. Each finding needs a repro check
at fix time — severities below are from static reading.

| # | Finding | Where | Sev | Tier |
|---|---------|-------|-----|------|
| B1 | Wizard session autosave debounce captures stale snapshot — pending 500ms timer can fire after user navigates/steps back and overwrite the fresher session | `App.tsx:312-344` | High | Tier 2 (add cancelled-flag in effect cleanup) |
| B2 | Two uncoordinated autofill effects (`marketResearch` + `offerOptimizer`) race when a report completes during pendingSession restore | `App.tsx:350-447` | High | Tier 2 (single-authority guard) |
| B3 | `startElapsedTick` interval not cleared on scene switch — multiple 1s intervals accumulate across `activeIdx` changes | `components/GenerateVideo/index.tsx:422-435` | High | Tier 2 (stop before start) |
| B4 | `refreshAccessToken` in-flight dedup cleared via setTimeout instead of `finally` — a rejected refresh can be awaited by the next caller instead of retrying | `services/geminiService.ts:49-64` (transport layer — fair game) | High | Tier 2 |
| B5 | `grifon_pendingAutofillTs` shared by two writers (MarketResearch, OfferOptimizer) without namespacing — first reader wins on near-simultaneous writes; impact capped by 10-min expiry | `App.tsx`, `MarketResearch.tsx`, `OfferOptimizer.tsx` | Polish | Tier 2 |
| B6 | `openDb()` retries failed IndexedDB open with no backoff/error cache | `services/activeJobStore.ts:37-59` | Polish | Tier 2 |
| B7 | No base64 shape validation on `videoBytes` before `Buffer.from` — corrupt payload uploads silently | `api/gemini/video/poll.ts:113-147` | Polish | **POST-VALIDATION** (frozen render path) |
| B8 | Kling poll JWT refresh lacks in-flight dedup (gemini transport has it) | `api/kling/video/poll.ts:88-96` | Polish | **POST-VALIDATION** (frozen render path) |
| B9 | `?admin=` URL param parsed at module scope only (no re-sync on route change); `isAdmin` read once on mount with no storage listener | `App.tsx:59-73`, `components/Dashboard.tsx:100-104` | Polish | Tier 2 |

**Clean / false positives:** `checkoutService` sessionStorage already
try/catch-wrapped; `api/billing.ts` rate-limit return path correct.
Full localStorage key→consumer registry was built during audit: 18 keys,
only the B5 pair has a multi-writer collision; `grifon_admin` is now
single-intent (no repeat of the 2026-05-04 incident).

## Area C — Workflows + skills docs

_Pending._

## Area D — Test coverage gaps

_Pending._
