# Next-session conversion backlog (2 features)

> Approved plan, **deferred to next session** (kept out of the current session to limit context).
> Saved in-repo because the cafe-PC defreezer wipes `~/.claude/`. Resume from here.
> Both features are frontend-heavy + reuse existing infra; Feature A has one small **additive, non-amount**
> server change. No TUNED prompt/schema files involved.

---

## STATUS (updated 2026-05-31)

- **Feature A — SHIPPED ✅** (annual upsell `b160281`, then polished across `ab6aafb`, `3031ca9`,
  `8edd78a`): cycle toggle + loss-aversion callout, terms checkbox above Pay, in-app policy view with
  state-preserving "Back to checkout", value-stack checkmark inclusions, guarantee moved into Order
  Summary with the rotating gold light, glossy gold CTA, sentence-case terms consent.
- **Tier upgrades (Creator→Pro→Business) — decided: NOT at checkout.** They belong in the **dashboard
  at the quota wall** ("15/15 workflows used → unlock Pro") — highest-intent moment, keeps checkout a
  single decision. New, separate feature; not yet built.
- **Deferred Monetise-style ₱-anchor value stack** (strikethrough per-item value + total): needs
  Creator/Business value numbers Neil signs off on (Pro has the existing ₱170k stack). Escalate to
  `grifon-cmo`.
- **Feature B — still DEFERRED** (landing exit-intent "Start Free" popup). Spec below unchanged.

---

## Feature A — Checkout: monthly→annual upsell (loss aversion)

**Why:** Checkout locks in the cycle chosen on pricing (`?cycle=monthly`). No nudge to switch to annual = missed
lever. Low-risk — the annual path already works (users can already reach `?cycle=annual`); this is mostly UI +
existing server math.

**Already in place (reuse):**
- `CheckoutPage` parses `cycle` via `parseQuery()`; `fetchIntent(planId, cycle, addOns)` re-fetches on dep change (the add-on toggle already does this).
- `api/billing.ts handleIntent` computes annual from `PLAN_CATALOG.annualCentavos` and returns `monthly_equivalent_centavos` + `annual_savings_centavos` (currently only for the annual cycle).
- `OrderSummary` already renders the annual savings line when `cycle==='annual'`.

**Decision: toggle + loss-aversion callout** (honest, reversible — no dark pattern).

**CMO framing:** Frame the loss ("stay monthly and you'll pay **₱4,992 more** this year" > "save ₱4,992").
Anchor **"2 months free"** (annual ≈ 10× monthly: Creator save ₱1,992, Pro ₱4,992, Business ₱9,996). Celebrate the
switch + low-key "Prefer monthly? Switch back".

**Implementation:**
1. `components/CheckoutPage.tsx` — lift `cycle` into state (init from URL), add to the `fetchIntent` effect deps, pass `cycle`+`onCycleChange` to `OrderSummary` (mirror how `selectedAddOns` drives the re-fetch). Optional: sync `?cycle=` in the URL.
2. **Server, additive only** (`api/billing.ts handleIntent`) — always return `annual_savings_centavos` (+ `monthly_total_centavos`) from `PLAN_CATALOG` so the monthly view shows the real "switch & save ₱X". **Display-only; amount logic unchanged.** (Fallback: client display map; server field is the honest/exact choice.)
3. `components/checkout/CycleToggle.tsx` (new) — segmented `Monthly | Annual` (Annual badged "2 months free") + the loss-aversion callout (only when monthly) + reversible switch-back. Reuse `formatPHP`. Mount at the top of `OrderSummary`, under the reservation banner.
4. **Reservation fix:** change `reservationKey` from `${planId}_${cycle}` → `${planId}` so switching cycle doesn't reset the 15-min timer.
5. Confirmation micro-interaction (sonner toast or inline gold flash) on switch-to-annual.

