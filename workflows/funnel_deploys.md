# Funnel Deploys — Vercel project registry

Vercel settings live outside git; the defreezer wipes local CLI links. Every funnel deploy
gets recorded here (funnel-forge skill, step 8). Re-link after a wipe: `npx vercel link`
inside the instance dir (CLI login: Neil's Vercel account `neilmaglayabusiness22-2085`).

## grifon-starter (grifon-starter-v1) — deployed 2026-07-29

- **Production URL: https://grifon-starter.vercel.app** (public; SSO-protected deployment
  URLs are per-deployment — always share the alias, not the `-<hash>-` URL)
- Vercel project: `grifon-starter` · scope `neilmaglayabusiness22-2085s-projects`
- Deployed via CLI from `funnels/grifon-starter/` (`npx vercel deploy --prod --yes`);
  NOT git-connected — redeploys are manual CLI runs from the instance dir.
- Framework auto-detected (Vite MPA); `vercel.json` rewrites `/thank-you` → `/thank-you.html`.
- **Env vars (production) required by `api/lead.ts`:** `SUPABASE_URL` (= the value of
  `VITE_SUPABASE_URL` in root `.env`) + `SUPABASE_SERVICE_ROLE_KEY` (same name in root
  `.env`). Set via `npx vercel env add <NAME> production` from the instance dir (paste
  value at the prompt, ONE command at a time), THEN redeploy `--prod` — functions only
  pick env up on deploy. ✅ 2026-07-29: both SET and verified — full e2e green (POST →
  `{ok:true}` → row in `funnel_leads` w/ server stamps → test row deleted). Neil phone
  eyeball passed ("gumana lahat ng buttons"). Funnel→product email hand-off live: thank-you
  bridge CTA → `grifon.ai/login?...&email=<lead>` → OTP field prefilled (App.tsx, pushed
  same day — main app auto-deploy carries it to grifon.ai).
- Leads land in Supabase `public.funnel_leads` (project `GRIFON AI` / varoqxjccqmskzeejagn),
  `funnel_id = 'grifon-starter-v1'`. Live-test convention: submit with `funnel_id`-visible
  test email, verify row via `execute_sql`, delete the test row.
- Meta Pixel: OFF (no `tracking.metaPixelId`). Domain: vercel.app alias for MVP; move to a
  grifon.ai subdomain when ads start pointing here.
