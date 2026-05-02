# Workflow: Launch Readiness

**Objective:** Track what's required before GRIFON COMMAND can take real paying users at `app.grifon.ai`.

This is the meta-workflow. It doesn't do the work itself — it points to the workflows that do, and tracks overall progress.

## Readiness Gates

### Gate 1: App works (no crashes) — CLOSED
- [x] `SignalModulator` voiceService crash fixed (P0) — 2026-04-18
- [x] `GenerateVideo` submit handler implemented (P1) — verified 2026-05-02 at `components/GenerateVideo.tsx:143`
- [x] Error boundaries around each module (P0) — verified 2026-05-02, every route wrapped in `App.tsx`
- [x] Gemini API key no longer throws at import (P0) — 2026-04-18
- Driven by: `workflows/fix_broken_feature.md`

### Gate 2: Real auth
- [x] Plaintext `ACCESS_PASSWORD` removed from `App.tsx` — 2026-04-18
- [x] `ALLOWED_EMAILS` hardcode removed — 2026-04-18
- [x] Supabase email/password login wired — 2026-04-18
- [x] Session persistence (refresh doesn't log out) — 2026-04-18
- [x] Logout button in Dashboard profile dropdown — 2026-04-18
- Driven by: `workflows/infra_setup.md` (Supabase section) — completed inline.

### Gate 3: Billing
- [ ] PayMongo merchant live
- [ ] Checkout flow matches `GrifonPricingPage.tsx` tiers
- [ ] Webhook updates Supabase `subscriptions` table
- [ ] Grace period / cancellation handled
- Driven by: `workflows/infra_setup.md` (PayMongo section) then `workflows/wire_billing.md` (to write)

### Gate 4: Production-safe code
- [ ] Input sanitization before Gemini calls (prompt injection)
- [ ] AI response sanitization (DOMPurify) (XSS)
- [ ] Rate limiting (per user, per endpoint)
- [ ] Form validation consistent across all modules
- [ ] Accessibility pass (labels, aria, keyboard nav)

### Gate 5: Mobile
- [ ] All modules responsive at 375px width
- [ ] No horizontal scroll on Dashboard
- [ ] `fix_mobile.js` replaced with proper responsive styles

### Gate 6: Domain + hosting — IN PROGRESS (1 of 4)
- [x] `grifon.ai` purchased (via Vercel registrar) — 2026-05-02
- [ ] `app.grifon.ai` DNS + SSL (add subdomain in Vercel project → auto SSL)
- [ ] Production build deployed (link repo to Vercel project, push to main)
- [ ] Env vars set in host (paste all `.env` keys into Vercel → Settings → Environment Variables)
- Driven by: `workflows/infra_setup.md`

### Gate 7: Legal / ops
- [ ] Terms of service
- [ ] Privacy policy (covers Gemini data handling)
- [ ] Support contact (email or in-app)
- [ ] Incident response plan (what if Gemini is down?)

## How to use

1. Review this list weekly.
2. Pick one unchecked item. Run its driving workflow.
3. Check the box. Update any linked audit/punch-list file.
4. Ship to `app.grifon.ai` staging as gates close. Don't wait for all gates to ship behind a feature flag.
