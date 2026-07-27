# NEXT SESSION — Oceanides / Kuya Marvin launch

**Ina-update 2026-07-27 (hapon).** Lahat ng kailangan mo ay nandito — hindi mo na
kailangang basahin ulit ang buong usapan.

---

## ⚡ BUKAS — ito lang ang gawin

**Ang campaign ay BUO na at PAUSED. Zero ang nagastos.** Hindi na kailangang
magtayo ng kahit ano.

### 🔴 Bago pindutin ang ON (ikaw lang ang makakagawa)
1. **3–5 organic post sa Page** + i-post ang video organically.
   Blangkong Page = patay na tiwala, at mas mataas ang review risk sa unang ad.
2. **Page basics** — category *Local service*, profile + cover, About, at ang
   **numero sa About + Call button** (hindi sa caption).
3. **Tingnan ang AI label** sa ad (ipinasa ang `OPT_IN`, kumpirmahin sa UI) at
   **patayin ang Advantage+ *Text improvements* + *Translate***.
4. Pindutin ang toggle. ✅ *(Instant reply: TAPOS NA 2026-07-27.)*

### 🟡 Kasabay nito
- **Viber message sa Oceanides** — ang tatlong tanong (nasa ibaba). Kumpirmahin
  din kung may trak sa labas ng NCR.
- **I-save ang 3 Messenger reply bilang saved replies** (nasa ibaba).
- **Pindutin ang Allow** sa *"business activities to improve ads"*, at
  **tuloy-tuloy** na itala ang `Create order` + `Mark as lead` sa Page inbox.
  Dito manggagaling ang 2 sa 3 numerong kailangan sa Day 7. Kalahating pagtatala
  = ingay, hindi signal.
- **Desisyon:** i-merge ba ang `feat/km-003-hook2-ab` sa `main`? *(Doon nakatira
  ang video; ang kopya sa `main` ay ang luma pang CRF 17.)*

### 📅 Day 7 — ako ang gagawa
Ako na ang kukuha ng insights (gumagana na ang token — **huwag mo nang kopyahin
ang numero nang kamay**): gastos, CPM, CTR, frequency, **hook rate**, **hold
rate**, cost per conversation. Ikaw lang ang may alam ng **booking count at
halaga** — galing sa `Create order`. Mula doon: unang ledger entry, **live
auto-updating dashboard artifact** (kaya na ng `mcp` capability — kailangan lang
ng totoong insights response para hindi hulaan ang hugis ng data), at ang brief
para sa **2–3 bagong konsepto** — kasama ang **image ad**, na siyang pinakamalaki
ang lundag sa diversification dahil pinakamalayo siya sa video.

**Kung ma-reject ang ad:** sabihan mo ko agad. Karaniwan ay nauulit lang ito sa
appeal — hindi ito hudyat na mali ang creative.

---

## Nasaan tayo

**Tapos at aprubado ni Neil:** KM-003, dalawang variant, parehong pasado sa VERIFIER.

| File | Haba | Hook | Laki |
| --- | --- | --- | --- |
| `km-003/KM-003-AD-v2.mp4` | 37.8s | hook1 — cold read | 30.7 MB |
| `km-003/KM-003-AD-hook2-v1.mp4` | 36.8s | hook2 — contrarian claim | 30.0 MB |

Rebuild kahit alin (galing sa repo root, kailangan ng ffmpeg):

```bash
bash clients/oceanides/kuya-marvin/ads/km-003/build-cut.sh              # hook1
HOOK=hook2 bash clients/oceanides/kuya-marvin/ads/km-003/build-cut.sh   # hook2
```

Buong production record + triage findings: [`km-003-script-storyboard.md`](km-003-script-storyboard.md).

---

## 🔴 HUMAHARANG SA LAUNCH — dalawa lang

### 1. Meta System User token

**Setup na tapos na (2026-07-27, session ng umaga).** Ang natitira lang ay ang
mismong token — buo na ang lahat ng nasa ilalim nito, huwag nang ulitin:

