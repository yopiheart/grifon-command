# NEXT SESSION — Oceanides / Kuya Marvin launch

**Ina-update 2026-07-28 (gabi).** Lahat ng kailangan mo ay nandito — hindi mo na
kailangang basahin ulit ang buong usapan.

---

## 🟢 LIVE NA — DAY 1 TAPOS (2026-07-28)

**Na-ON ni Neil. Tumatakbo na ang KM-003.** Ito ang totoong numero, hinila mismo
sa Meta gamit ang token (hindi kinopya nang kamay):

| Metric | Day 1 (Hul 28) |
| --- | --- |
| Gastos | **₱666.30** (₱670.82 sa Ads Manager UI nang 11:30pm — ilang minutong lag ang API) |
| Messages | **50** |
| ₱ kada message | **₱13.33** |
| Impressions / Reach | 7,212 / 5,113 |
| CTR | 6.20% |
| CPM | ₱92.39 |
| Frequency | 1.41 |
| Thruplay | 1,716 |

**₱13.33 kada message laban sa ₱40–80 target band.** Tatlong beses na mas mura
kaysa sa pinakamagandang inaasahan. Hindi ito dahilan para dagdagan ang budget —
**learning phase pa, at ang paggalaw ng budget sa first 3 days ay nagre-reset
nito.** Ang tanong sa Day 7 ay hindi na "mura ba ang message" kundi **"nagiging
booking ba ang 50 messages kada araw?"** — iyon ang hawak ni Neil, hindi ng API.

⚠️ **Bagong trabaho na dulot nito:** 50 usapan kada araw ay tunay na dami para
sa isang taong sumasagot nang kamay. Kung hindi kayang habulin ang inbox, ang
bottleneck ay hindi na ang ad — ang reply speed na. Bantayan.

### 📊 LIVE dashboard (auto-updating, phone-readable)

`https://claude.ai/code/artifact/4d411162-ba99-4e99-bd28-92ffc2dca6ba`

Hindi ito snapshot — kumukuha mismo sa Meta tuwing 5 minuto via `mcp`
capability. Laman: messages, gastos, ₱/message, kill-gate verdict (kusang
nagsasabi kung tuloy o hinto), video funnel, per-day table. Source:
[`km-003/dashboard-live.html`](km-003/dashboard-live.html) — i-redeploy sa
PAREHONG URL kapag may binago.

*(Ang `?demo=1` ay test mode lang: repdigit-9 na peke na numero + pulang banner.
Kung may makita kang `₱99,999`, hindi iyon totoo.)*

---

## ⚡ SUSUNOD — ito lang ang gawin

**Ang campaign ay LIVE na at gumagastos.** Hindi na kailangang magtayo ng kahit
ano. Ang natitira ay pagbabantay at ang Day 7.

### 🔴 Hindi pa tapos (ikaw lang ang makakagawa)

1. **Pagtatala sa inbox — ito na ang pinakamahalaga ngayon.** Tuwing may
   nagbo-book, i-tag bilang `Create order`; kung interesado pero hindi pa
   tuloy, `Mark as lead`. **Dito manggagaling ang 2 sa 3 numerong kailangan sa
   Day 7** (ilan ang naging booking, magkano ang halaga). Kalahating pagtatala
   ay ingay, hindi signal — at sa 50 message kada araw, mabilis itong maipon.
   Pindutin din ang **Allow** sa *"business activities to improve ads"*.
