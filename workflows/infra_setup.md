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

### 2. PayMongo (Billing, PH market) — TEST MODE LIVE 2026-05-02
- [x] Test API keys in `.env` (`PAYMONGO_PUBLIC_KEY`, `PAYMONGO_SECRET_KEY`, `PAYMONGO_WEBHOOK_SECRET`)
- [x] Same three keys added to Vercel (Production scope)
- [x] Test webhook registered in PayMongo Test Mode dashboard at `https://app.grifon.ai/api/webhook` listening for `checkout_session.payment.paid`
- [x] Webhook signing secret pasted into Vercel `PAYMONGO_WEBHOOK_SECRET` (matches PayMongo's value)
- [x] Products/prices match `GrifonPricingPage.tsx` (catalog defined in `api/_lib/paymongo.ts:23-45`)
- [x] Checkout tested end-to-end with `4343 4343 4343 4345` — subscription row activated in Supabase, UI tier reflected
- [ ] Merchant account verified (required to flip to Live Mode — see Gate 3-prod in `launch_readiness.md`)
- [ ] Live mode setup (repeat all the above with `sk_live_...` and `whsk_live_...`)

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

### 6. Subdomain: app.grifon.ai — LIVE 2026-05-02
- [x] Vercel project `grifon-command` created (team `neilmaglayabusiness22-2085s-projects`, Hobby plan)
- [x] Linked to GitHub repo `yopiheart/grifon-command`, branch `main` (every push auto-deploys)
- [x] `app.grifon.ai` attached, SSL valid
- [x] Production env vars pasted (Supabase URL/anon/service-role, Gemini, ElevenLabs, APP_URL, APP_ENV=production, GRIFON_VOICE_CLONING_ENABLED=false)
- [x] First production deploy reachable at https://app.grifon.ai
- Outstanding: Vercel billing address incomplete (Settings → Billing → Update Address) — non-blocking but Vercel will eventually nag

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
- **PayMongo webhooks must be registered manually in their dashboard** — not implicit from env vars, and Test Mode and Live Mode are completely separate. Each generates its own signing secret. If `subscriptions` rows aren't appearing after a successful payment, check Vercel function logs for `/api/webhook` first: no entries → unregistered, 400 → secret mismatch, 500 → DB error. Cost ~30 min on 2026-05-02 first deploy.