| Bagay | Halaga |
| --- | --- |
| Business portfolio | **Zam Grifon – Personal Brand** — `2055039121369832` |
| System user | **`Oceanides Automation`** — `61592724653740`, role **Admin** |
| Page | **`Kuya Marvin ng Oceanides`** — `1184710811397498` → *Full access* ✅ |
| Ad account | `585951286230395` (Hidden Luxurious Condos) → *Manage campaigns* ✅ |
| App | **`Oceanides Automation`** — `888885250507284`, ginawa 2026-07-27, use cases: *Create & manage ads with Marketing API* + *Measure ad performance data* + *Manage everything on your Page* |
| App role ng system user | **`Manage app` (Full access)** = Administrator ✅ |

Nakalagay na sa `.env`: `AD_ACCOUNT_ID=585951286230395` at ang linyang
`ACCESS_TOKEN=` na may placeholder. **Huwag ipaste ang token sa chat** — diretso
sa `.env`, palitan lang ang `PASTE_SYSTEM_USER_TOKEN_HERE`.

Natitirang hakbang:
1. **Generate token** → app `Oceanides Automation` → expiration **Never** →
   i-tick ang walo: `ads_management`, `ads_read`, `business_management`,
   `read_insights`, `pages_show_list`, `pages_read_engagement`,
   `pages_manage_metadata`, `pages_manage_ads`.
   **Kopyahin agad — isang beses lang ipinapakita.**
2. Paste sa `.env`
3. `pip install meta-ads` → `meta auth status` → `meta ads adaccount list`
   (exit code 3 = auth problem, malamang scope o hindi naka-assign ang asset)

*Hindi tiniklop:* `catalog_management` (walang produkto/feed sa Messages
campaign), `facebook_branded_content_ads_brand`, `pages_manage_posts`,
`pages_manage_engagement`, `pages_read_user_content`, `threads_business_basic`.
*Never* ang expiration: 60 araw ay tahimik na masisira pagkalipas ng dalawang
buwan sa cafe-PC na ito. I-revoke agad kung: napasok sa git ang `.env`, na-paste
ang token kahit saan pa, o may campaign na hindi ikaw ang gumawa.

**Natutunan habang ginagawa** — para hindi na ulit maghanap:
- **Reserved words sa pangalan ng system user.** Tinanggihan ni Meta ang
  `Grifon Ads CLI`, `Ads Automation`, at `Marketing API` — lahat na may **"Ads"**
  o **"API"** — na may walang kwentang error na *"You choose an invalid System
  User name."* Pumasa ang `Oceanides Automation`. Hindi "Grifon" ang problema.
- **Walang "Apps" sa Assign assets dialog kung walang app ang portfolio.**
  Sumusulpot lang ang asset type na `Apps` kapag may pag-aaring app na ang
  portfolio. Ang `Installed apps` tab ay **read-only** — walang Add button doon
  (*"Generate a token to manage your business assets"*), kaya huwag mo nang
  hanapin.
- 🔴 **ANG PINAKAMALAKING PATIBONG — `Develop app` ≠ sapat.** Dalawang magkaibang
  sistema ng permission si Meta na magkahawig ang salita:
  *asset access* (Business Settings) vs *app role* (app dashboard). Ang
  **`Develop app`** ay nagbibigay lang ng app role na **Developer**, at ang
  Generate token ay sasabog ng *"No permissions available — Assign an app role
  to the system user"* na may **blangkong** listahan. Ang tama:
  **System users → Assigned assets → Apps → Manage → buksan ang `Manage app`
  (Full access)** = Administrator. Doon lang mapupuno ang listahan ng scopes.
  Huwag itong ayusin sa `App roles → Roles` ng app dashboard — sabi mismo ni
  Meta doon, sa Business Manager ang tamang lugar.
- **Personal profile ≠ business portfolio.** Buhay ang Page pero nakatali sa
  personal profile ni Neil, kaya hindi siya lumalabas sa Assign assets. Naayos sa
  **Accounts → Pages → Add → "Add a Page"** (hindi *Request access* — si Neil ang
  admin). ⚠️ Inililipat nito ang **ownership** ng Page sa business portfolio.

