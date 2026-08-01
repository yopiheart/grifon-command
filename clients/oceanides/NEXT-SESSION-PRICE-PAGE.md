# NEXT SESSION — Oceanides: thank-you page pass, tapos DEPLOY

**Isinulat 2026-08-01 (gabi, pagkatapos ng redesign session).** Ang landing page ay
REDESIGNED na at **inaprubahan ni Neil**: *"Okay na saken tong first page."*

> **I-paste ito sa simula ng susunod na session:**
>
> ```
> Ituloy natin ang Oceanides. Basahin mo muna:
>   clients/oceanides/NEXT-SESSION-PRICE-PAGE.md
>   clients/oceanides/DESIGN.md
> Nasa branch feat/oceanides-price-page ang lahat, 30 commit. Hindi pa naka-merge.
> Una ang thank-you page pass, tapos Gate 2 read ni Neil, tapos deploy.
> ```

---

## Ano ang nangyari sa session na to (2026-08-01, commits `1e42e74..d7bdc40`)

Ang buong DGP-2 redesign (`workflows/design_swipe_file.md` sa main ang evidence base):

- **Hero price ticket** — ang "nakasulat na presyo" bilang print na quotation sa fold:
  ₱5,000 + tatlong posibleng dagdag + "Wala nang iba." Isang numero lang ang ticket
  (tanggal ang 4,000-litro sa presyo line — nagbabanggaan sa ₱5,000 sa mabilis na tingin).
- **Chapter grounds** — hindi na navy wall: gradient hero → navy-deep trust →
  paper na presyo chapter → navy kwento → paper FAQ → navy-deep form → void footer.
- **Papeles sa fold** — SEC Registered / BIR OR / DENR-partner chips sa hero; TOTOONG
  numbers sa trust band (DENR Cert of Treatment No., DENR ID, BIR TIN — verbatim kay
  Neil). **Tanggal na ang maling Region-7 DENR badge sa render.**
- **"Mahigit 1,000 na tangke"** — totoo, panindigan ni Boss Jay. HINDI ginamit ang
  imbentong "1,347".
- **Clients marquee** — 14 totoong client names (Toyota, Jollibee, Uniqlo, Ayala Land…)
  galing sa company profile deck. Unboxed wordmarks + amber diamonds. Pangalan, hindi
  logo (walang rights sa artwork; kung gustuhin ni Neil ang logos, kailangan ng files).
- **Before/after wipe slider** — interactive; **ang orientation ay NAHULI NI NEIL na
  baligtad at naayos** (kaliwa = BEFORE madumi, kanan = AFTER malinis). Provenance ng
  dalawang pairs: RESOLVED — totoong litrato, kumpirmado ni Neil (nakatala sa
  `scripts/build-assets.mjs`).
- **Si Gabriel sa page** — consent pirmado ✅, images approved ✅ (Neil 2026-08-01).
  "Si Gabriel ang haharap sa inyo" section bago ang FAQ.
- **Watermarks** — OCEANIDES diagonal na NAKAPASO sa webp files (proof, truck, van,
  Gabriel) via `build-assets.mjs`. Hindi CSS overlay.
- **==highlighter==** — amber marker sa 4 na load-bearing na linya (goldEmphasis).
- **DENR Certificate FAQ** — hiwalay na serbisyo: **₱12,000 bahay / ₱15,000 company**
  (hindi kasama sa ₱5,000). Nasa `workflows/oceanides_business_model.md` din.
- **Semento sa bakbak** — naitama: customer ang magbibigay; kung Oceanides, +₱500;
  pwedeng ipagawa sa iba ang pagsasara.
- **Thank-you tel CTA** — `tel:+639352589927` na, at naayos ang bug na nagdidikit ng
  `?email=` sa tel: URI (http bridge lang ang dinidikitan na ngayon).

## ▶ UUNAHIN SA SUSUNOD: 2 hakbang na natitira

