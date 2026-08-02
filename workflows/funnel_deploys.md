# Funnel Deploys — Vercel project registry

Vercel settings live outside git; the defreezer wipes local CLI links. Every funnel deploy
gets recorded here (funnel-forge skill, step 8). Re-link after a wipe: `npx vercel link`
inside the instance dir (CLI login: Neil's Vercel account `neilmaglayabusiness22-2085`).

## oceanides-price-page (oceanides-price-page-v1) — deployed 2026-08-02

- **Production URL: https://oceanides-price-page.vercel.app** (ito ang i-share, HINDI ang
  per-deployment na `-<hash>-` URL). Tatlong route, lahat 200: `/`, `/thank-you`, `/privacy`.
- Vercel project: `oceanides-price-page` · scope `neilmaglayabusiness22-2085s-projects`.
  CLI deploy mula sa `funnels/oceanides-price-page/` (`npx vercel deploy --prod --yes`);
  HINDI git-connected — manual CLI run bawat redeploy.
- `vercel.json` rewrites: `/thank-you` → `.html` at `/privacy` → `.html`.
- **Env vars (production):** `SUPABASE_URL` (= ang value ng `VITE_SUPABASE_URL` sa root
  `.env`) + `SUPABASE_SERVICE_ROLE_KEY`. ✅ Set 2026-08-02. **Naka-pipe mula sa `.env`,
  hindi manual paste** (`grep '^NAME=' ../../.env | cut -d= -f2- | tr -d '\r\n' | npx
  vercel env add NAME production`) — tinatanggal nito ang mismong failure mode na sumira
  ng key noon. Redeploy pagkatapos ng anumang env change; sa deploy lang kumukuha ang
  functions.
- ✅ **Live e2e green 2026-08-02:** POST sa prod `/api/lead` → `{ok:true}` → row sa
  `funnel_leads` na may tamang `client_id='oceanides'`, `funnel_id`, na-normalize na phone
  (`09171234567`), `consent`, `policy_version`, server-stamped `ip`, at qualifiers sa loob
  ng `utm` jsonb → test row DELETED (204, kumpirmadong wala na).
- **Meta Pixel: BUHAY** — `1050997330667084` ("Oceanides Price Page"), kumpirmadong nasa
  production bundle. Ad account `4165212657057538`, portfolio "Neil Maglaya"
  `771158756811875`. ⛔ Hindi ang Grifon Pixel `1921429268517231`.
  **Advanced Matching OFF at walang CAPI**, sinadya — tingnan ang dahilan sa
  `src/funnel.config.ts` sa itaas ng `tracking`.
- **Privacy Policy:** static `public/privacy.html`, walang JS at walang pixel.
  ⚠️ **Kailangan pa ring basahin ni Neil bago mag-live ang ads** — legal notice sya ng
  totoong kompanya. Kapag binuksan ang Advanced Matching o ang CAPI, MALI na ang linyang
  "hindi namin ipinapadala ang pangalan, email, o number mo sa Meta".
- **Domain: vercel.app alias pa lang.** Kailangan ng sariling domain BAGO ang unang ad:
  hindi mave-verify sa Meta ang `*.vercel.app`, at nahahati ang pixel data kapag pinalitan
  ang URL habang tumatakbo na ang ads.

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