**⚠️ Utang na dapat bayaran.** Nasa personal portfolio ni Neil ngayon ang Page ng
kliyente, dahil **UNSETTLED** ang totoong Oceanides portfolio (`534113769107319`).
Pagkabayad nila, ilipat ang Page **at** ad account sa portfolio nila — kung hindi,
mananatiling nakakabit sa personal brand ni Neil ang buong ad history, audience,
at usapan ng kliyente.

**⚠️ Huwag pindutin ang `Revoke tokens` sa `Conversions API System User`**
(`61591452867922`) — mamamatay ang Meta CAPI ng Grifon at kailangang
i-regenerate lahat. Hiwalay siya sa `Oceanides Automation`; iyon ang dahilan
kung bakit dalawa sila.

⚠️ **Itago sa password manager.** Buburahin ng defreezer ang `.env` kada reboot;
kailangan mong ipaste ulit. Hindi pwedeng ilagay sa repo ang sikreto.

`META_CAPI_ACCESS_TOKEN` na nasa `.env` ay **hindi ito** — dataset-scoped CAPI
token yan para sa growth loop, hindi mag-o-authenticate sa Ads API.

### 2. Tatlong numero mula kay Neil

Walang kill threshold kung wala ang mga ito, at hindi mag-iimbento ang agent:

1. Average na halaga ng trabaho ng Oceanides (ticket size)
2. Anong % ng Messenger na usapan ang nagiging booking
3. Target CPA kada nabook na trabaho

Mula doon: **break-even ROAS = 1 ÷ net margin.**

**Naayos 2026-07-27 — hindi na ito humaharang sa launch.** Sinabi ni Neil na
hindi niya alam ang tatlo, at hindi mag-iimbento ang agent. Sa halip, **hinati
ang gate**: hindi kailangan ng tatlong numero sa linggo 1, dahil **kalibrasyon**
ang trabaho noon, hindi kita. Ang **Gate 1** ay puro proseso (gastos kada
usapan) — tingnan ang KILL GATES sa ibaba. Ang **Gate 2** (linggo 2) ang
ekonomiya, at pagsapit noon ay **gagawa na mismo ang campaign ng dalawa sa
tatlong numero** — ilang usapan ang naging booking, at magkano ang mga na-book.
Ang natitira ay net margin.

Ipapadala ni Neil sa Oceanides (isang Viber message, kayang sagutin sa memorya):
> *Boss, para ma-set up ko nang tama ang ads: (1) magkano ang huling 5 siphoning
> job nyo? (2) sa 10 taong nagme-message, ilan ang tumutuloy magpa-book?
> (3) sa bawat ₱1,000 na singil, magkano ang natitira pagkatapos ng gastos —
> trak, gas, tao?*

### KILL GATES — Linggo 1 (walang kailangang numero)

| Nagastos | Kung ganito | Gawin |
| --- | --- | --- |
| ₱1,000 (~2 araw) | **Zero** usapan | 🛑 Patay — creative o targeting, hindi ang alok |
| ₱1,500 (~3 araw) | > ₱150/usapan | ⏸️ Hinto, tingnan ang hook rate |
| ₱3,500 (7 araw) | ₱40–80/usapan | ✅ Malusog — tuloy |
| ₱3,500 | > ₱120/usapan | 🛑 Hinto |

**Huwag gumalaw ng budget sa unang 3 araw** — learning phase pa, ire-reset lang.

---

## ✅ Napagdesisyunan na — huwag nang balikan

