# Ad Performance Ledger

The compounding database behind the `grifon-ad-strategist` skill: every paid
campaign we run (Meta via the Ads CLI, TikTok by hand) gets an evidence-bound
entry here, patterns accumulate in the index, and nothing graduates to a
spend-strategy change without ≥3 corroborating campaigns. **Read top-to-bottom
before recommending any structure or budget** — the entire point is to stop
re-burning budget on lessons we already paid for. Maintained by
`.claude/skills/grifon-ad-strategist/`.

**Cafe-PC rule:** commit every update immediately
(`ad-strategist: log <campaign> — MER <x>`). Uncommitted work dies with the
reboot, and this file is the only thing that makes the skill smarter over time.

**North Star = MER** (Marketing Efficiency Ratio = total revenue ÷ total ad
spend). Target **3–5×**. Diagnostics (hook rate, hold rate, CTR, CPA, frequency)
explain *why* MER moves; we scale on MER/ROAS, never on a diagnostic alone.

## Pending Actions

- [x] **Provision the Meta Ads CLI** — ✅ **DONE 2026-07-27.** System User
  `Oceanides Automation` (`61592724653740`), non-expiring token in `.env`,
  `AD_ACCOUNT_ID=585951286230395`. Full runbook (with the three traps that cost
  90 minutes) in `workflows/infra_setup.md` §7. Token dies with the defreezer
  every reboot — Neil keeps it in Bitwarden.
