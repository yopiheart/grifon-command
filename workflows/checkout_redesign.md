# Checkout Redesign — Status & Next Steps

**Last updated:** 2026-05-07
**Branch:** `checkout-redesign-preview`
**Production status:** NOT MERGED. grifoncommand.com still serves PayMongo's hosted page.

---

## Why this exists

The old "checkout" was a redirect from grifoncommand.com to PayMongo's generic hosted page at `checkout.paymongo.com`. That page is locked to PayMongo's design, breaks brand continuity at the moment of payment, and is the conversion-critical step in the funnel. Replaced with a custom on-domain `/checkout` that uses PayMongo's lower-level Payment Intents API (we render the UI, PayMongo.js handles card tokenization in the browser).

**Inspirations validated against actual screenshots** (apple.com/ph/shop/bag, Higgsfield's Stripe checkout, Claude.ai's on-domain upgrade, Genspark's Stripe checkout):
- Apple PH → VAT-silent total (no surprise tax line)
- Higgsfield → two-column dark layout, brand-colored CTA, "₱2,081 / month, billed annually" reframe
- Claude → on-domain dark sophistication, prorated math, auth-checkbox-before-CTA
- Grifon = first to combine all three in PHP for the SE Asian SMB market

---

## What was built (4 slices, 4 commits)

| Slice | SHA | What |
|---|---|---|
| 1 | `a60f73e` | Visual MVP — CheckoutPage + sub-components, /checkout route added to App.tsx |
| 2 | `951b43c` | PayMongo Payment Intents backend — /api/billing/{intent,confirm,status}, webhook handles `payment_intent.succeeded` |
| 3 | `11159e4` | Card flow live — checkoutService client orchestrator, browser-side card tokenization (PCI SAQ A), /billing/3ds-return polling page |
| 4 | `bfe19bf` | E-wallet flow live — /api/billing/ewallet, GCash/Maya/GrabPay redirect handling |

---

## File map

### New files (12)

| Path | Role |
|---|---|
| [components/CheckoutPage.tsx](../components/CheckoutPage.tsx) | Top-level on-domain checkout page. Two-column desktop, single-column mobile. |
| [components/Billing3dsReturn.tsx](../components/Billing3dsReturn.tsx) | Post-3DS / post-e-wallet polling page. Polls /api/billing/status, shows succeeded/failed UI. |
| [components/checkout/OrderSummary.tsx](../components/checkout/OrderSummary.tsx) | Left column. Plan headline, big price, line item, promo-code slot, total + collapsible VAT breakdown. |
| [components/checkout/PaymentMethodTabs.tsx](../components/checkout/PaymentMethodTabs.tsx) | 4-tab picker: Card / GCash / Maya / GrabPay. Active tab uses Grifon Gold border. |
| [components/checkout/CardForm.tsx](../components/checkout/CardForm.tsx) | Card number + exp + CVC + name. Auto-formatted inputs, follows DESIGN.md focus styles. |
| [components/checkout/EwalletButtons.tsx](../components/checkout/EwalletButtons.tsx) | "Continue with GCash/Maya/GrabPay" button + redirect copy. |
| [services/checkoutService.ts](../services/checkoutService.ts) | Client orchestrator. `fetchIntent`, `processCardPayment` (tokenize → confirm), `processEwalletPayment`, `fetchStatus`, `formatPHP`. |
| [api/billing/intent.ts](../api/billing/intent.ts) | POST: create PaymentIntent + return VAT breakdown. |
| [api/billing/confirm.ts](../api/billing/confirm.ts) | POST: attach card PaymentMethod, return 3DS next_action. |
| [api/billing/ewallet.ts](../api/billing/ewallet.ts) | POST: create+attach e-wallet PaymentMethod, return wallet redirect URL. |
| [api/billing/status.ts](../api/billing/status.ts) | GET: poll PaymentIntent state for the return UI. |
| [api/_lib/billing-math.ts](../api/_lib/billing-math.ts) | `splitVatInclusive`, `monthlyEquivalent`, `annualSavingsVsMonthly`. Pure functions. |

### Modified files (4)

| Path | Change |
|---|---|
| [App.tsx](../App.tsx) | Added `'checkout'` and `'billing_3ds_return'` to Route union; path detection for `/checkout` and `/billing/3ds-return`; render blocks for both. |
| [services/billingService.ts](../services/billingService.ts) | `startCheckout` now navigates to `/checkout?plan=<id>&cycle=<cycle>` instead of redirecting to checkout.paymongo.com. |
| [api/_lib/paymongo.ts](../api/_lib/paymongo.ts) | APPENDED `createPaymentIntent`, `createEwalletPaymentMethod`, `attachPaymentMethod`, `retrievePaymentIntent`. Existing tuned signatures (`createCheckoutSession`, `verifyWebhookSignature`) untouched per [api/CLAUDE.md](../api/CLAUDE.md). |
| [api/webhook.ts](../api/webhook.ts) | Added `payment_intent.succeeded` branch alongside the existing `checkout_session.payment.paid` branch. Same upsert shape, same `subscriptions` table. |

---

## Verification done

- ✅ `npm run build` — tsc + Vite production build, both clean on every slice
- ✅ `npm run test` — 20/20 tests pass (paymongo.test.ts unaffected; tuned signatures preserved)
- ⏳ Live PayMongo smoke — NOT YET DONE. Pending below.

---

## Pre-merge checklist (do these before `git merge` to main)

### 1. Live smoke on the preview URL

Find the URL in Vercel dashboard → Deployments → `checkout-redesign-preview`. Pattern:
```
https://grifon-command-git-checkout-redesign-preview-<scope>.vercel.app/
```

Sign in (mobile is fine), then:
- [ ] Click `/pricing` → "Get Pro" → lands on `/checkout?plan=pro&cycle=monthly` (NOT checkout.paymongo.com)
- [ ] Order summary renders: plan name, ₱2,497.00 total, line item, "Have a promo code?" toggle, "View tax breakdown ▾"
- [ ] Card path: PayMongo test card `4343 4343 4343 4345`, any future exp, any CVC → expect 3DS challenge → returns to `/billing/3ds-return` → polls → `/billing/success` → user lands on Dashboard with Pro active in Supabase `subscriptions` table
- [ ] Failed-card test (`4571 7360 0000 0014`) → expect inline error in CardForm with "no charge has been made" copy
- [ ] GCash tab → "Continue with GCash" → PayMongo sandbox e-wallet flow → return → success
- [ ] Maya, GrabPay: same as GCash with respective sandbox flows

### 2. PayMongo dashboard webhook event

Go to PayMongo dashboard → Developers → Webhooks → your existing webhook listener. Add this event:
- [ ] `payment_intent.succeeded`

Without this, customers who pay through the new flow will NOT have their subscriptions activated. The existing `checkout_session.payment.paid` event keeps working for the old flow as a fallback.

### 3. Vercel environment variables

Confirm under Vercel → Settings → Environment Variables, BOTH `Production` and `Preview` environments have:
- [ ] `PAYMONGO_SECRET_KEY` (server, no `VITE_` prefix)
- [ ] `VITE_PAYMONGO_PUBLIC_KEY` (client, bundled into the browser)
- [ ] `PAYMONGO_WEBHOOK_SECRET` (already required for the existing webhook)

Confirm Supabase Auth → URL Configuration → Redirect URLs allows the preview pattern (`*-git-checkout-redesign-preview-*.vercel.app`) so sign-in works on the preview deployment.

### Then ship
```
git checkout main
git merge checkout-redesign-preview
git push origin main
```

---

## Best next thing to apply (after merge)

### Build the BIR-compliant email receipt

PayMongo's hosted-page receipt only fires for the old Checkout Sessions flow. With the new Payment Intents flow we lose that — and a VAT-registered Philippine business legally requires sending a receipt with the 12% VAT breakdown to the customer.

**Why this is the priority:** it's a compliance gap, not a polish task. Every successful payment through the new flow currently produces no customer-facing receipt with the VAT breakdown that BIR requires.

**Scope** (~half-day):
- Pick an outbound email provider (Resend recommended — clean SDK, ₱-friendly pricing, 100/day free)
- Add a templated HTML email function called from [api/webhook.ts](../api/webhook.ts) inside the `payment_intent.succeeded` branch
- Template needs: invoice number (use payment_intent_id), date, plan name + cycle, subtotal (VAT-exclusive), 12% VAT line, total — all derived from `splitVatInclusive` in [api/_lib/billing-math.ts](../api/_lib/billing-math.ts)
- Subject: `Receipt for your Grifon Pro subscription — Invoice #pi_xxxxx`
- From: `receipts@grifoncommand.com` (or whatever sender domain we have set up)

**Files to expect to touch:**
- New: `services/emailReceiptService.ts` (or `api/_lib/emailReceipt.ts` since it runs server-side from the webhook)
- New: `api/_lib/receiptTemplate.html.ts` (template builder)
- Modified: `api/webhook.ts` (call the receipt sender after successful upsert)
- Possibly: env var `RESEND_API_KEY`

---

## Other open items (not blockers)

- **Auto-renewal gap.** Current webhook treats every payment as one-shot (`current_period_end = now + 30d`). Claude/Stripe SaaS norms are auto-renew. Separate plan needed — involves a cron at PH-renewal-time-minus-3-days that creates new PaymentIntents. Until built, the on-checkout authorization disclaimer is honest about manual renewal.
- **PayMongo fee structure.** Confirm with PayMongo that Payment Intents charge the same merchant fee as Checkout Sessions before high-volume launch (no plan-pricing surprises).
- **PLAN_CATALOG re-basis.** The meaning of `monthlyCentavos` silently switched from VAT-exclusive (legacy) to VAT-inclusive (new flow). Customer-facing number unchanged, but the legal accounting basis flipped — flag with whoever does Grifon's books.
- **Old `/api/checkout` endpoint** kept as fallback during rollout. After 2 weeks of clean Payment Intents traffic, can be deleted along with `createCheckoutSession` in `api/_lib/paymongo.ts`.

---

## Tip option (rejected, documented for future)

User initially asked about adding a "tip" slot (5%/10%/15%/Custom) to the checkout. Strategist call: REJECTED.

**Reasons:**
- Tipping breaks pricing confidence on a fixed-price SaaS subscription
- No cultural fit for Filipino SMB B2B (Bryan/Olivia avatars don't tip software)
- Signals price might be soft — undermines the offer

**Validated alternatives** if "pay it forward" is genuinely desired:
- Annual prepay discount (already in the offer ladder)
- Referral credits
- Optional community sponsorship at the next plan tier