| Bagay | Desisyon | Bakit |
| --- | --- | --- |
| Ad account | `585951286230395` (Hidden Luxurious Condos) | ACTIVE, may payment method, ₱1,228.74/araw limit. Ang totoong Oceanides account (`481608629454262`, business `534113769107319`) ay **UNSETTLED** — may hindi pa bayad. |
| Ad credit | **WALA** | Ang ₱5,156 ay **billing threshold**, hindi libreng pera — kung kailan sisingilin ang Visa ...5464, hindi kung magkano ang libre. Babayaran ang bawat piso. |
| Pixel | **Huwag gumawa** | Messages campaign ito — `messaging_conversation_started` sa antas ng Page, walang pixel. Ang tanging naka-attach na dataset ay **"Grifon Pixel"** (`1921429268517231`) — sariling SaaS pixel ni Neil. Huwag itong i-tick sa ad set. |
| Objective | **Engagement → Messaging apps**, maximize conversations | Kailangan ng ~50 events/linggo para makalabas sa learning. Sa ₱500/araw: usapan = 44–87/linggo ✅; sales = ~10/linggo ❌. Ang Sales → Messaging ay kailangan din ng CAPI for Business Messaging na wala pa tayo. |
| Structure | 1 CBO campaign, 1 ad set, **NCR + Advantage+** | Playbook para sa <₱1k/araw. ⚠️ **NAITAMA 2026-07-27: "PH broad" → NCR.** May trak ang Oceanides — ang PH broad ay nagbabayad ng impressions sa Davao/Cebu na hindi naman kayang puntahan. **Ang geo ang tanging targeting lever na hindi dapat pinapabroad ng local service business.** Advantage+ pa rin ang audience, sa loob lang ng NCR. Palawakin kapag kumpirmado na may trak sa Bulacan/Rizal/Cavite/Laguna (may Page silang "Oceanides Malabanan Bulacan Branch" — hindi pa nakumpirma). |
| Creative na ilalabas | **hook2 mag-isa** — `KM-003-AD-hook2-v1.mp4` | Neil-approved 2026-07-27. Isa lang, hindi A/B: sa ₱500/araw walang sample para resolbahin ang hook-level difference, at ang hatiin ang ~50 events/linggo ay binabagal ang paglabas sa learning phase habang binabayaran ang dupe-CPM. Ang linggo 1 ay **kalibrasyon**, isang variable lang. |
| Caption | Option A — mechanism reframe | Isa lang, hindi dalawa: pareho ang video byte-for-byte, kaya ang pangalawang ad ay purong cosmetic dupe. Kung gusto ng copy test sa hinaharap, gamitin ang **maraming primary-text option sa loob ng ISANG ad** (native, walang dupe, hindi naghahati ng learning) — hindi pangalawang ad. |
| Contact number | **Wala sa caption** | Naka-optimize sa `messaging_conversation_started`; ang tumatawag ay hindi nabibilang na conversion at nawawala ang attribution. Ilagay sa **Page About + Call button + Messenger instant reply** — doon, pumuputok muna ang conversion event bago nila makita ang number. |
| Advantage+ text enhancements | **OFF** | Ang *Text improvements* at *Translate text* ay muling isinusulat ang copy. Ang buong hook ay isang mekanismong claim sa tuned Taglish — sisirain siya ng auto-rewrite. Visual enhancements ayos lang. |
| Budget | ₱500/araw | Min ay ₱61.81, limit ay ₱1,228.74 — pasok |
| Delivery encode | CRF 20 (~7.6 Mbps) | Ini-re-encode ng Meta ang lahat; 40% mas maliit, walang pagkakaiba |
| Preset (KM-004) | `spotlight` | Buto ng IMPACT + VO-timed active-word invert |

**Lipat sa Sales → Messaging** kapag (a) 50+ usapan/linggo na, at (b) may CAPI
nang nagbabalik ng nabook na trabaho. Hindi ngayon.

---

## 🟢 NAGAWA NA SA META (2026-07-27) — huwag nang ulitin

Ginawa ng agent via Meta Ads MCP, **lahat PAUSED, ₱0.00 ang nagastos**:

| Object | ID | Status |
| --- | --- | --- |
| Campaign `OCEANIDES-KM003-hook2` | `120250672316430347` | ⏸️ PAUSED · CBO ₱500/araw · OUTCOME_ENGAGEMENT |
| Ad set `OCEANIDES-KM003-hook2-NCR-broad` | `120250672331730347` | ⏸️ PAUSED · CONVERSATIONS · MESSENGER · start 2026-07-28 00:00+08 |
| Ad `OCEANIDES-KM003-hook2-v1` | `120250673468830347` | ⏸️ PAUSED · video `1027821226498071` · `self_ai_disclosure: OPT_IN` |