1. ✅ **TAPOS — Thank-you page pass** (`e267a94`, 2026-08-01). Apat na chapter na
   sya, kapareho ng ladder ng landing: navy-gradient (kumpirmasyon, ito lang ang
   naka-gitna) → navy-deep (3 hakbang) → **paper** (ang magnet, bilang handout) →
   void (bridge CTA, abot hanggang ilalim). Nasa isang rail na rin ang chapter
   2-4 (304px lahat sa desktop). **TATLO** ang violation na naayos, hindi dalawa:
   ang `bg-black/30` at `font-mono` na nakalista dito, PLUS ang `text-brand-primary`
   sa block headings — nang lumipat ang magnet sa paper ground, ang amber TEXT
   doon ay naging 1.7:1, hard ban sa contrast floor. `accent-text` na sya ngayon
   (ocean, 5.7:1). Hindi ito lalabas kung hindi nailipat ang chapter.
   Bagong copy, dalawang string, para sa Gate 2: `eyebrow: 'BOOKING CONFIRMED'`
   (pinili ni Neil — English ang tatak ng totoong resibo) at
   `stepsHeading: 'Ito ang susunod na mangyayari'`. Optional pareho sa types.
   Smoke: pumasa sa 390×844 + 1280×900, dalawang `?v=` variant + garbage fallback,
   `?email=` scrub, zero console error. ⚠️ Ang `form → /api/lead → thank-you` na
   hakbang ay HINDI pa nate-test lokal (walang api bridge ang `vite preview`);
   ang live POST test pagkatapos ng deploy ang sumasakop doon.
1b. ✅ **TAPOS — huling pass 2026-08-01** (mga sagot sa review ni Neil):
   - **PhonePill sa void chapter ng thank-you.** Hindi mo mase-save ang numerong
     hindi mo nakikita, at patay ang `tel:` sa desktop. Nakalimbag na ang
     `0935 258 9927` katabi ng button.
   - **Chapter 2 ng thank-you: `navy-deep` → `navy`.** Nagtatapos ang gradient sa
     `#0A1F45` at iyon din ang `navy-deep`, kaya walang gilid. `#0E2C5E` na sya.
   - **Marquee readability.** HINDI kulay ang problema (16.2:1 ang puti; lalong
     lalala kapag dinilim). Dalawang mekanikal na sanhi: pinuputol ng
     `overflow:hidden` ang pangalan sa gitna ng salita sa magkabilang gilid, at
     73px/s ang bilis. Ngayon: `mask-image` edge fade + 40s → **75s** (39px/s).
     Kung mahirap pa rin, ang laki ang susunod na lever (`text-lg` → `text-base`),
     pero D07-backed ang laki kaya hindi ko muna hinawakan.
   - **Ang huling pinto sa footer**: nakalimbag na numero + Messenger button, sa
     ibabaw ng legal. Bagong copy: `May tanong bago ka mag-book? Nandito kami.`
   - **Ikatlong pinto sa StickyCta**: Messenger icon button. Icon-only sa ilalim
     ng `sm`. ⚠️ Nag-two-lines ang primary sa unang subok (223px lang ang natira
     laban sa ~231px na kailangan) kaya hinigpitan lahat ng horizontal value sa
     mobile at 13px ang type doon. **Ang 360px ang totoong constraint, hindi 390.**
   - ✅ **MAY LINK NA ANG MESSENGER**: `https://m.me/OceanidesMalabanan`
     (ibinigay ni Neil 2026-08-01). Na-verify: 302 papuntang Page ID
     `291924520660232`, kaya totoo ang handle. Nakatali sya sa USERNAME, hindi
     sa Page, kaya kapag pinalitan ang username ay maputol ang link nang
     tahimik. Nasa comment sa itaas ng const ang babala.

### 🔴 DESISYON: HUWAG palitan ang pangalan/username ng FB Page (2026-08-01)

Tinanong ni Neil kung papalitan dahil "Malabanan" ang nasa Page name. Sagot:
hindi, at mas makitid pala ang rule kaysa sa akala.

- **Ang "never Malabanan" hard rule ay para sa COPY/scripts, hindi sa pangalan
  ng negosyo.** Nakasulat mismo sa [`marvin-avatar/SKILL.md:23`](../../.claude/skills/marvin-avatar/SKILL.md):
  *"real company branding, allowed sa IMAHE."* Pinapayagan din ng
  `oceanides_daily_posts.md` ang `#Malabanan` bilang SEO hashtag. Ang bawal ay
  ang pagsusulat nito sa sales copy at image copy natin.
- **Ito ang hinahanap ng tao.** Ang "malabanan" ang generic na salita ng
  kategorya sa PH, at ang Page NAME ang pinakamalakas na signal sa FB search.
  Ang pagtanggal nito ay panghabambuhay na bayad sa organic discovery.