2. **2–3 bagong Marvin still** via `marvin-avatar`, **kasama ang puting van.**
   Sa limang organic post, tatlo lang ang totoong Marvin still at **dalawa doon
   ay selfie**. Nilayo sila sa grid bilang band-aid, pero ang tunay na ayos ay
   bagong plate na may standing/working framing — hindi selfie. 🔴 **Puting van
   ang totoong fleet** (`profile-assets/`); bawal ang asul na tanker, imbento
   siya (tingnan ang `clients/oceanides/DESIGN.md` Don'ts).
3. **Viber message sa Oceanides** — ang tatlong tanong (nasa ibaba).
   ✅ ~~may trak ba sa labas ng NCR~~ — **KUMPIRMADO NI NEIL 2026-07-28: MERON.**
   ⚠️ **Kulang pa: ALIN ang mga lugar.** Hindi pwedeng hulaan ang targeting —
   kailangan ng listahan (Bulacan? Rizal? Cavite? Laguna? gaano kalayo?) bago
   galawin ang ad set. Isama sa parehong Viber message.

### ✅ Tapos na — huwag nang balikan
- **3–5 organic post** — nakapost. Run sheet: [`organic/PAGE-LAUNCH-POSTS.md`](../organic/PAGE-LAUNCH-POSTS.md).
- **Messenger instant reply + 3 saved replies** — TAPOS 2026-07-27.
- **Page basics, AI label ON, Text improvements + Translate OFF** — TAPOS.
- **`feat/km-003-hook2-ab` merged** — TAPOS 2026-07-27. Nasa `main` na ang hook2
  video, STS audio, overlay composition, `HOOK=` switch sa `build-cut.sh`, at
  ang CRF 20 re-encode. Wala nang asset ng launch na nakatago sa branch.
- **Toggle ON** — TAPOS 2026-07-28. Tumatakbo na.

---

## 📋 I-PASTE ITO SA SIMULA NG SUSUNOD NA SESSION

```
Ituloy natin si Kuya Marvin / Oceanides. Basahin mo muna:
  clients/oceanides/kuya-marvin/ads/NEXT-SESSION.md
  clients/oceanides/DESIGN.md
  workflows/ad_performance_ledger.md

LIVE na ang KM-003 simula 2026-07-28 (120250672316430347 /
120250672331730347 / 120250673468830347). Day 1: ₱666 gastos,
50 messages, ₱13.33 kada message.

Kunin mo mismo ang bagong numero sa Meta gamit ang token — huwag mo
akong pakopyahin nang kamay. I-redeploy mo rin ang live dashboard sa
PAREHONG URL:
  https://claude.ai/code/artifact/4d411162-ba99-4e99-bd28-92ffc2dca6ba

KUNG DAY 7 NA:
  1. Ibibigay ko ang booking count + halaga mula sa Create order sa inbox
  2. Unang entry sa workflows/ad_performance_ledger.md
  3. Brief para sa 2-3 bagong concept, kasama ang IMAGE AD

KUNG HINDI PA DAY 7: bantayan lang. Wag galawin ang budget.

Bago ka gumawa ng bagong tool o script: subukan mo muna ang
tools/meta_upload_video.mjs — naka-commit pero UNTESTED.
```

### 📅 Day 7 (Ago 4) — ako ang gagawa
Ako na ang kukuha ng insights (gumagana na ang token — **huwag mo nang kopyahin
ang numero nang kamay**). Ikaw lang ang may alam ng **booking count at halaga**
— galing sa `Create order`. Mula doon: **unang ledger entry** at ang brief para
sa **2–3 bagong konsepto** — kasama ang **image ad**, na siyang pinakamalaki ang
lundag sa diversification dahil pinakamalayo siya sa video.

✅ ~~live auto-updating dashboard artifact~~ — **TAPOS 2026-07-28**, tumatakbo
na sa totoong data (URL sa itaas).

⏰ **Ang orasan ng creative diversification ay tumatakbo na simula 2026-07-28.**
Humihingi ang playbook ng 4–6 na magkakaibang creative sa isang ad set; isa ang
meron tayo. Sinadya iyon para sa testing week, pero **5–7 araw lang** — lampas
doon at ang dupe-CPM at creative fatigue na ang kakain ng budget. Ibig sabihin:
**dapat may bagong konsepto na bago mag-Ago 4.**

**Kung ma-reject ang ad:** sabihan mo ko agad. Karaniwan ay nauulit lang ito sa
appeal — hindi ito hudyat na mali ang creative.

---

## 📱 Artifacts (phone-readable, survive ang defreezer)

I-redeploy sa SAME URLs (Artifact tool `url` param) kapag may binago. Lahat ay
pumasa sa 390×844 smoke gate at sumusunod sa
[`clients/oceanides/DESIGN.md`](../../DESIGN.md).

**Buhay pa — ito ang gamitin ngayon:**
- 🟢 **LIVE Work Order** (auto-updating, tunay na numero mula sa Meta):
  `https://claude.ai/code/artifact/4d411162-ba99-4e99-bd28-92ffc2dca6ba`
- **Page Launch Run Sheet** (ang limang organic post + pre-flight):
  `https://claude.ai/code/artifact/5952f7ba-859c-45b9-a295-fa8320c4d5d4`
- **Messenger cheat sheet** (3 reply script + tone rules, habang sumasagot):
  `https://claude.ai/code/artifact/3c5a2aec-2c71-4866-b454-8a57530025de`

**Luma na — pre-launch snapshot lang, hindi na ito nag-a-update:**
- Option B — Field Ops Ticket (PINILI noon):
  `https://claude.ai/code/artifact/b248874e-c6b2-4497-8fcc-a10c2666356f`
- Option A — Abyss Command (hindi pinili):
  `https://claude.ai/code/artifact/51827976-482d-45d2-9f86-771aace25449`

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

## ✅ DATING HUMAHARANG — pareho nang naayos (reference na lang ito)

### 1. Meta System User token — ✅ GUMAGANA NA

**Setup tapos 2026-07-27; nagamit na ang token para hilahin ang Day-1 numbers
(2026-07-28).** Reference na lang ito — huwag nang ulitin ang setup:

| Bagay | Halaga |
| --- | --- |
| Business portfolio | **Zam Grifon – Personal Brand** — `2055039121369832` |
| System user | **`Oceanides Automation`** — `61592724653740`, role **Admin** |
| Page | **`Kuya Marvin ng Oceanides`** — `1184710811397498` → *Full access* ✅ |
| Ad account | `585951286230395` (Hidden Luxurious Condos) → *Manage campaigns* ✅ |
| App | **`Oceanides Automation`** — `888885250507284`, ginawa 2026-07-27, use cases: *Create & manage ads with Marketing API* + *Measure ad performance data* + *Manage everything on your Page* |
| App role ng system user | **`Manage app` (Full access)** = Administrator ✅ |

Nakalagay na sa `.env`: `AD_ACCOUNT_ID=585951286230395` at ang linyang
`ACCESS_TOKEN=`. **Huwag ipaste ang token sa chat** — diretso sa `.env`.
⚠️ **Buburahin ito ng defreezer kada reboot** — ipaste ulit mula sa password
manager mo. Ito ang mga hakbang kung kailangang gumawa ng bago:

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
> trak, gas, tao? (4) saan-saan po kayo pwedeng pumunta sa labas ng Metro
> Manila? Ilista nyo lang ang lugar.*

### KILL GATES — Linggo 1 (walang kailangang numero)

| Nagastos | Kung ganito | Gawin |
| --- | --- | --- |
| ₱1,000 (~2 araw) | **Zero** message | 🛑 Patay — creative o targeting, hindi ang alok |
| ₱1,500 (~3 araw) | > ₱150/message | ⏸️ Hinto, tingnan ang hook rate |
| ₱3,500 (7 araw) | ₱40–80/message | ✅ Okay — tuloy |
| ₱3,500 | > ₱120/message | 🛑 Hinto |

**Huwag gumalaw ng budget sa unang 3 araw** — learning phase pa, ire-reset lang.

📍 **Nasaan tayo (Day 1, 2026-07-28): ₱13.33 kada message.** Malayong-malayo sa
lahat ng kill line, at mas mura pa sa ₱40–80 target band. Ang panganib ngayon ay
hindi na ang gastos — **ito ay kung kaya bang sagutin ang 50 message kada araw.**

---

## ✅ Napagdesisyunan na — huwag nang balikan

| Bagay | Desisyon | Bakit |
| --- | --- | --- |
| Ad account | `585951286230395` (Hidden Luxurious Condos) | ACTIVE, may payment method, ₱1,228.74/araw limit. Ang totoong Oceanides account (`481608629454262`, business `534113769107319`) ay **UNSETTLED** — may hindi pa bayad. |
| Ad credit | **WALA** | Ang ₱5,156 ay **billing threshold**, hindi libreng pera — kung kailan sisingilin ang Visa ...5464, hindi kung magkano ang libre. Babayaran ang bawat piso. |
| Pixel | **Huwag gumawa** | Messages campaign ito — `messaging_conversation_started` sa antas ng Page, walang pixel. Ang tanging naka-attach na dataset ay **"Grifon Pixel"** (`1921429268517231`) — sariling SaaS pixel ni Neil. Huwag itong i-tick sa ad set. |
| Objective | **Engagement → Messaging apps**, maximize conversations | Kailangan ng ~50 events/linggo para makalabas sa learning. Sa ₱500/araw: usapan = 44–87/linggo ✅; sales = ~10/linggo ❌. Ang Sales → Messaging ay kailangan din ng CAPI for Business Messaging na wala pa tayo. |
| Structure | 1 CBO campaign, 1 ad set, **NCR + Advantage+** | Playbook para sa <₱1k/araw. ⚠️ **NAITAMA 2026-07-27: "PH broad" → NCR.** May trak ang Oceanides — ang PH broad ay nagbabayad ng impressions sa Davao/Cebu na hindi naman kayang puntahan. **Ang geo ang tanging targeting lever na hindi dapat pinapabroad ng local service business.** Advantage+ pa rin ang audience, sa loob lang ng NCR. ✅ **Kumpirmado ni Neil 2026-07-28 na may sakop sa labas ng NCR** (may Page silang "Oceanides Malabanan Bulacan Branch"), pero **hindi pa alam kung alin at hindi pa dapat galawin** — tingnan ang Natitirang desisyon #4. |
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

## 🟢 NAGAWA NA SA META — huwag nang ulitin

Ginawa ng agent via Meta Ads MCP noong 2026-07-27 (PAUSED, ₱0 gastos);
**pinindot ni Neil ang ON noong 2026-07-28**:

| Object | ID | Status |
| --- | --- | --- |
| Campaign `OCEANIDES-KM003-hook2` | `120250672316430347` | 🟢 ACTIVE · CBO ₱500/araw · OUTCOME_ENGAGEMENT |
| Ad set `OCEANIDES-KM003-hook2-NCR-broad` | `120250672331730347` | 🟢 ACTIVE · CONVERSATIONS · MESSENGER · start 2026-07-28 00:00+08 |
| Ad `OCEANIDES-KM003-hook2-v1` | `120250673468830347` | 🟢 ACTIVE · video `1027821226498071` · `self_ai_disclosure: OPT_IN` |

**Tumatakbo na.** Na-verify ang render sa `ads_get_ad_preview` (MOBILE_FEED_STANDARD)
bago pa i-ON; kumpirmado ang delivery ng Day-1 numbers sa itaas.

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
2. ✅ ~~I-merge ang `feat/km-003-hook2-ab`~~ — **TAPOS 2026-07-27.**
3. 🔴 **Creative diversification — tumatakbo na ang orasan (simula 2026-07-28).**
   Humihingi ang playbook ng **4–6 na tunay na magkakaibang creative** sa isang
   ad set; **isa** ang meron tayo. Sinadya iyon: testing week ang linggo 1, at
   hindi ka makakagawa ng pang-lima nang bulag. **Pero 5–7 araw lang** — lampas
   doon at ang dupe-CPM at creative fatigue na ang kakain ng budget.
   **Deadline: bago mag-2026-08-04.** Brief kina `grifon-cmo` +
   `grifon-creative-director` para sa 2–3 **bagong konsepto** (ibang panimulang
   eksena/format — hindi ibang hook lang sa parehong katawan), kasama ang
   **image ad**. Nakahanda na ang isa: **Option C, ang anti-scam reframe**
   (`Presyo Muna. Tapos Trabaho.`) — Product Aware siya kaya mali sa malamig na
   audience, pero tama sa **retargeting** ng mga nanood pero hindi nag-message.
4. 🟡 **Sakop sa labas ng NCR — KUMPIRMADO NA MERON (Neil, 2026-07-28), pero
   HUWAG MUNA GALAWIN.** Dalawang dahilan bago palawakin:
   **(a) Learning phase.** Ang paggalaw ng targeting ay nagre-reset nito, at
   nasa ₱13.33 kada message tayo — hindi mo sinisira ang gumagana habang
   nag-aaral pa siya. Pinakamaaga: pagkatapos ng Day 7.
   **(b) Hindi pa alam kung ALIN.** "May trak sa labas ng NCR" ay hindi
   targeting spec. Kailangan ng listahan ng lugar bago baguhin ang radius o
   idagdag ang region — bawal manghula ng geo.
   Kapag alam na: **hiwalay na ad set** ang tama, hindi pagpapalawak ng
   kasalukuyan — para hindi mahaluan ang NCR data na binabayaran na natin.
5. **Kayang habulin ba ang 50 message kada araw?** Bagong tanong ito, dulot ng
   Day-1 volume. Kung hindi, hindi na ang ad ang bottleneck — ang reply speed na.
   Ang sagot dito ang magsasabi kung dapat bang dagdagan o bawasan ang budget
   pagkatapos ng learning phase.

---

## ✅ PRE-FLIGHT — natapos lahat bago i-ON (2026-07-28)

- [x] **Messenger instant reply naka-set up** (kopya sa itaas)
- [x] **Number nasa Page About + Call button** — hindi sa caption
- [x] **3–5 organic post sa Page**
- [x] Page category **Local service**, may profile + cover + About
- [x] **AI label ON** (ad level, Advantage+ creative section)
- [x] **Text improvements + Translate text OFF**
- [x] Page identity = **Kuya Marvin ng Oceanides**, hindi ang Grifon page
- [x] Payment method aktibo (Visa …5464 — ₱1,228.74/araw limit, pasok ang ₱500)
- [ ] **I-log sa [`workflows/ad_performance_ledger.md`](../../../../workflows/ad_performance_ledger.md)** — 🔴 **BUKAS PA.**
      Sa Day 7 ito, kapag may booking count na si Neil. **Wala pa itong laman**,
      kaya canon pa rin ang takbo ng ad-strategist, hindi sariling data natin.

*(Hindi na kailangan ang lumang item na "i-post ang video organically" — may
sarili nang dark post ang ad, `1184710811397498_122106985077399203`, video
`1063414612882026`, na-verify 2026-07-27.)*

**Day 7 — ibigay sa ad-strategist:** gastos, messages, hook rate, hold rate, CPM
(kukunin ng agent) + **booking count at halaga** (kay Neil lang galing). Ito ang
magiging **unang entry** ng ledger, at doon papasok ang brief para sa 2–3 bagong
konsepto.

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