**Handa nang i-ON.** Na-verify ang render sa `ads_get_ad_preview` (MOBILE_FEED_STANDARD).

🖼️ **Thumbnail — aral na nagkakahalaga ng buong plate.** Ang auto-thumbnail ni
Meta ay **frame 0**, at **nag-fade in ang hook overlay** — kaya walang teksto ang
napili niya, mukha lang ni Marvin na walang sinasabi. (Ang commit note natin na
*"legible on frame 1"* ay hindi eksakto; mga **0.5s** talaga.) Kinuha ang
**t=1.4s** sa halip: buo ang `HINDI BARADO. / PUNO NA.`, sarado ang bibig, at
mas kita ang trak dahil bago pa ang push-in.

**Hindi Grifon/MrBeast-formula plate ang ginamit, sinadya.** Ang buong tayo ni
Kuya Marvin ay *hindi siya mukhang ad*. Ang makintab na gold-and-black na plate
sa ibabaw ng UGC-style na video ay sumisigaw ng ADVERTISEMENT bago pa mapanood
ang unang segundo — itinataas nito ang mismong bantay na ibinababa ng creative.
At sa Feed/Reels ay **kusang tumutugtog** ang video, kaya ang cover ay kisap
lang, hindi pinto (iba sa YouTube, kung saan tama ang MrBeast rules). Ang tunay
na frame na may burned-in na hook ang nakakakuha ng teksto **nang hindi
nawawala ang pagiging totoo**. *(Production rule para sa KM-004: huwag i-fade
ang hook overlay — ilagay sa frame 0, kung hindi ay mali ang pipiliin ni Meta.)*

**Permission:** idinagdag ni Neil sa [`.claude/settings.json`](../../../../.claude/settings.json) ang siyam na `mcp__claude_ai_Meta_Ads__ads_create_*` / `_get_*` rules. **Sadyang WALA** ang `ads_update_entity` at `ads_activate_entity` — sila lang ang kayang gawing ACTIVE, kaya **ipinapatupad ng allowlist ang money gate**, hindi lang ng patakaran. Si Neil ang pumipindot ng ON.

⚠️ **Targeting:** **20 km radius** mula (14.54, 121.02) + `location_types: ["home"]`, hindi ang opisyal na NCR region. Walang `ads_targeting_search` sa connector kaya walang paraan para makuha ang tunay na region key, at bawal manghula ng targeting ID. Para sa trak, makatuwiran ang radius (oras ng biyahe ang totoong limitasyon) **pero may tagas sa Rizal/Cavite/Bulacan.** Palitan sa UI kung gusto ng eksaktong NCR: ad set → Location → tanggalin ang pin → i-type ang "Metro Manila" → piliin ang region.

⚠️ **Dayparting: HUWAG.** Nag-aalok si Meta ng *"22.8% more conversions during business hours"* — tantiya niya, hindi datos natin. Tatlong dahilan kung bakit mali ngayon: (a) **sa gabi umaapaw ang tangke** — pinakamataas-intent na buyer iyon, at 24/7 ang instant reply; (b) binabagal ang paglabas sa learning phase (kapos na sa ~50 events/linggo); (c) pipilitin ang ₱500 sa mas kaunting oras kung saan mas maraming kaagaw = mas mataas na CPM. Balikan sa **Day 14+** kapag may cost-per-conversation kada oras na.

### Ang huling hakbang — organic post muna

**Tinanggihan ni Meta ang `ads_creative_upload_video`:** *"This tool is new and is being gradually rolled out across ad accounts."* Vendor rollout gate — walang setting na mapipindot, hindi kayang lampasan.

