# Next-session conversion backlog (2 features)

> Approved plan, **deferred to next session** (kept out of the current session to limit context).
> Saved in-repo because the cafe-PC defreezer wipes `~/.claude/`. Resume from here.
> Both features are frontend-heavy + reuse existing infra; Feature A has one small **additive, non-amount**
> server change. No TUNED prompt/schema files involved.

---

## STATUS (updated 2026-05-31)

**Both original features SHIPPED ✅ — this file is now the deferred-queue tracker.**

- **Feature A — SHIPPED** (annual upsell `b160281`, polished across `ab6aafb`, `3031ca9`, `8edd78a`):
  cycle toggle + loss-aversion callout, terms checkbox above Pay, in-app policy view with
  state-preserving "Back to checkout", value-stack checkmark inclusions, guarantee in Order Summary
  with the rotating gold light, glossy gold CTA, sentence-case terms consent.
- **Feature B — SHIPPED** (`8906e57`, copy fixes `d692101`/`bc246f9`): desktop-only exit-intent
  "FINAL TAKE" clapboard (`components/ui/useExitIntent.ts` + `ExitIntentModal.tsx`); mobile trigger
  killed per CMO; Taglish objection-killer copy; honest founding-seat scarcity.

---

## NEXT SESSION — start here (3 deferred items, in priority order)

Deferred 2026-05-31 to protect the context window. Each has enough scope to resume cold.

### 1. Dashboard quota-wall tier-upgrade (Creator→Pro→Business) — the next conversion build
- **What:** A contextual upgrade nudge inside the app when a user hits a plan limit ("15/15 video
  workflows used → unlock 40 with Pro"). This is the agreed home for tier upsells — deliberately NOT
  at checkout (re-deciding the plan at the pay moment risks the primary conversion).
- **Why it's the highest-intent moment:** they've felt the value and hit the wall — the pain sells the
  upgrade. Highest-converting upgrade trigger, separate from the initial purchase decision.
- **Where to start:** find where per-plan quotas are enforced/surfaced in-app (quota check in
  `api/_lib/` + wherever the dashboard shows usage). Reuse `PLAN_FEATURES` (`config/planFeatures.ts`)
  for the "what you unlock" diff, `GoldButton` → `startCheckout(nextTier, cycle)` from
  `services/billingService.ts`. Likely a new `components/` upgrade card/modal gated on usage ≥ cap.
- **Scope:** net-new feature; needs its own plan + `/goal`. Pull in `grifon-cmo` for the nudge copy
  and `grifon-creative-director` if it gets a distinctive design.

### 2. Monetise-style ₱-anchor value stack (checkout OrderSummary) — BLOCKED on Neil's numbers
- **What:** Upgrade the checkmark "What's included" list into a value stack with a struck-through ₱
  value per item + a struck total vs the actual price (the Monetise screenshot inspiration).
- **Blocker:** Pro already has the data (`valueStack` + ₱170,000 total in `GrifonPricingPage.tsx`
  ~line 119). **Creator + Business need per-item ₱ value numbers that Neil signs off on** — do NOT
  invent these (they're offer/pricing claims). Escalate to `grifon-cmo` with Neil.
- **Where:** `components/checkout/OrderSummary.tsx` (the inclusions block) + a shared value-stack data
  source (extend `config/planFeatures.ts` or a sibling). Reuse the `.value-line` strikethrough class
  already in the pricing page.

### 3. Interactive checkout Playwright smoke — verification debt
- **What:** The only checkout verification never run (build + brand-check covered the rest). Needs a
  **signed-in session** (checkout is auth-gated) OR a `?devpreview` mock that doesn't exist yet.
- **Test at 390px & 1440px:** cycle toggle flips + price/breakdown update; loss-aversion callout on
  monthly only (Pro → ₱4,992); reservation timer NOT reset on toggle; add-on persists across switch;
  Terms/Privacy → in-app page → "Back to checkout" restores phone/add-on/cycle/tick (card fields
  blank); guarantee rotating light visible; glossy CTA legible + ≥44px.
- **Note:** Playwright in the cafe-PC env hit a locked browser profile (needs `--isolated`). Neil can
  drive it logged-in, or build the `?devpreview` harness first.

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
