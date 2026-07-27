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
- [x] Test webhook registered in PayMongo Test Mode dashboard, listening for `checkout_session.payment.paid`
  - [ ] **2026-06-13 TODO: re-point webhook URL from `https://app.grifon.ai/api/webhook` → `https://grifon.ai/api/webhook`** (canonical-domain cutover). The 308 redirect makes the old URL still resolve, but webhooks POST — don't rely on a redirect for them; point at the apex directly.
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

### 5. Domain: grifon.ai — PRIMARY / CANONICAL 2026-06-13
- [x] Registrar: Vercel (DNS auto-managed, no nameserver config needed)
- [x] `grifon.ai` purchased
- [x] Nameservers configured (handled by Vercel since they sold the domain)
- [x] **`grifon.ai` attached to Vercel project as Production primary — serves the whole app (landing + dashboard, path-based routing). Verified 200 + SSL.**
- [x] **`www.grifon.ai` attached (serves app; canonical tag points to apex grifon.ai)**
- [x] **Canonical-domain cutover 2026-06-13:** every hardcoded `app.grifon.ai` SEO/canonical ref in repo replaced with `grifon.ai` (index.html, sitemap.xml, robots.txt, llms.txt, .env.example) — commit `a532276`. Routing is path-based, no app-logic change.
- [x] Supabase Auth: Site URL → `https://grifon.ai`; Redirect URLs include `https://grifon.ai/**` (kept `app.grifon.ai/**` for in-flight magic-link cutover)
- [x] Vercel Production env `APP_URL=https://grifon.ai` (drives PayMongo success/cancel in `api/checkout.ts:48`)

### 6. Subdomain: app.grifon.ai — NOW 308-REDIRECTS TO grifon.ai (was primary, 2026-05-02 → 2026-06-13)
- [x] Vercel project `grifon-command` created (team `neilmaglayabusiness22-2085s-projects`, Hobby plan)
- [x] Linked to GitHub repo `yopiheart/grifon-command`, branch `main` (every push auto-deploys)
- [x] `app.grifon.ai` attached, SSL valid
- [x] **`app.grifon.ai` → 308 Permanent Redirect → `grifon.ai` (verified: `/` and `/pricing` both 308). Kept alive indefinitely so old links/bookmarks/indexed URLs pass SEO equity to apex.**
- [x] Production env vars pasted (Supabase URL/anon/service-role, Gemini, ElevenLabs, APP_URL, APP_ENV=production, GRIFON_VOICE_CLONING_ENABLED=false)
- [x] First production deploy reachable at https://app.grifon.ai (now redirects)
- Outstanding: Vercel billing address incomplete (Settings → Billing → Update Address) — non-blocking but Vercel will eventually nag

### 7. Meta Ads CLI (paid-ads execution) — ✅ DONE 2026-07-27

Prerequisite for the `grifon-ad-strategist` skill to pull live insights / draft
spend commands. **This is the full runbook** — it took ~90 minutes of dead ends
the first time because Meta splits one token across six screens and its own
error messages point the wrong way. Follow it in order and it's ~15 minutes.

> **The runbook is client-agnostic.** Redo it per business portfolio, not per
> client — one system user can hold many ad accounts and Pages. The Oceanides /
> Kuya Marvin instance (all live IDs) is recorded in
> [`clients/oceanides/kuya-marvin/ads/NEXT-SESSION.md`](../clients/oceanides/kuya-marvin/ads/NEXT-SESSION.md).

**Order matters — the app must exist before the system user can be finished.**

1. **App first.** `developers.facebook.com/apps` → **Create App**.
   - Use cases (multi-select): **Create & manage ads with Marketing API** +
     **Measure ad performance data with Marketing API** + **Manage everything on
     your Page**. Do NOT pick legacy *Other* ("going away soon") or *Create an
     app without a use case* (ships zero permissions).
   - 🔴 On the **Business** step, select the owning **business portfolio**. Miss
     this and the app is portfolio-less and the whole flow dead-ends.
   - "Development mode" / *Unpublished* is FINE — App Review is only for other
     people's data. Don't click **Become a Tech Provider**.
2. **System user.** `business.facebook.com/settings` → Users → **System users**
   → Add, role **Admin**.
   - ⚠️ **Meta rejects names containing "Ads" or "API"** with the useless error
     *"You choose an invalid System User name."* `Grifon Ads CLI`,
     `Ads Automation`, `Marketing API` all failed; `Oceanides Automation` passed.
3. **Assign assets** (this is where "the token works but returns nothing" is
   born) → **Assign assets**, once per type:
   - **Ad accounts** → the account → *Manage campaigns*
   - **Facebook Pages** → the Page → *Full control*
   - **Apps** → the app from step 1 → see step 4
   - The `Apps` asset type **only appears once the portfolio owns an app** — that
     is why step 1 comes first. The `Installed apps` tab is read-only; it has no
     Add button, so don't hunt for one there.
4. 🔴 **`Develop app` is NOT enough — the single biggest trap.** Meta runs two
   look-alike permission systems: *asset access* (Business Settings) and *app
   role* (app dashboard). `Develop app` maps to app role **Developer**, and
   Generate token then dies with *"No permissions available — Assign an app role
   to the system user"* and an **empty** scope list.
   **Fix:** System users → Assigned assets → **Apps → Manage → toggle
   `Manage app` (Full access)** = Administrator. Now the scope list populates.
   Do this in Business Manager, not in the app dashboard's *App roles → Roles* —
   Meta's own banner there says Business Manager is the right place.
5. **If the Page isn't in the Assign-assets list**, it's owned by a personal
   profile, not the portfolio. Fix at **Accounts → Pages → Add → "Add a Page"**
   (use *Request access* instead when another business owns it — never *Claim*).
   ⚠️ "Add a Page" **transfers Page ownership** to the portfolio; there's a
   cooldown on undoing it. Deliberate act, not a shortcut.
6. **Generate token** → select the app → expiration **Never** (60 days dies
   silently two months later on a defreezer machine, long after anyone
   remembers this runbook) → tick:
   `ads_management`, `ads_read`, `business_management`, `read_insights`,
   `pages_show_list`, `pages_read_engagement`, `pages_manage_metadata`,
   `pages_manage_ads`.
   Skip `catalog_management` unless the campaign uses a product feed / dynamic
   ads. Skip `facebook_branded_content_ads_brand`, `pages_manage_posts`,
   `pages_manage_engagement`, `pages_read_user_content`, `threads_business_basic`.
   **Shown once — copy immediately.**
7. `ACCESS_TOKEN=<token>` + `AD_ACCOUNT_ID=<id>` in `.env` (never paste into chat
   — see Edge Cases). **Keep the token in a password manager**: the defreezer
   eats `.env` every reboot and the token cannot be re-displayed.
8. Verify: `pip install meta-ads` → `meta auth status` →
   `meta ads adaccount list`. **Exit code 3 = auth**, and it is almost always a
   missing asset assignment (step 3/4), not a bad token.
9. **Revoke immediately** if `.env` lands in git, the token is pasted anywhere
   else, or an unrecognised campaign appears — a `Never` token with
   `ads_management` can spend real money until revoked.

Not blocking, but note for later: an **Unverified business** portfolio is fine
for system-user tokens on its own assets; business verification only gates
Advanced Access and higher rate limits.

**The token is a READ tool.** Per the `grifon-ad-strategist` guardrail the agent
never fires spend — campaigns are built by hand in Ads Manager or drafted for
Neil to paste. So never let token setup block a launch.

- [ ] TikTok has no CLI — run TikTok Ads Manager by hand; the skill drafts structure/decisions, Neil executes

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
