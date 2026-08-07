# Auto-Renew Subscription — Engineering Workstream

**Last updated:** 2026-05-08
**Status:** SCOPED, NOT STARTED
**Branch (when started):** `auto-renew` (cut from `checkout-redesign-preview` once that's merged)
**Blocks production launch:** No — manual-renewal flow works today; auto-renew is the LTV upgrade.

---

## Why this exists

**Founder decision (2026-05-08, Neil):** Grifon should auto-renew monthly subscriptions like Claude/OpenAI/Gemini, not require manual re-purchase every 30 days.

**CMO read at the time:** Recommended NO auto-renew as a Filipino-SMB trust moat. Founder overruled — wants LTV parity with billion-dollar SaaS. Logged. CMO defers to founder.

**Why this is its own workstream and not a copy fix:** The current PayMongo Payment Intents flow is **one-time only.** The backend doesn't save card-on-file, doesn't run a billing cron, and doesn't re-charge customers. Shipping copy that says "auto-renews monthly" without backend support would be a broken promise — worse trust break than no auto-renew at all.

**Pre-merge gate:** Live PayMongo smoke test on the `auto-renew` branch must successfully:
1. Charge a test card today
2. Re-charge the SAME saved card 30 days later (or via cron-triggered manual run for testing)
3. Send pre-charge reminder email
4. Allow one-click cancel from account settings
5. Stop charging immediately on cancel

---

## The product decision: cards vs e-wallets

**This is a Neil decision, not a tech detail.** Surface it before writing code.

| Payment method | Native auto-recurring? | Implication |
|---|---|---|
| Card | ✅ Yes — PayMongo Customer + Payment Method APIs let you save and re-charge | Full auto-renew works |
| GCash | ❌ No — each charge requires user re-confirmation in the GCash app | Customer must actively re-pay every 30 days |
| Maya | ❌ No — same as GCash | Customer must actively re-pay every 30 days |
| GrabPay | ❌ No — same as GCash | Customer must actively re-pay every 30 days |

**Three product options:**

**Option 1 — Hybrid model (recommended):** Cards auto-renew. E-wallets are manual ("Renew now" email + button when 30 days approaches). Copy says: *"Cards auto-renew monthly. E-wallet customers get a renewal reminder 3 days before access ends."*

**Option 2 — Card-only at checkout:** Drop GCash/Maya/GrabPay tabs. Auto-renew works for everyone. **Risk:** craters PH conversion. Most Bryan-avatars don't have credit cards. Likely 60-80% conversion drop.

**Option 3 — E-wallet auto-renew via stored proxy:** PayMongo doesn't natively support this. Would require building a custom "stored e-wallet" flow that's almost certainly outside contract terms. Skip.

**My recommendation: Option 1.** Be honest in copy that the renewal model differs by payment method. Most card-paying customers (likely Olivia avatar) get the LTV benefit. E-wallet customers (likely Bryan avatar) get a respectful reminder flow.

---

## Backend tasks

### 1. PayMongo card-on-file integration

**Files to modify:**
- [api/_lib/paymongo.ts](../api/_lib/paymongo.ts) — APPEND new helpers (do not edit existing tuned signatures `createCheckoutSession`, `verifyWebhookSignature`, `createPaymentIntent`, `attachPaymentMethod`, `retrievePaymentIntent`, `createEwalletPaymentMethod`).

**New helpers needed:**
- `createCustomer({ email, name, metadata })` — PayMongo Customer object
- `attachPaymentMethodToCustomer({ customer_id, payment_method_id })` — saves card-on-file
- `chargeStoredPaymentMethod({ customer_id, payment_method_id, amount_centavos, description, metadata })` — re-charges saved card
- `listCustomerPaymentMethods({ customer_id })` — for cancel UI display

**Reference docs:** PayMongo's Customer API and Payment Methods API. Cards-on-file require the customer to consent at first charge — handled via the `setup_future_usage: 'off_session'` flag on the initial PaymentIntent.

### 2. Database schema

**File:** Supabase migrations directory (find via `git ls-tree -r main --name-only | grep migrations`)

**New columns on `subscriptions` table:**
```sql
ALTER TABLE subscriptions ADD COLUMN paymongo_customer_id text;
ALTER TABLE subscriptions ADD COLUMN paymongo_payment_method_id text;
ALTER TABLE subscriptions ADD COLUMN renewal_model text NOT NULL DEFAULT 'manual'; -- 'auto_card' | 'manual_ewallet'
ALTER TABLE subscriptions ADD COLUMN next_renewal_at timestamptz;
ALTER TABLE subscriptions ADD COLUMN cancelled_at timestamptz;
ALTER TABLE subscriptions ADD COLUMN last_renewal_attempt_at timestamptz;
ALTER TABLE subscriptions ADD COLUMN last_renewal_failure_reason text;
```

**New index:**
```sql
CREATE INDEX idx_subscriptions_next_renewal ON subscriptions (next_renewal_at)
  WHERE renewal_model = 'auto_card' AND cancelled_at IS NULL;
```

### 3. Renewal cron

**File:** new — `api/cron/renew-subscriptions.ts` (not built)

**Cron schedule:** every hour at :15 (offset from existing `cleanup-gemini-videos` cron at 03:00). Add to [vercel.json](../vercel.json) `crons` array:
```json
{ "path": "/api/cron/renew-subscriptions", "schedule": "15 * * * *" }
```

**Logic:**
1. Query `subscriptions WHERE renewal_model = 'auto_card' AND next_renewal_at <= NOW() AND cancelled_at IS NULL`
2. For each: call `chargeStoredPaymentMethod`
3. On success: update `next_renewal_at = next_renewal_at + 30 days`, increment `last_renewal_attempt_at`
4. On failure: increment `last_renewal_failure_reason`, retry policy:
   - Day 1: retry once after 6 hours
   - Day 3: send "card declined" email, retry
   - Day 7: suspend access, send "subscription paused" email
   - Day 14: cancel automatically, send "subscription cancelled" email

**Vercel function count check:** currently at 12 (the Hobby cap). Adding this cron pushes us to 13 — need to consolidate or upgrade. Two options:
- Fold `renew-subscriptions` into existing `cron/cleanup-gemini-videos.ts` as a single cron handler that switches on `req.query.task` (mirrors the `api/billing.ts` consolidation pattern from 2026-05-08)
- Upgrade Vercel to Pro ($20/mo)

**Recommended: consolidate.** Same pattern we already used. Keep Hobby for now.

### 4. Webhook updates

**File:** [api/webhook.ts](../api/webhook.ts)

**New events to handle:**
- `payment.paid` — when stored card is charged successfully via cron
- `payment.failed` — when stored card charge fails
- `payment_method.detached` — when customer removes card (treat as cancel)

**Existing events stay:** `payment_intent.succeeded` and `checkout_session.payment.paid` continue to work for first-charge flows.

### 5. Cancellation API

**File:** new — [api/billing.ts](../api/billing.ts) — APPEND new action: `cancel`

**Pattern:** mirror existing actions. Auth → rate-limit → mark `cancelled_at = NOW()` → optionally call PayMongo to detach payment method → return success. The user keeps access until `next_renewal_at` (paid period not refunded for cancel; refund is a separate flow handled by the 7-day money-back guarantee).

---

## Frontend tasks

### 1. Initial checkout — opt into auto-renew

**File:** [components/CheckoutPage.tsx](../components/CheckoutPage.tsx)

**Changes:**
- Surface the renewal model PROMINENTLY before payment, not buried in fine print
- Card path: show "Auto-renews monthly · Cancel anytime" trust badge
- E-wallet path: show "Manual renewal · We'll remind you 3 days before access ends" trust badge
- Update the `authorizationText` below the button to match the chosen model:
  - Card: "By clicking Pay, you authorize Grifon Command to charge ₱2,497.00 now and on a recurring monthly basis until you cancel from your account settings."
  - E-wallet: "One-time payment for 30 days of access. We'll email you 3 days before access ends with a renewal link."

### 2. Account settings — cancel UX

**File:** find via `grep -r 'AccountSettings\|account_settings\|/settings'` — likely a `components/Settings*.tsx` or similar.

**New UI block:**
- "Subscription" section showing: current plan, next renewal date, payment method last 4 (cards) or wallet name (e-wallets)
- "Cancel subscription" button — opens confirm modal — on confirm, calls `/api/billing?action=cancel`
- Confirmation modal copy: "Cancel ₱2,497/mo subscription? You'll keep access until [next_renewal_at]. After that, save and continue without losing your work."

**This must exist before auto-renew copy ships.** "Cancel anytime" is a lie if there's no UI to cancel.

### 3. Renewal failure UX

**File:** [App.tsx](../App.tsx) or a new modal in [components/](../components/)

When `last_renewal_failure_reason` is set on the user's subscription, show a top-bar banner:
> "We couldn't charge your card. Update payment method to keep your subscription active."

Linking to a "Update payment method" flow that creates a new SetupIntent and re-attaches.

---

## Email infrastructure

**Decision required:** Resend vs Postmark vs SendGrid vs PayMongo's transactional email.

**Recommended: Resend.** Cheap, dev-friendly, has a free tier, plays nicely with React-Email templates.

**Templates needed (HTML + plain text):**
1. **Welcome / first charge receipt** (BIR-compliant — VAT itemized) — already on the backlog from `checkout_redesign.md`
2. **Pre-renewal reminder** (cards: "Your card will be charged ₱2,497 in 3 days") — send T-3 days
3. **Renewal success receipt** (cards: "We charged ₱2,497. Subscription active until [date]") — send on successful cron charge
4. **Renewal failed** (cards: "Your card was declined. Update payment method to avoid losing access") — send on first failure
5. **Subscription paused** (cards: "Access paused after 7 days of failed charges") — send on day 7
6. **Subscription cancelled — auto** (cards: "Access ended after 14 days") — send on day 14
7. **E-wallet renewal reminder** (e-wallets: "Your access ends in 3 days. Renew now to keep going.") — send T-3 days
8. **Cancellation confirmation** (both: "Subscription cancelled. Access until [date].") — send on cancel

**Templates live at:** `emails/` (new directory). Use React-Email or HTML strings — pick once, stick with it.

---

## Pre-merge checklist

Before merging `auto-renew` to main:

- [ ] All migrations applied to Supabase staging
- [ ] PayMongo dashboard → Webhooks → add events: `payment.paid`, `payment.failed`, `payment_method.detached`
- [ ] Vercel env vars set in BOTH Production and Preview: `RESEND_API_KEY` (or chosen provider key)
- [ ] Live PayMongo smoke on preview URL:
  - [ ] Card path: pay → see "auto-renews monthly" badge → renewal cron run manually fires charge → success email received
  - [ ] Card path: cancel from account settings → renewal cron skips this user → "cancellation confirmed" email received
  - [ ] Card path: simulated card decline → retry policy fires → "renewal failed" email received → access pauses on day 7
  - [ ] E-wallet path: pay → see "manual renewal" badge → T-3 reminder email sent on the right day
- [ ] All 8 email templates render correctly (test via Resend dev mode)
- [ ] Vercel function count ≤ 12 (consolidate cron if needed)
- [ ] Build clean, all tests pass

---

## Open questions (answer before starting)

1. **Hybrid renewal model — confirm Neil agrees.** Cards auto-renew; e-wallets stay manual with reminder emails. Or does Neil want all-manual (current) or all-card-only (drop e-wallets)?
2. **Email provider.** Resend (recommended) vs Postmark vs SendGrid vs PayMongo TX email. Consider price, dev experience, deliverability in PH.
3. **Refund flow.** 7-day money-back guarantee is currently surfaced on /checkout but the actual refund-issuance API hasn't been built. When is that scheduled? It's a parallel workstream that affects the trust copy.
4. **Annual cycle.** Annual subs renew yearly. Same cron logic, different window (`next_renewal_at + 365 days`). Confirm the annual-flow gets the same treatment, not a separate workstream.
5. **Trial period.** Some SaaS gives 7 days free at signup. Grifon currently does not. Does Neil want one? Adds another flag (`trial_ends_at`) and changes the auto-renew copy.

---

## First concrete step (when starting tomorrow / next session)

1. **Read this doc.** Confirm the hybrid renewal model (Option 1) is still the call. If Neil's changed his mind, re-scope.
2. **Cut the branch:** `git checkout -b auto-renew` from current main (or from merged `checkout-redesign-preview` once that's shipped).
3. **Start with the migration.** Adding the new columns to `subscriptions` is the lowest-risk first commit. It unblocks everything else but doesn't change behavior.
4. **Then PayMongo helpers.** Append the 4 new helpers to `api/_lib/paymongo.ts` — they're additive, no risk to existing tuned functions.
5. **Then the cron.** Build the renewal handler. Test with hand-rolled fixture data.
6. **Then frontend.** Cancel UX in account settings → trust badge updates on /checkout.
7. **Then email infra.** Resend + 8 templates.
8. **Then live smoke.** Run the full pre-merge checklist on a preview deployment with PayMongo sandbox.

**Realistic timeline:** 2-3 focused sessions if no blockers. 4-5 if Resend integration or Supabase migration hits unexpected friction.

---

## Files this workstream will touch

**Net-new:**
- `api/cron/renew-subscriptions.ts` (or folded into existing cron)
- `emails/` directory (8 templates)
- Supabase migration file
- Resend SDK init in a new `services/emailService.ts`

**Modified (additive only — preserve TUNED rules):**
- `api/_lib/paymongo.ts` — APPEND new helpers
- `api/billing.ts` — APPEND `cancel` action
- `api/webhook.ts` — APPEND new event branches
- `components/CheckoutPage.tsx` — trust badge swap
- `components/Settings*.tsx` (or new) — cancel UX
- `App.tsx` — possibly a renewal-failure banner
- `vercel.json` — new cron entry (or consolidated cron path)

**Untouched (TUNED — do not edit):**
- `api/_lib/paymongo.ts` existing function signatures
- `services/geminiService.ts` (entirely outside this workstream)
- All Step1–8 wizard components
- All Dashboard module components