- [ ] **FIRST CAMPAIGN BUILT, ONE TOGGLE FROM LIVE — Oceanides / Kuya Marvin
  KM-003.** All three objects exist and are **PAUSED** (₱0.00 spent):
  campaign `120250672316430347` · ad set `120250672331730347` · ad
  `120250673468830347`. **Engagement → Messaging apps**, maximize conversations,
  1 CBO / 1 ad set, **NCR (20 km radius)** + Advantage+, ₱500/day.
  NOT Sales — at ₱500/day a sales-optimized ad set gets ~10 events/week against
  the ~50 needed to exit learning, and Sales→Messaging additionally needs CAPI
  for Business Messaging to feed conversions back. No pixel: messaging
  conversions are counted at the Page, and the only dataset on that account is
  Neil's own "Grifon Pixel" (`1921429268517231`) which must NOT be attached.
  **Remaining before Neil flips it ON:** 3–5 organic posts on the Page, verify
  the AI label, and switch Advantage+ *Text improvements / Translate* OFF.
  **The three numbers are no longer blocking** — the gate was split (week 1 runs
  on cost-per-conversation alone), and Neil's manual `Create order` / `Mark as
  lead` recording in the Page inbox will generate two of the three by Day 7.
  Full handoff: `clients/oceanides/kuya-marvin/ads/NEXT-SESSION.md`.
- [ ] **Agent can now BUILD campaigns, not just read.** Nine
  `mcp__claude_ai_Meta_Ads__ads_create_*` / `_get_*` rules are allowlisted in
  `.claude/settings.json`. **`ads_update_entity` and `ads_activate_entity` are
  deliberately absent** — they are the only tools that flip a campaign ACTIVE,
  so the "never spend autonomously" guardrail is enforced by the permission
  system, not only by this skill's policy. Do not add them without Neil.
- [ ] **Creative diversification gap (Andromeda).** hook1 and hook2 share
  seg2-seg6 byte-for-byte — clean as an experiment, weak as delivery: the
  retrieval engine reads near-identical videos as cosmetic dupes and prices
  CPM accordingly. Playbook wants 4-6 genuinely distinct creatives in the ad
  set. Needs a `grifon-cmo` + `grifon-creative-director` brief for 2-4 new
  concepts (different opening visual/format, not a new hook on the same body).
- [x] **Log the first real campaign** — ✅ **DONE 2026-08-03.** KM-003 (Meta,
  Oceanides): ₱1,284.92, ~100 messages, ₱12.85 each, **1 order.** Four patterns
  opened (A1-A4), all `observed` at 1/3. The skill now runs on canon **plus one
  data point** — still not enough to change a spend rule (≥3 gate).
- [ ] When ≥10 campaigns are logged, revisit whether the parked Python tools
  (`tools/run_meta_campaign.py`, `tools/sync_ad_insights.py`) are worth building
  to auto-append insights — see `workflows/post_beta_roadmap.md`.

## North-Star Tracker

Weekly MER and spend, revenue split by funnel stage. Update one row per week.

| Week | Platform(s) | Spend | Revenue | MER | New-cust rev | Returning rev | Retargeted rev | Notes |
| --- | --- | --- | --- | --- | --- | --- | --- |
| 2026-07-28 → 08-03 | Meta | ₱1,284.92 | 🔴 1 order, halaga **hindi kumpirmado** | — | — | — | — | KM-003. 2 araw lang ang delivery, tapos naka-off (Marvin→Gabriel pivot, HINDI performance kill). **Walang MER: hindi pa ibinibigay ni Neil ang halaga ng order, at bawal mag-imbento.** Lumang ₱4,000-4,500 pricing pa yun, hindi ₱5,000. |

## Unit Economics — Oceanides (galing mismo kay Neil, 2026-08-03)

COGS kada truckload (isang customer, isang load, sa kasalukuyang ₱5,000 na presyo):

| Gastos | Halaga |
| --- | --- |
| Truck malabanan | ₱2,500 |
| Field inspector (Gabriel) | ₱500 |
| Transportation allowance | ₱600 |
| Zam | ₱250 |
| Neil | ₱250 |
| **Kabuuan** | **₱4,100** |

**Ang mga numerong lumalabas dito, at ang totoong hugis ng laban:**

- **Net margin kada load: ₱900 (18%).** Hindi ₱650 gross ang tamang bilang — ₱900
  matapos ang LAHAT ng payout, bago ang ads.
- **Break-even sa ads: ₱900 kada BOOKED na trabaho.** Kapag lumagpas sa ₱900 ang
  gastos-sa-ads para makakuha ng isang bayad na trabaho, lugi ang trabahong yun.
  Sa ₱500/araw na budget: kailangan ng di bababa sa **isang booked job kada 1.8
  araw** para lang pumatas.
- **Break-even MER = 5.6×** (5,000 ÷ 900). 🔴 **Mas mataas ito sa 3-5× na target
  band ng ledger na to** — sa 18% na margin, ang "magandang" MER na 4× ay lugi pa
  rin kada marginal na trabaho. Para sa Oceanides, 5.6× ang pasang-awa, hindi 3×.
- **Ang pangalawang truckload ang margin machine.** ₱5,000 ulit ang singil pero
  ~₱2,500 na lang ang dagdag na gastos (truck lang; bayad na ang inspector,
  transport, at payouts) → **₱2,500 margin (50%) laban sa ₱900 (18%)** ng una.
  Ang bawat "hindi kasya sa isang load" ay hindi problema — sya ang tubo.
- Wala pang conversion data ang ₱500/araw (sabi mismo ni Neil) — ang mga bilang
  sa itaas ang panukat kapag dumating ang unang linggo ng totoong spend.

## Pattern Index

Status: `observed` (counting) → `proposed` (≥3 corroborations, in Gated
Proposals) → `applied` (now standard practice / wired into a CMO or CD brief).

| ID | Pattern | Corroborations | Status |
| --- | --- | --- | --- |
| **A1** | **Mechanism-diagnosis hook** ("hindi X, Y pala") sa Solution Aware na kategorya → elite retention sa 0:03 at pinakamababang CPM sa account. KM-003: ₱79.29 CPM laban sa ₱119-₱340 ng bawat ibang video sa parehong account. | 1 | observed |
| **A2** | **Ang alok na nangangailangan ng ISA PANG USAPAN ay kumakain ng mid-video retention.** KM-003: 41% ang nawala sa 9.2s-18.4s, eksaktong kinaroroonan ng "libre ang tingin". Matatag ang retention bago at pagkatapos nun (58.8% → 70.6% → 73.2% → 88.4%). | 1 | observed |
| **A4** | 🔴 **Ang tripwire na nangangailangan ng PISIKAL na bisita ay may sahig na katumbas ng cost ng bisitang yun.** Oceanides: ₱1,100 (inspector + transport) bago pa ang truck, kaya ang ₱499 ay subsidy na ₱601 kada usapan at ang libre ay ₱1,100 na lugi kada beses. Ang presyo ng tripwire ay **hindi psychological choice** dito — ang visit cost ang nagtatakda, at ang ₱499→₱999 ay nagpapababa ng kailangang conversion mula 40% papuntang 10%. | 1 | observed |
| **A3** | 🔴 **Ang murang cost-per-conversation ay FALSE POSITIVE kapag masama ang close.** KM-003: ₱12.85/message (3× mas mura sa ₱40-80 target band) pero 100 message → **1 order = 1%**. Ang kill gates na naka-base sa gastos-kada-usapan ay pumasa habang bumabagsak ang negosyo. | 1 | observed |
| **A4** | **Ang haba ay dapat sukatin sa kung saan bumabagsak ang retention, hindi sa kung ano ang kasya sa script.** 36.8s ang KM-003; 10s ang average na panonood; 8.0% lang ang umabot sa dulo. Ang CTA sa 36s ay nakikita ng 8 sa bawat 100. | 1 | observed |

## Gated Proposals

*Spend-strategy changes (default structure, budget rules, kill thresholds,
standing creative briefs) awaiting Neil. Only patterns with ≥3 corroborating
campaigns may appear here. The skill never auto-applies these — and never spends
autonomously regardless.*

- _(none yet)_

## Entries

Append newest at the top. Use the template below.

### 2026-08-04 — OCEANIDES-PRICE-01 (Meta, PH septic tank siphoning) — 🟢 BUHAY, walang data pa

**Brief from:** grifon-cmo (price transparency) · **Creative from:** kuya-marvin-ads + static-autopsy ports
**Structure:** 1 CBO / 1 ad set / **4 static** · **Objective:** OUTCOME_LEADS → Website · **Budget:** ₱500/araw
**Break-even:** **₱900 kada booked job**, MER 5.6× (tingnan ang §Unit Economics)

| ID | |
| --- | --- |
| Campaign | `120248564326850056` |
| Ad set | `120248564354250056` |
| Ad account · Page | `4165212657057538` · `1184710811397498` (Kuya Marvin) |
| Dataset · event | `1050997330667084` · `Lead` |

**Geo:** custom location, lat `14.54` lng `121.02`, radius **20km** mula Makati,
`location_types: ["home"]`. 🔴 **Kinopya mismo sa KM-003** (ibinigay ni Neil) —
hindi region key. Walang region-lookup tool ang MCP connector at bawal manghula
ng geo, kaya ang coordinate radius ang tanging paraang eksakto. Tandaan ito.

**Apat na creative, apat na magkaibang pasok:**

| Ad | Pasok | Pattern |
| --- | --- | --- |
| addons-ticket | presyo | resibo/ticket |
| warranty-proof | panganib | totoong ba-1 litrato |
| **hooktest-chalk** | mekanismo | **S34/S35** — tisa sa takip ng tangke, walang logo |
| **advertorial** | kwento | Suby na anyo ng artikulo, Oceanides ang pumipirma |

🔴 **WALANG VIDEO, at labag ito sa sariling patakaran ng run sheet** ("2 static +
1 video"). Hindi kasalanan ng plano: **hinarang ng Meta ang
`ads_creative_upload_video`** sa account na to (*"tool is being gradually rolled
out"*), at kailangan ng `video_id` na naka-upload na bago makagawa ng video
creative. Blanko ang video library. **Manwal na i-upload ang `KM-004-AD-v1.mp4`
sa Ads Manager** at idagdag sa parehong ad set. Ganon din ang `ads_get_ig_accounts`
— gated, kaya **walang Instagram placement** hangga't hindi naikakabit ni Neil.

⚠️ **Sinuspinde ang `ad-spend-gate.sh` para sa launch na to** (basbas ni Neil,
2026-08-04: *"tanggalin mo ung rules na un tonight"*), at **naibalik agad
pagkatapos**. Ito ang unang beses. Ang agent ang gumawa at nag-ON ng buong
campaign — hindi si Neil.

**So-What (pauna, wala pang data):** ang linggo 1 ay sumasagot ng *leads ÷ landing
page views*. **Pero magbilang din ng BOOKED JOB mula araw uno** — nasa lead ang
kill gates, nasa booked job ang break-even, at yun mismo ang bitag ng **A3**.

**Patterns:** unang totoong subok ng **S34** at **S35** sa labas ng Brunson. Kapag
nanalo ang chalk, ito ang pangalawang brand ng S34 at lalapit ang **GP-6** sa
`proposed`. Bagong subok din: **branded laban sa anonymous** (dalawang branded
static laban sa isang walang logo) — i-log kung alin ang nanalo.

#### Unang data pull — 2026-08-04, 2:55 PM PH (mga 12 oras ng delivery)

Hinila dahil sa tanong ni Neil: *"di kaya may leak ung pixel kasi parang walang
traffic na napasok sa website."* **Walang leak.** Nakalista ang sagot dito para
hindi na ulit imbestigahan mula sa simula.

| Ad | Impr | Clicks | Outbound | **LPV** | Lead | Gastos |
| --- | --- | --- | --- | --- | --- | --- |
| addons-ticket | 312 | 29 | 10 | 6 | 0 | ₱83.77 |
| hooktest-chalk | 249 | 27 | 9 | 7 | 0 | ₱25.88 |
| km004-video | 143 | 7 | 7 | 5 | 0 | ₱10.09 |
| advertorial | 68 | 12 | 2 | 1 | 0 | ₱10.65 |
| warranty-proof | 20 | 1 | 0 | 0 | 0 | ₱18.80 |
| **Total** | **792** | **76** | **28** | **19** | **0** | **₱149.19** |

**Patunay na buhay ang pixel** (dataset `1050997330667084`): `is_active: true`,
huling putok 2026-08-04 1:53 PM PH. Ang `landing_page_view` ay galing mismo sa
pixel — kung sira ang tracking o mali ang domain, zero yan; **19** ang nakuha.

**Sagot sa custom link kada ad:** ang naka-register sa dataset at sa domain
verification ay **host** lang (`oceanidesph.com`), hindi buong URL. Kaya walang
epekto ang `?utm_source=fb&utm_medium=paid&utm_campaign=oceanides-price-01&utm_content=<ad>`.
Masisira lang kung ibang host na ang ituturo ng ad (bit.ly, linktree, kahit anong
redirect na nagtatapon ng `fbclid`). Wala tayong ganon at wag ding gagawin.

**Walang ibang site na gumagamit ng pixel natin.** Sa 7 araw, ito lang ang
nagpaputok: `oceanidesph.com`, `www.oceanidesph.com`, `oceanides-price-page.vercel.app`
(testing 08-02), `localhost` (dev machine). Wala nang iba.

**Kaya nasa page ang butas, hindi sa tracking.** 19 pumasok, 0 nag-submit —
kinumpirma sa Supabase, walang kahit isang row sa `funnel_leads` para sa
oceanides. **Pero masyado pang maaga para husgahan.** Wag munang galawin ang page
hangga't hindi umaabot ng **50-100 LPV** (mga ₱400-700 pa sa rate na to).

🔴 **Dalawang bagay na hindi pa tapos, at pareho silang nagbabawas sa bilang:**
1. **AEM Configure Web Events — HINDI PA NA-VERIFY.** Nakasulat sa
   `workflows/funnel_deploys.md` na ito ang huling hakbang bago ang ads, pero
   walang MCP tool na makakatingin nito. Kung hindi **#1 priority ang `Lead`** sa
   `oceanidesph.com`, **ang iPhone traffic ang unang mawawala sa attribution.**
   Kay Neil ang pag-check sa Events Manager (browser, desktop mode — wala sa app).
2. **Sarado ang Advanced Matching, walang CAPI** (sinadya, para sa privacy
   policy). Browser-only ang signal, kaya ang bilang ng pixel ay **floor** —
   laging mas mababa kaysa totoo dahil sa ad blocker at iOS.

#### 🔴 PINATAY 2026-08-05, 1:47 PM — 0 conversion sa 77 bisita

**Si Neil ang pumatay**, lahat ng lima sa loob ng 11 segundo. Dahilan, sarili
nyang salita: *"ayoko na mag sunog dahil para sakin sapat na yang 72 visitors na
hindi nag convert."*

**Panghuling bilang (mga 36 oras ng delivery):**

| Ad | Impr | CTR | Outbound | LPV | ₱/link click | CPM | Gastos |
| --- | --- | --- | --- | --- | --- | --- | --- |
| **km004-video** | 1,074 | 9.40% | **72** | **55** | ₱3.97 | ₱266 | ₱285.93 |
| **hooktest-chalk** | 338 | 14.50% | 13 | 11 | **₱3.21** | **₱123** | ₱41.70 |
| addons-ticket | 459 | 10.02% | 14 | 9 | ₱8.35 | ₱255 | ₱116.89 |
| advertorial | 97 | 15.46% | 3 | 2 | ₱5.19 | ₱160 | ₱15.56 |
| ⛔ warranty-proof | 28 | 3.57% | 0 | 0 | — | ₱811 | ₱22.71 |
| **Kabuuan** | **1,996** | 10.62% | **102** | **77** | ₱4.73 | — | **₱482.79** |

**₱6.27 kada bisita sa page. Gumana ang ads.** Panalo si km004-video: kalahati ng
impressions pero **71% ng lahat ng pumasok**, at 71% ng clicks nya ay totoong
lumabas papunta sa site (30% lang ang ibang ads). Pinakamura si chalk sa CPM
(₱123 laban sa ₱255 at ₱811) — **anim na beses na mas mura ang parehong tao
kapag chalk ang ipinakita.** Unang totoong panalo ng **S34** sa labas ng Brunson.
Patay si warranty-proof: ₱22.71 para sa 28 impressions, zero outbound.

**Paano naipit ang dahilan, isa-isang pinatay ang suspek:**

1. **Hindi ang pixel.** Buhay ang dataset, at ang `landing_page_view` mismo ay
   galing sa pixel — kung sira yun, zero sana ang 77. Walang ibang host na
   nagpaputok ng pixel natin sa 7 araw.
2. **Hindi ang custom na `?utm_...` na link kada ad.** Host lang ang naka-register
   sa dataset at sa domain verification, hindi buong URL.
3. **Hindi ang form.** Sinubukan mismo ni Neil sa phone 2026-08-05 4:48 PM —
   dumating ang row (`Las Piñas` / `Tenant ako` / `Apartment o boarding house` /
   `Oo, alam ko`), kumpleto ang qualifiers. ⚠️ Nagkamali ang agent dito noong una:
   pinaghinalaan ang `104e68a` na sya raw ang sumira ng form, pero **`Presyo.tsx`
   lang ang ginalaw nun** — ang internal ops page, hindi ang public form.
4. **Hindi rin sila tumawag o nag-message.** Kumpirmado ni Zam: **zero** sa
   parehong pinto. Namatay ang teoryang "may customer tayo, bulag lang tayo."
5. **Ang 8:00 AM na paghinto ng PageView ay hindi bug.** Nag-error ang payment
   method ni Neil (*"unverified daw"*) kaya tumigil ang delivery. Naayos na.

**Kaya nasa OFFER o sa PAGE ang natitira.** At hindi pa natin sila mapaghiwalay
— **nasa pang-14 sa 17 section ang form** at walang scroll data, kaya hindi
alam kung *"nakita nila ang ₱5,000 at umatras"* o *"hindi man lang sila nakarating
dun."* ✅ Naayos na to: may `FormViewed` na custom pixel event ngayon
(`src/lib/pixel.ts` + `LeadForm.tsx`, 2026-08-05) na pumuputok kapag umabot sa
form. **`trackCustom`, hindi standard event** — para hindi magalaw ang AEM
ranking at ang relearning ng `Lead`. ⏳ Kailangan pa ng redeploy (CLI, hindi
git-connected).

⚠️ **Manipis pa ang sample.** Ang 0 sa 72, kung 3% ang inaasahan, ay nangyayari
nang nagkataon **isang beses sa siyam**. Tama ang pagpatay para hindi masunog ang
pera; **hindi patunay** ang 72 na mali ang offer.

#### Ang ₱1,100 na sahig — bakit hindi pwedeng ₱499 ang tripwire

Napag-usapan ang paglipat sa **tripwire / doctor strategy**: bayad na septic
health check bago ang ₱5,000 sipsip, may reseta (septic health report). Ang
unit economics sa §Unit Economics ang dumidikta ng presyo:

> **Field inspector ₱500 + transportation ₱600 = ₱1,100** para lang makapagpadala
> ng tao sa bahay nila, bago pa ang truck.

Kaya ang **₱499 ay hindi tripwire — sya ay ₱601 na binabayaran mo kada usapan.**
Ang ₱1,100 na yun ay **nasa loob na ng ₱4,100**, kaya walang bagong gastos ang
check na nauuwi sa sipsip; ang **hindi** nag-convert lang ang bagong lugi. Break-even,
kada 100 check:

| Presyo ng check | Kailangang mag-convert sa sipsip |
| --- | --- |
| Libre | imposible (₱1,100 lugi kada check) |
| ₱499 | **40%** |
| **₱999** | **10%** |
| ₱1,499 | 0% (kumikita kahit walang mag-sipsip) |

🔴 **Bawal ang cash refund.** Ang *"ibabalik namin kung hindi pa puno"* ang
pinakamahal na kaso: ₱1,100 nagastos **tapos** ₱499 pa ang isasauli. Ang lunas ay
**credit, hindi cash** — panalo pa rin ang tao, nasa yo pa rin ang pera, at
nawawala ang pinakamahinang linya (*"walang refund kung critical pero ayaw magpasipsip"*),
na sya ring pinakamadaling pagmulan ng reklamo at chargeback.

⚠️ **Sarili nating data ang unang babala laban sa diagnostic offer:** tingnan ang
**A2** sa ibaba. Sa KM-003, **41% ang nawala sa 9.2s-18.4s, eksaktong kinaroroonan
ng "libre ang tingin."** Nasubukan na ang frame na to minsan at dun mismo bumagsak.

#### ✅ DESISYON 2026-08-05 — si Paolo ang bibili, hindi si Helen

Pagkatapos ng grill: **"Compliance-Pressured Paolo" (B2B) ang avatar ng tripwire,
hindi si "Homeowner Helen."** Tatlong dahilan, sang-ayon si Neil:

1. **May silbi sa kanya ang reseta.** May pinagfa-filan sya (permit renewal, DENR
   inspection). Kay Helen, papel lang na nagsasabing wala syang problema.
2. **Bumabalik sya taon-taon.** Ang tripwire ay pasukan sa kontrata, hindi sa
   iisang sipsip.
3. **Nasasagot nya ang butas na sinabi ni Zam** (*"sino ba si Marvin, wala silang
   reviews"*). Bumibili si Paolo ng papeles para sa gobyerno — ang tanong dun ay
   *"tanggap ba to ng DENR"*, at kayang sagutin yun ng permit at manifest.

🔴 **Kasunod nito: mali na ang targeting ng patay na campaign.** `location_types:
["home"]` sya. Bahay. Bagong targeting, bagong creative, bagong page kay Paolo.

⚠️ **Hindi na kailangan ng bagong market research at hindi na kailangang mag-imbento
ng value stack** — nagawa na pareho noong 2026-07-20. Avatar: `Oceanides
market-research.md` §2. Buong hagdan (tripwire → core → high-ticket, may value
stack): `clients/oceanides/offer-optimizer-denr-2026-07-20.md`. **RAW at hindi
approved yun**, at tatlo ang sariling flag nito: ang `₱9,500` core ay lumalabag sa
₱12k/load floor; imbento ang penalty-payment guarantee at bawal sa copy hangga't
walang tanggap ni Neil; at **pinark mismo nito ang paid tripwire** (*"manatiling
LIBRE... pwedeng maging future B2B test, pero hindi nang walang hiwalay na
desisyon"*). **Ang desisyon 2026-08-05 na ito ang hiwalay na desisyong yun.**

⚠️ **Bawiin ang lumang "₱999" na rekomendasyon.** Hango sya sa **₱5,000** na core
ni Helen (₱900 margin), kaya 40% ang kailangang conversion sa ₱499. Ang core ni
Paolo ay `₱12k/load` pataas hanggang ₱48k na package — ilang beses na mas malaki
ang margin, kaya **bumabagsak nang husto ang kailangang conversion at hindi na
mahalaga ang eksaktong presyo ng tripwire.** I-recompute kapag napagdesisyunan na
ang core.

**Bukas pang desisyon:** 🔴 **kaya ba talagang maglabas ng Oceanides ng DENR
manifest / Certificate of Proper Disposal / Annual Compliance Certificate?**
(papeles ang binebenta ng buong hagdan — wala ang sagot sa repo) · pisikal na
hugis at gastos ng check (kailangan ba ng truck?) · no-show at hindi-nagbayad ·
online checkout laban sa cash-on-arrival · capacity kada linggo.

---

### 2026-07-28 → 08-03 — OCEANIDES-KM003-hook2 (Meta, PH septic tank siphoning / local service)

**Brief from:** grifon-cmo (mechanism reframe: *"hindi barado, puno na"*) · **Creative from:** kuya-marvin-ads (**1** concept, 9:16 UGC, 36.8s)
**Structure:** 1 CBO / 1 ad set / **1 creative** · **Objective:** OUTCOME_ENGAGEMENT → Messaging apps, maximize conversations · **Budget:** ₱500/araw · **Window:** 2 araw ng delivery
**Break-even:** hindi kalkulado. Walang net margin si Neil noon; sinadyang hinati ang gate (linggo 1 = proseso lang). Gross kada residential job = **₱650** (`oceanides_offer_price_page.md` §3).

| Spend | Revenue | MER | Messages | ₱/message | CTR | CPM | Frequency | Reach |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| ₱1,284.92 | 🔴 1 order, halaga di kumpirmado | — | ~100 | **₱12.85** | 6.57% | **₱79.29** | 1.39 | 11,666 |

**Video funnel** (15,040 plays sa 16,205 impressions):

| Play → 9.2s | → 18.4s | → 27.6s | → 35s | → dulo | ThruPlay | Avg |
| --- | --- | --- | --- | --- | --- | --- |
| 4,460 (29.7%) | 2,621 (**58.8%**) | 1,850 (70.6%) | 1,355 (73.2%) | 1,198 (88.4%) | 3,710 | **10s / 36.8s** |

**Ano ang nangyari:**
- **Hindi pinatay dahil sa performance.** `single_all_ad_off` matapos ang 2 araw — **Marvin→Gabriel pivot** (Neil, 2026-07-30). Mahalaga ang pagkakaiba: ang pinakamagandang creative sa account ang huminto sa kadahilanang wala sa numero.
- **Pinakamagandang video na napatakbo sa account na ito, sa dalawang sukat nang sabay.** Pinakamababang CPM (₱79.29 laban sa ₱119.67 / ₱150.87 / ₱251.51 / ₱148.59) at pinakamataas na completion (8.0% laban sa 7.7% / 6.2% / 6.0% / 3.8%), sinuri laban sa lahat ng 30 ad sa `585951286230395`.
- **₱12.85/message = 3× mas mura kaysa sa ₱40-80 na target band.** Pasado sa bawat linya ng kill gate.
- 🔴 **At isang order pa rin.** 11,666 na naabot → ~100 message → **1**. Ang butas ay ang close, hindi ang lead gen. Pare-pareho ang namamatayan: *magkano?* → *"depende sa location, 4k to 4500"* → tahimik.
- **Hook×Hold:** mataas ang hook (29.7% ang umaabot sa 9.2s), **bumabagsak ang hold sa gitna** (58.8% lang ang nakakatawid sa 18.4s), tapos matatag ulit. Ang 41% na yun ay hindi kumakalat sa buong video — nakaupo sya sa isang bloke, at doon mismo nakalagay ang **"libre ang tingin."**

**So-What para sa susunod na campaign:** **Hindi ang murang usapan ang panalo. Ang close.** Dalawang bagay ang binabago nito, at pareho nang naaprubahan (Neil, 2026-08-03): (1) ang destination ay **price page**, hindi Messenger, para hindi na kailangang sagutin ng tao ang *"magkano"*; (2) ang alok sa creative ay hindi na *"libre ang tingin"* (isa pang usapan, at yun ang kumain ng 41%) kundi **"nakasulat ang presyo"** — kayang tapusin mag-isa. Hawak ang hook, pinapalitan ang dulo, **15-20s hindi 36.8s.**

**Patterns:** bagong kandidato **A1, A2, A3, A4** (lahat 1/3, `observed` — isang campaign ay anecdote). Sinasalungat: wala. ⚠️ **A3 ang pinakamahalaga at ito rin ang pinaka-mapanganib** — kung nagbago ang kill gate natin dahil dito habang 1/3 pa lang, nagpapalit tayo ng patakaran base sa isang campaign. Hindi pa sya gated proposal.

**Kulang pa:** ang eksaktong halaga ng isang order na yun (lumang ₱4,000-4,500 pricing — kung ₱4,500, MER ≈ 3.5; kung ₱4,000, ≈ 3.1; hindi pa kumpirmado alin). ✅ **Dumating na ang net margin (2026-08-03)** — see §Unit Economics sa itaas: ₱900/load sa bagong ₱5,000 pricing, break-even MER 5.6×. Kahit ang 3.5 na pinakamagandang basa ng KM-003 ay **lugi** sa ganyang margin — pinapatibay nito ang So-What: ang close ang laban, hindi ang lead cost.

### Entry template

```markdown
### <YYYY-MM-DD> — <campaign> (<platform>, <brand/niche>)
**Brief from:** grifon-cmo (<angle/offer>)  ·  **Creative from:** grifon-creative-director (<format, # concepts>)
**Structure:** <CBO/ABO, # ad sets, # creatives>  ·  **Objective:** <e.g. OUTCOME_SALES>  ·  **Budget:** <₱/day>  ·  **Window:** <Xd>
**Break-even ROAS:** <1 ÷ net margin = X>

| Spend | Revenue | MER | ROAS | Hook rate | Hold rate | CTR (link) | CPM | CPA | Frequency |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| | | | | | | | | | |

**What happened:**
- <killed: which ad, why (cite the kill criterion + the number)>
- <scaled: which ad, the budget move made, the result>
- <Hook×Hold read per top creative>

**So-What for the next campaign:** *(mandatory — an entry without this is incomplete)*
<the one decision this changes next time, with the number behind it>

**Patterns:** corroborates <IDs>; new candidate: <or none>; contradicts: <or none>
```