- **Totoong branding sya.** Nasa uniform at nasa logo mismo ang "OCEANIDES
  MALABANAN". Kapag tinanggal sa Page pero nasa damit pa rin, hindi tugma.
- **May gastos ang pagpapalit:** maputol ang bawat lumang link at ang m.me
  (kaya sirang button ang landing page), at dumadaan sa review ng Meta ang
  name change. Bisperas ng deploy at ng unang ad ang pinakamasamang oras.
- **Ang totoong butas ay ang About, hindi ang pangalan:** wala doon ang buong
  rehistradong pangalan (`Oceanides Plumbing Siphoning & Pest Management
  Services OPC`). Idagdag para may matutugma ang magve-verify sa SEC.

1c. 🟡 **HINDI PA NASASAGOT NI NEIL: ang oras ng tawag.** Tatlong beses sinasabi
   ng thank-you na "tatawagan ka namin" at ni minsan hindi sinasabi kung kailan.
   Iyon ang tanging tanong ng kaka-book lang. Kailangan ng totoong sagot ni Zam
   bago ilagay. Wag mag-imbento.

2. ⛔ **Gate 2 ni Neil**: buong basa ng landing + thank-you sa PC. Ang copy ay DRAFT
   pa rin sa config header hangga't hindi ito nangyayari.
   Lokal na tingin: `npm run build && npx vite preview --port 4173` sa
   `funnels/oceanides-price-page`, tapos `http://localhost:4173/` at
   `http://localhost:4173/thank-you.html`.
3. **DEPLOY** (walang ibang haharang pagkatapos ng Gate 2):
   ```bash
   cd funnels/oceanides-price-page
   npm install && npm run build
   npx vercel deploy --prod --yes
   # env vars: KAMAY NI NEIL, isang command kada isa (nasira ang key dati sa maling paste)
   npx vercel env add SUPABASE_URL production
   npx vercel env add SUPABASE_SERVICE_ROLE_KEY production
   npx vercel deploy --prod --yes   # walang epekto ang env hanggang bagong deploy
   ```
   Live test: POST sa prod `/api/lead` → `{ok:true}` → row sa Supabase
   (`client_id='oceanides'`) → burahin ang test row. I-share ang ALIAS
   (`oceanides-price-page.vercel.app`), hindi ang deployment URL. Itala sa
   `workflows/funnel_deploys.md`.

## 🅿 Balikan (hindi humaharang sa deploy)

- **SEC Reg. No.** — skip muna sabi ni Neil 2026-08-01, "balikan nalang." Pagdating:
  isang entry sa `receipts` sa `funnel.config.ts` socialProofBar.
- **Hose baseline** ni Boss Jay (ilang metro kasama) — honest na ang copy ngayon.
- **Logo version ng marquee** — kung gustuhin ni Neil; kailangan ng malinis na files.
- **Real-bookings feed** ("may nag-book sa Pasig, 2 oras ang nakalipas") — POST-LAUNCH,
  totoong data lang mula `funnel_leads`. Ang fake version ay tinanggihan at bawal.
- **Kuya Marvin legacy**: PAUSED ang lumang ad; ⚠️ may utang sa 100 taong nag-message
  ("libre ang tingin") — sinuman ang tumawag, libre. Bagong Page ni Gabriel: 3-5 post
  muna bago i-ON ang unang ad.

## ⚙️ Mga gate na wag galawin

`scripts/lint-voice.mjs` + `scripts/lint-layout.mjs`, naka-wire sa prebuild. Kapag
pumalya, **ang section ang ayusin, hindi ang exception list.** Ang Gabriel image lessons
ay nasa [`kuya-gabriel/IDENTITY.md`](kuya-gabriel/IDENTITY.md).

## Re-arm pagkatapos ng reboot

```powershell
.\scripts\restore-git-identity.ps1
.\scripts\restore-gh.ps1
```

## Mga link

- Offer doc (Gate 1): [`workflows/oceanides_offer_price_page.md`](../../workflows/oceanides_offer_price_page.md)
- Presyo source of truth: [`workflows/oceanides_business_model.md`](../../workflows/oceanides_business_model.md)
- Design evidence: `workflows/design_swipe_file.md` (sa main) — DGP-2 ang recipe