Ang R2 route ay **gumagana at handa na** para sa susunod: `.tmp/r2-upload.mjs` (mirror ng `api/_lib/r2.ts` — aws4fetch SigV4, hour-floored date) ang nag-uupload at gumagawa ng presigned GET URL; napatunayan sa ranged GET (`206 bytes 0-0/31502229`). Nakaimbak na ang video sa key `ad-delivery/oceanides/KM-003-AD-hook2-v1.mp4`. *(Gotcha: GET-signed URL + HEAD request = garantisadong 403 — bahagi ng SigV4 canonical request ang HTTP method. Mag-probe gamit ang ranged GET.)*

**Kaya: i-post ang video organically sa Page**, tapos gagawin ang ad mula sa post gamit ang `object_story_id` (`pageID_postID`) — hindi na kailangan ng upload API. Mas malakas pa: dala-dala ng ad ang like/comment/share ng organic post = libreng social proof. Nasa pre-flight checklist na ito kanina pa, kaya walang dagdag na trabaho.

*(Hinila ang `KM-003-AD-hook2-v1.mp4` galing `origin/feat/km-003-hook2-ab` papunta sa working tree — ang kopya sa `main` ay ang luma pang CRF 17.)*

---

## 🚀 CAMPAIGN STRUCTURE — reference ng mga setting

Ad account `585951286230395` · Page identity `Kuya Marvin ng Oceanides`
(`1184710811397498`). **Manu-mano sa Ads Manager**, hindi sa CLI — ang
ad-strategist guardrail ay hindi kailanman gumagastos nang mag-isa, kaya ang
token ay **pambasa** (insights + ledger), hindi panggastos.

```
Campaign   OCEANIDES-KM003-hook2
Ad set     OCEANIDES-KM003-hook2-NCR-broad
Ad         OCEANIDES-KM003-hook2-v1
```

**Campaign** — Objective **Engagement** · conversion location **Messaging apps**
· **CBO ₱500/araw** · Highest volume, walang bid cap · Special ad category
**WALA** · A/B test toggle **OFF**.

**Ad set** — Performance goal **Maximize number of conversations** ·
messaging app **Messenger LANG** (walang naka-connect na Instagram sa Page,
walang WhatsApp — ang tiklop sa kanila ay naghahati ng delivery sa destination
na walang tao) · Schedule start **12:00 AM** ng susunod na araw, walang end date
· Location **Metro Manila (NCR)** bilang region, at **"People living in this
location"** (ang default na *living in or recently in* ay kasama ang turista —
walang septic tank ang turista) · Age **25–65+** · Gender all ·
**Advantage+ audience**, walang detailed targeting · **Advantage+ placements**
(pasok ang 9:16 — ang hook overlay ay ginawa nang nasa 4:5 feed-safe band) ·
Billing **Impressions**.

**Ad** — Single video `KM-003-AD-hook2-v1.mp4` (36.8s · 1080×1920 · ~30 MB) ·
CTA **Send Message** · message template **Start conversations** (hindi bot) ·
Headline **`Hindi Barado. Puno Na.`** · Description
**`Libreng tingin sa septic tank`** · 🔴 **AI label ON** · 🔴 **Text
improvements + Translate OFF**.

**Primary text (Option A — LOCKED):**
```
Kapag nagbubuhos ka na ng timba para lang bumaba — hindi na yan barado.
Puno na ang septic tank.

Kaya kahit anong plunger, balik nang balik ang problema. Hindi mo
naman kasi inaayos ang totoong dahilan.

Libre ang tingin namin sa tangke nyo. Ipapakita ang buong singil bago
magsimula. Kung ayaw nyo, ayos lang — walang bayad, walang pilitan.

Serbisyo sa buong Metro Manila. Message nyo lang kami —
si Kuya Marvin ang sasagot.
```

**Messenger instant reply** (Page → Inbox → Automations) — palitan ang number:
```
Salamat sa pag-message! Si Kuya Marvin ito ng Oceanides.

Para mabilis: (1) saan po kayo sa Metro Manila? (2) gaano na
katagal ang problema?

Emergency? Tawag na lang po diretso: 09XX-XXX-XXXX
```

---