**Files:** new `components/checkout/CycleToggle.tsx`; edit `CheckoutPage.tsx`, `OrderSummary.tsx`, `api/billing.ts` (additive fields), `services/checkoutService.ts` (`IntentBreakdown` optional fields).

---

## Feature B — Landing: exit-intent "Start Free" popup (Sabri "Sell Like Crazy" structure)

**Why:** Recapture abandoning visitors (~5–15% recovery). **Steal Sabri's STRUCTURE, drop his style** — the profane
meme ("HOLD DA F*CK UP," Will Smith gif) is off-brand for Grifon's premium dark-luxury look and alienates
conservative PH SMB owners.

**Decision: 'Start Free' recapture** — one CTA → Start Free; no email magnet, no new infra.

**CMO framing:** Keep the skeleton — urgency bar, pattern-interrupt headline, friction-killer subcopy, ONE big CTA.
On-brand Taglish, gold/zinc, no profanity/meme. Copy direction: headline "Sandali lang!" / "Wait — before you go…"
→ "Gawa ng first ad campaign mo, **free**, in 30 minutes. No credit card." → `<GoldButton>` **Start Free — No Credit
Card**. Optional honest urgency: "Founding price ends {FOUNDING_OFFER.closesLabel}." Show **once per session**,
instantly dismissible, never for logged-in users.

**Trigger:**
- **Desktop:** exit-intent — `mouseout`/`mouseleave` with `relatedTarget == null` and `clientY <= 0`.
- **Mobile/touch** (no exit-intent): scroll-depth **≥60%** OR **~30s dwell**, whichever first; detect touch via `matchMedia('(hover: none)')`.
- **Once/session** via `sessionStorage` (`grifon_exit_popup_shown`). Suppress when authenticated; mount on landing only.

**Implementation:**
1. `components/ui/useExitIntent.ts` (new) — `{ triggered, dismiss }`; desktop mouseout + mobile scroll/timer + once-per-session guard.
2. `components/ui/ExitIntentModal.tsx` (new) — `createPortal` to `<body>` (same pattern as the SiteHeader mobile menu so `fixed` escapes any backdrop-filter ancestor — see `agent_lessons.md` 2026-05-30), `motion`+`AnimatePresence` (reduced-motion safe), `GlassPanel`/`GoldButton`, thin **gold** urgency bar at top, headline + subcopy + one CTA (`onEnterApp`) + close X.
3. Mount in `components/LandingPage.tsx`, gated on `!isAuthenticated` (pass from `App.tsx`).

**Files:** new `components/ui/useExitIntent.ts`, `components/ui/ExitIntentModal.tsx`; edit `components/LandingPage.tsx` (mount + auth gate), possibly `App.tsx` (pass `isAuthenticated`). Reuse `GlassPanel`, `GoldButton`, `createPortal`, `motion/react`, `FOUNDING_OFFER`.

---

## Verification (both)
`npm run build` + `npm run design:lint` + `brand-check`. Playwright at **390px & 1440px**:
- **A** (via the `?devpreview` checkout mock pattern from the 2026-05-30 session): toggle flips Monthly↔Annual, price/breakdown update, loss-aversion callout shows on monthly with correct savings (Pro ₱4,992), switch reversible + celebrated, reservation timer NOT reset, add-on persists across switch. Annual path already runs in prod → no new PayMongo test required.
- **B:** desktop mouseout-to-top fires the modal **once**; mobile scroll-60%/30s fires once; dismiss → no reappear that session; never shows when logged in; reduced-motion safe.

## Guardrails
- No new pricing (annual already in `PLAN_CATALOG`); no email/nurture infra (Start-Free recapture only).
- Honest + reversible; no pre-checked annual; no nagging popup.
- Feature A's server edit is **additive display fields only** — keep the amount server-authoritative. `api/billing.ts` is payment-critical; if the edit grows beyond additive fields, escalate.
- Next session: draft a `/goal` per feature citing the build-gate pass + `brand-check` + `verify-changes`.
