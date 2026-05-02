# Workflow: Infrastructure Setup & Tracking

**Objective:** Stand up the external services GRIFON needs to run in production and keep a live status of what's done.

## Required Inputs

- Operator is ready to create accounts and paste credentials
- `.env` file exists locally (copy `.env.example`)

## External Services Checklist

Track status in this section. Update as items complete.

### 1. Supabase (Auth + Database) — NOT STARTED
- [ ] Account created (neilmaglaya.business22@gmail.com)
- [ ] Project created (name: `grifon-command`, region: closest to PH)
- [ ] Copy `SUPABASE_URL`, `SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY` into `.env`
- [ ] Enable Email auth provider
- [ ] Schema: `users`, `projects`, `generated_assets`, `subscriptions`
- [ ] Row Level Security policies
- [ ] Replaces hardcoded `ALLOWED_EMAILS` + password in `App.tsx`

### 2. PayMongo (Billing, PH market) — NOT STARTED
- [ ] Merchant account verified
- [ ] API keys pulled (test + live)
- [ ] `PAYMONGO_PUBLIC_KEY`, `PAYMONGO_SECRET_KEY`, `PAYMONGO_WEBHOOK_SECRET` in `.env`
- [ ] Webhook endpoint registered: `https://app.grifon.ai/api/paymongo/webhook`
- [ ] Products/prices match `GrifonPricingPage.tsx`
- [ ] Checkout tested end-to-end (test card)

### 3. Google Cloud Console (OAuth) — NOT STARTED
- [ ] Project created
- [ ] OAuth consent screen configured
- [ ] Client ID + secret generated
- [ ] `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, `GOOGLE_REDIRECT_URI` in `.env`
- [ ] Scopes enabled: Drive, Sheets, Slides (as needed by workflows)
- [ ] Test user added (neilmaglaya.business22@gmail.com)

### 4. Gemini API — EXISTS (verify)
- [ ] Key present in `.env` as `GEMINI_API_KEY`
- [ ] Quota confirmed (which tier? which models?)
- [ ] Billing alert set

### 5. Domain: grifon.ai — PURCHASED 2026-05-02
- [x] Registrar: Vercel (DNS auto-managed, no nameserver config needed)
- [x] `grifon.ai` purchased
- [x] Nameservers configured (handled by Vercel since they sold the domain)

### 6. Subdomain: app.grifon.ai — NOT CONFIGURED
- [ ] Vercel project created and linked to this repo
- [ ] Add `app.grifon.ai` in Vercel → Project → Settings → Domains (DNS + SSL auto)
- [ ] Production env vars pasted into Vercel (Supabase, PayMongo public, Gemini, ElevenLabs, Supabase service role)
- [ ] First production deploy succeeds and reachable

## Tools

No scripts yet. Each item is a manual console action. As we automate:
- `tools/verify_supabase.py` — confirm URL+key can connect
- `tools/verify_paymongo.py` — ping API, list products
- `tools/verify_google_oauth.py` — test auth round-trip

## Procedure

1. Work the list top-to-bottom. Supabase and domain first (everything else depends on them).
2. After each item, paste the credential or status back to the agent.
3. Agent updates this file's checkbox and commits.
4. Once Supabase is up, trigger `workflows/replace_plaintext_auth.md` (to be written).

## Edge Cases / Learnings

- Never paste secrets into the chat. Place them in `.env` and tell the agent "done." The agent verifies by running the relevant `tools/verify_*.py`.
- PayMongo requires a Philippine business registration — have that ready before starting merchant verification.
- Vercel is the easiest host for a Vite React app; free tier will cover early usage.