## 🟡 Natitirang desisyon

1. ✅ ~~Alin ang ilalabas~~ — **hook2, mag-isa.** Aprubado ni Neil 2026-07-27.
2. **I-merge ba ang `feat/km-003-hook2-ab` sa main?** Naroon ang hook2 variant +
   ang CRF 20 na pagbabago — parehong aprubado na. Naiwang unmerged para sa
   tawag ni Neil. *(Ang unmerged branch ang paulit-ulit na dahilan kung bakit
   naiisip ng agent na "hindi pa gawa" ang isang bagay — see CLAUDE.md.)*
3. **Creative diversification — orasan, hindi "kalaunan."** Humihingi ang
   playbook ng **4–6 na tunay na magkakaibang creative** sa isang ad set;
   isa ang ilalabas natin. Sinadya: kalibrasyon ang linggo 1, at hindi ka
   makakagawa ng pang-lima nang bulag. **Pero 5–7 araw lang** — lampas doon at
   ang dupe-CPM at creative fatigue na ang kakain ng badyet. Brief kina
   `grifon-cmo` + `grifon-creative-director` para sa 2–3 **bagong konsepto**
   (ibang panimulang eksena/format — hindi ibang hook lang sa parehong katawan).
   Nakahanda na ang isa: **Option C, ang anti-scam reframe**
   (`Presyo Muna. Tapos Trabaho.`) — Product Aware siya kaya mali sa malamig na
   audience, pero tama sa **retargeting** ng mga nanood pero hindi nag-message.
4. **Sakop sa labas ng NCR** — kumpirmahin sa Oceanides kung may trak sa
   Bulacan/Rizal/Cavite/Laguna. Hanggang wala, NCR lang.

---

## ✅ PRE-FLIGHT — huwag mag-publish kung may hindi pa tapos

- [ ] **Messenger instant reply naka-set up** (kopya sa itaas) — kung wala, may
      darating na usapan na walang sasagot. **Ito ang pinakamadalas na aksidente.**
- [ ] **Number nasa Page About + Call button** — hindi sa caption
- [ ] **3–5 organic post sa Page** — titingnan nila ang Page bago mag-message;
      blangkong Page = patay na tiwala at mas mataas ang review risk
- [ ] **I-post ang video organically** bago siya gawing ad
- [ ] Page category **Local service**, may profile + cover + About
- [ ] **AI label ON** (ad level, Advantage+ creative section) — AI-generated ang video
- [ ] **Text improvements + Translate text OFF**
- [ ] Page identity = **Kuya Marvin ng Oceanides**, hindi ang Grifon page
- [ ] Payment method aktibo (Visa …5464 — ₱1,228.74/araw limit, pasok ang ₱500)
- [ ] I-log sa [`workflows/ad_performance_ledger.md`](../../../../workflows/ad_performance_ledger.md)
      paglabas ng numbers — **wala pa itong laman**, kaya canon pa rin ang takbo
      ng ad-strategist, hindi sariling data natin

**Day 7 — ibigay sa ad-strategist:** gastos, usapan, hook rate, hold rate, CPM.
Ito ang magiging **unang entry** ng ledger, at doon papasok ang brief para sa
2–3 bagong konsepto.

---

## Re-arm pagkatapos ng reboot (buburahin ng defreezer)

```powershell
.\scripts\restore-hyperframes.ps1   # ffmpeg + ffprobe + Chrome shell
.\scripts\restore-codex.ps1         # Codex CLI (lane ni Sol para sa copy)
```
Tapos ipaste ulit ang `ACCESS_TOKEN` sa `.env` mula sa password manager mo.

---

## Health note — hindi humaharang, pero ayusin bago mag-scale

Dalawa sa mga ad account ni Neil ay **DISABLED** para sa *"unusual activity"*:
`661901381083733` at `310969697013487` (For South Bros Store). Lima ang UNSETTLED.
Tinitingnan ng Meta ang kasaysayan sa antas ng tao/business, hindi lang
per-account — mas mataas ang panganib ng review kapag marami kang flagged account.
