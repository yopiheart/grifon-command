# Funnel Deploys — Vercel project registry

Vercel settings live outside git; the defreezer wipes local CLI links. Every funnel deploy
gets recorded here (funnel-forge skill, step 8). Re-link after a wipe: `npx vercel link`
inside the instance dir (CLI login: Neil's Vercel account `neilmaglayabusiness22-2085`).

## oceanides-price-page (oceanides-price-page-v1) — deployed 2026-08-02 · redeployed 2026-08-04

- ✅ **Redeploy 2026-08-04** (`dpl_6nru2wqWYxLatSoPYTcwrj4oTi6p`): **Tawag Cockpit v0**
  (`79495d9`, plano: `clients/oceanides/tawag-cockpit-plan.md`) — briefing card kada lead,
  3 objection cards, objection + follow-up log, 60s poll + tab badge + tunog. **SQL muna
  bago ang deploy na to** (UPGRADES section ng `supabase/funnel_leads.sql`, ni-run ni Neil
  sa SQL editor, Success) — kapag may susunod na fresh Supabase, parehong pagkakasunod.
  Verified live sa apex: `/ops` nagsi-serve ng `ops-Nam7GHNu.js`, kumpleto ang cockpit
  markers. ⚠️ Lesson: ang unang "deploy" ni Neil ay hindi tumalab (malamang dashboard
  Redeploy = inulit ang LUMANG build) — **CLI `npx vercel deploy --prod --yes` mula sa
  instance dir ang tamang daan, at i-verify ang live chunk pagkatapos, wag basta
  maniwala sa "ready".** ⏳ Kay Neil: eyeball ng naka-login na cockpit sa PC + phone
  (walang passphrase ang agent, sya ang huling gate) + ang usapan kay Zam (log = para
  sa cards, hindi panukat).

- ✅ **Redeploy 2026-08-03** (`dpl_CiKsvZNKjRJtFZ9PDaVwANWDfq2u`): dala na ng prod ang
  `3da6997` (Lead fires once per submission, not per page load). **Live e2e ulit, green:**
  totoong submit sa apex → `/api/lead` 200 → row sa `funnel_leads` (tamang `funnel_id`) →
  binura (204). **Pixel-level verify sa network log:** page load = PageView lang, ZERO
  `ev=Lead`; isang submit = **eksaktong ISANG `ev=Lead`** (`ec=1`); fresh reload
  pagkatapos = wala ulit. Buong page walk sa 390px: walang blocker, walang annoying —
  tanging `favicon.ico` 404 (cosmetic). ⏳ Events Manager eyeball (Lead na nakarating sa
  dataset `1050997330667084`) ay kay Neil sa phone — ang pixel fire ay kumpirmado na sa
  network level.

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
- 🆕 **`/presyo` (2026-08-04)** — ang presyo cheat sheet nina Zam at Ejay: location check
  (NCR ba o hindi), diagnosis buttons (siphoning / declog / lusong / DENR), copy-paste na
  spiels, presyo table, booking form, at mga bawal. **Parehong password ng `/ops`** (iisang
  cookie, may `?action=ping` na ang `api/ops.ts` para sa auth check nang walang PII).
  Source of truth ng laman: `src/pages/Presyo.tsx` mismo — kapag may bagong rate si Neil,
  i-edit doon tapos redeploy. Pinagmulan: nationwide pricing brief ni Neil 2026-08-04
  (₱5,000 lahat ng NCR; labas ng NCR = team lane, walang fixed rate, quote sa 1-2 oras;
  DENR docs ₱12k/₱15k; lusong ₱15-20k/₱20-50k). WALANG internal na puhunan/tubo sa page.
  ⚠️ Security note (smoke 2026-08-04): may naka-SAVE na password sa Chrome profile ng cafe
  PC para sa oceanidesph.com — nabubura sa defreezer pero buhay sa loob ng session. Wag
  magse-save ng password sa browser ng cafe PC; pag-rotate ng passphrase, nasa runbook sa baba.
- 🔐 **`OPS_PASSPHRASE`** ✅ Set 2026-08-04 — ang password ng `/ops` (talaan ng booking).
  **Hindi sya nakasulat kahit saan sa repo, sinadya.** Kay Neil at kay Zam lang sya
  nabubuhay. Fail-closed ang `api/ops.ts`: kapag wala ang var na to, 500 ang buong page —
  hindi sya "bumubukas na lang." Para magpalit:
  ```bash
  cd funnels/oceanides-price-page
  npx vercel env rm OPS_PASSPHRASE production -y
  printf '%s' 'BAGONG-PASSWORD' | npx vercel env add OPS_PASSPHRASE production
  npx vercel deploy --prod --yes
  ```
  ⚠️ **Bash `printf` LANG, hindi PowerShell pipe.** Ang `"pass" | npx vercel env add`
  sa PowerShell ay nagpapadala ng `\r\n` sa dulo; tinatanggal ni Vercel ang `\n` pero
  **naiiwan ang `\r`**, kaya laging 401 ang tamang password at walang error na
  magsasabi kung bakit. Nangyari 2026-08-04 sa unang rotation, isang buong
  redeploy ang nasayang bago nahuli. Na-rotate ang passphrase 2026-08-04 (kay
  Neil at Zam ang bagong value, wala pa ring kopya sa repo).
  ⚠️ Ang pagpapalit ay **nagpapalayas sa lahat**: HMAC ng passphrase ang cookie, kaya
  mag-lo-login ulit si Zam. Yun mismo ang gusto mong mangyari kapag may nakaalam nun.
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
- ✅ **DOMAIN LIVE 2026-08-02: https://oceanidesph.com** (+ `www.`, pareho 200 sa tatlong
  route). Binili sa **Vercel mismo** ($11.25/taon, expiry 2027-08-02), Vercel din ang
  registrar AT ang nameservers (`ns1/ns2.vercel-dns.com`), kaya walang third-party DNS na
  hahawakan. Naka-connect sa project via `npx vercel domains add <host> oceanides-price-page`.
  Live e2e ulit sa bagong domain: POST → `{ok:true}` → row (`page_url` = `https://oceanidesph.com/`)
  → binura. Ang `oceanides-price-page.vercel.app` ay gumagana pa rin, pero **ang apex na
  ang i-share at ang ituro ng ads.**
  - ✅ **Auto-renewal NAKA-ON** (Neil, 2026-08-02).
  - ✅ **VERIFIED SA META 2026-08-02.** Domain asset ID `1826135088763227`, portfolio
    **"Neil Maglaya" `771158756811875`**. Paraan: **meta-tag**, hindi DNS TXT —
    `<meta name="facebook-domain-verification" content="454ce2ho33u16gctyipxowtnh2eley">`
    nasa **static `<head>` ng `index.html`**.
    🔴 **HUWAG BURAHIN ANG TAG.** Tahimik ang pagkasira: gagana pa rin ang page,
    ang mawawala ay ang verification, ang kontrol sa web events (AEM), at ang
    attribution ng ads. Nakasulat ang babala sa file mismo.
    ⚠️ Umubra lang ito dahil naunang naayos ang static `<head>` sa parehong araw.
    Sabi mismo ng Meta: *"Verification will fail if the meta-tag code is outside the
    `<head>` section or in a section loaded dynamically by JavaScript."* Ang lumang
    JS-injected na `documentMeta.ts` ay hindi nya nakikita — babagsak sana kahit tama
    ang tag at kahit ilang beses pindutin, nang walang nagsasabi kung bakit.
  - ⏳ **HULING HAKBANG BAGO ANG ADS: i-connect ang pixel sa domain at i-configure ang
    web events.** Sa domain page → **Connect assets** → piliin ang dataset
    `1050997330667084`. Tapos Events Manager → **Aggregated Event Measurement** →
    Configure Web Events → `oceanidesph.com` → gawing **#1 priority ang `Lead`**.
    Kung hindi naka-configure, ang iOS traffic ang unang mawawala sa attribution.
- **Static `<head>` meta, hindi na JS-only (2026-08-02).** Ang `index.html` ay may hardcoded
  na `<title>`, `description` at Open Graph tags. Dati ay `documentMeta.ts` lang ang
  nag-se-set nila pagka-boot, at **hindi nagpapatakbo ng JS ang scraper ng Facebook** — kaya
  ang literal na nakikita ng bawat link preview at Messenger card ay `Loading…`. ⚠️ Kapag may
  binago sa `meta` sa `funnel.config.ts`, palitan din ang `index.html`. **Walang gate dito.**

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
