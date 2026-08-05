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
| **A4** | 🔴 **Ang sahig ng bayad na tripwire ay ang cost ng bisita, at ang cost na yun ay ROUTE DENSITY, hindi isang numero.** Oceanides: ₱1,100 kapag iisa ang bisita sa maghapon (inspector ₱500 buong araw + pamasahe ₱200-300 kada direksyon), pero **~₱400 na lang kapag tatlo hanggang apat ang stop sa isang araw** — hati na ang ₱500 at magkalapit na ang sakayan. **Ibig sabihin: hindi presyo ang lever, GEO CLUSTERING ang lever.** Ang parehong ₱499 ay lugi sa kalat na booking at kumikita sa siksik na ruta. I-target ang lugar, huwag ang bayad. | 1 | observed |
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

#### ✅ KUMPIRMADO 2026-08-05 — kaya ng Oceanides ang papeles

Sagot ni Neil sa Tanong 2 ng grill. **Ito ang pinaka-load-bearing na fact ng buong
hagdan ni Paolo**, kaya nakasulat sya dito at hindi sa chat lang:

- **Kumpleto sa DENR compliance papers**, at **may LLDA na** (bago) — sya ang
  madalas hanapin ng malalaking kompanya.
- **Hauler na may MOA** sa isang treatment facility. May legal na tapunan.
- **Nakakapag-issue ng manifest na nakapangalan sa kliyente**, patunay na sa
  DENR-accredited na facility napunta ang waste nila.
- **Hindi teorya:** marami nang na-issuehan ng DENR certificate si Boss Jay.
- **Presyo: ₱12,000-₱15,000 kada dokumentadong load.**
- ⏳ **15 ARAW ang delivery ng certificate mula sa treatment-facility partner.**
  🔴 **Hindi sya pang-emergency, at hindi dapat ipangakong mas mabilis.** Ang
  48-oras na pangako sa tripwire ay para sa ATING sariling health-check report,
  **hindi** sa certificate — dalawang magkaibang papel sila at hindi sila dapat
  paghaluin sa copy. Ang 15 araw ay urgency lever din: kung [buwan] ang renewal,
  ngayon dapat magsimula.

🔴 **Ang partial-documentation na gawi ay KALABAN, hindi produkto.** Sabi ni Neil,
kadalasan sa 20 loads ay dalawa lang ang ipinapasok sa DENR certificate para
makatipid o manalo sa bidding, at wala pang naging issue sa naserbisyuhan ni Boss
Jay. **Wag na wag itong papasukin sa offer o sa copy.** Tatlong dahilan: (1) ang
generator pa rin ang mananagot sa RA 9275 kaya papel na hindi sumasakop sa lahat
ng load ay hindi proteksyon, (2) *"walang naging issue"* ay ibig sabihin **wala
pang nag-inspect**, hindi ibig sabihin ligtas, at (3) ito mismo ang villain na
nakasulat sa avatar ni Paolo — *"may suki na kaming pasipsip, mas mura, pero
walang resibo, walang manifest."* Kapag ginawa natin, tayo na ang suki.
**Buong dokumentasyon ang wedge natin laban sa kakumpitensya, at yun ang dahilan
kung bakit may premyo ang ₱12-15k kada load.**

#### ✅ KUMPIRMADO 2026-08-05 — ang bisita mismo (Tanong 3 ng grill)

- **WALANG TRUCK.** Marunong nang tumingin ng tangke sina Marvin, Neil at Boss Jay.
- **Ano ang ginagawa:** sukat ng tangke, ilan ang tangke, at ang status — umaapaw
  ba, puno na ba, barado ba, makapal ba ang burak, likido lang ba o **purong
  solid**. Iyan ang buong technical na laman ng report.
- **Sino:** si Marvin ang mukha. Kapag dami ng booking: Neil, Boss Jay, Gabriel,
  at isang bagong field inspector na hindi pa napapangalanan.
- **Gastos:** field inspector ₱500 **kada buong araw** (hindi kada bisita) +
  pamasahe ₱200-300 kada direksyon. Nag-iiba ayon sa layo — Bacoor si Gabriel,
  Manila sina Neil, Boss Jay at Marvin.
- **Bilis:** **2 oras kada kliyente** kasama ang byahe at ang pag-usap ng report.
  Kaya **3-4 na bisita kada tao kada araw** ang totoong takda.
- ⚠️ **Naghihintay sila ng susunod na booking bago umuwi**, kaya ang huling stop
  ang nagtatakda ng pamasahe. **Ito mismo ang dahilan kung bakit route density
  ang lever** — tingnan ang **A4**.

#### 🟡 IMBENTO NI NEIL 2026-08-05 — AI septic health report (endorsed, may 3 kondisyon)

Kukunan ng video at susukat ang field inspector, ipapakain sa AI agent (Gemini
eyes), at **sa loob ng minuto** ay lalabas ang report na may logo ng Oceanides:
status, dapat gawin, kailangang serbisyo, guarantee, urgency (Cialdini).

**Endorsed.** Tatlong dahilan: (1) **nagsasara habang nakatayo pa dun ang tao** —
bawat oras sa pagitan ng diagnosis at desisyon ay bumabawas ng close rate, at
tinatapos nito ang 48 oras; (2) **pareho ang kalidad ng lahat ng inspector**,
kasama ang bago pa lang — yun ang paraan para lumampas ka sa isang magaling na
tao; (3) **may naiiwang artifact** ang binayarang ₱499, at ang mga video ay
nagiging proof library na sagot sa *"wala silang reviews."*

🔴 **Tatlong kondisyon bago sya itayo:**
1. **HINDI ang AI ang magdedesisyon kung puno na.** Sukat ang ilalagay ng tao
   (lalim ng burak, sukat ng tangke, porsyento), at ang rekomendasyon ay susunod
   sa **nakasulat na panuntunan**, hindi sa pakiramdam ng modelo. Kapag AI ang
   nagsabing critical at mali sya, may naibentang ₱12-15k na trabaho ang isang
   hallucination — at ang nagdesisyon ay pag-aari ng nagbebenta.
2. **HATIIN ang dokumento.** Pahina 1-2 = tuyot na assessment (sukat, litrato,
   RA 9275 gap, pirmado) — yan ang ipa-file at ipapakita ni Paolo sa boss nya.
   Pahina 3 = rekomendasyon at alok. Kapag hinaluan ng urgency ang assessment,
   nagiging brochure sya at yun mismo ang credibility na binabayaran nya.
3. **Kailangan ng offline na daan.** Basement at likod-bahay ay walang signal.
   I-save ang video, gawin ang report paglabas — pero may template na kayang
   punan ng inspector kung mawalan.

⚠️ **Ubos ang Gemini budget** (`NOW.md`). Hindi sya maitatayo ngayong linggo.

#### ✅ UNIT ECONOMICS NI PAOLO 2026-08-05 — ibang negosyo ito, hindi mas malaking Helen

Sagot ni Neil sa Tanong 5. **Ito ang numerong nagbabago ng lahat.**

| Kada dokumentadong load | ₱12,000 | ₱15,000 |
| --- | --- | --- |
| Treatment facility | ₱6,000 | ₱6,000 |
| Truck + crew (kasama na ang crew) | ₱2,500 | ₱2,500 |
| **Gross kada load** | **₱3,500** | **₱6,500** |

Isang beses lang kada TRABAHO ang payout (inspector ₱500 + transport ₱600 + Zam
₱250 + Neil ₱250 = ₱1,600), hindi kada load. Kaya:

| Trabaho (₱15k/load) | Net | Beses ang ₱900 ni Helen |
| --- | --- | --- |
| 1 load | **₱4,900** | 5.4× |
| 2 loads | **₱11,400** | 12.7× |
| 5 loads | **₱30,900** | 34× |

🔴 **Ibig sabihin: patay na ang lumang break-even na ₱900 at ang MER 5.6×.** Kaya
nang gumastos ng **hanggang ₱4,900 para sa ISANG booked na single-load na trabaho**
— **5.4× na mas maluwag** kaysa sa dating ₱900. Dito nakatago ang buong headroom.

**Ang tripwire ay malapit nang libre sa sarili nya.** Sa ₱999 at ~₱470 na gastos
kada bisita (3 stop kada araw), **~₱529 ang natitira kada check bago pa ang ads.**
Ang bawat core sale ay dagdag na, hindi kailangan para pumatas.

⚠️ **Dalawang bagay na hindi pa kumpirmado at kailangang tanungin bago mag-code:**
1. **₱500 kada load na hindi tugma.** Ang halimbawa ni Neil (5 load, ₱10,000 sa
   malabanan) ay ₱2,000 kada load, hindi ₱2,500. Ang ₱2,500 ang ginamit dito
   dahil sya ang konserbatibo. Alin ang tama?
2. **Buhay pa ba ang ₱1,600 na payout sa DENR na trabaho?** Hindi sya binanggit
   ni Neil sa breakdown ng dokumentadong load. Ipinagpalagay na buhay pa sya.

⚠️ **Mas mahal ang traffic ni Paolo.** Ang ₱6.27 kada bisita ay galing sa MALAWAK
na homeowner targeting. Mas makitid ang B2B, kaya asahan ang ₱15-40. Sa ₱30 at
3% checkout conversion, ~₱1,000 ang isang bayad na check — **katabi mismo ng
₱999.** Kaya ang totoong margin of safety ay **nasa core sale, wala sa tripwire.**
Hindi kailangang kumita ang tripwire. Kailangan lang nyang maging libre, at libre sya.

#### ✅ DESISYON 2026-08-05 — ₱999, online checkout sa PayMongo

- **₱999, hindi ₱499.** Hindi dahil "pang-break even" kundi dahil **sya lang ang
  presyong buhay sa unang dalawang linggo** habang kalat pa ang booking (1-2 stop
  kada araw). Sa siksik na ruta, pareho na silang kumikita.
- **Kasamang kondisyon: higpitan ang geo.** Isang siyudad muna, hindi buong 20km
  radius. **Ginagawa ang density, hindi hinihintay** (A4).
- **Online checkout, hindi pangungulit ni Zam.** Napagkasunduan matapos ituro ni
  Neil na (a) may PayMongo na ang Oceanides at kasama na ang GCash at bank
  transfer dun, kaya walang laman ang "ganon magbayad ang SME"; (b) ang oras ni
  Zam ang unang nasisira habang lumalaki; at (c) **bawat karagdagang tao sa daan
  ng pera ay lugar kung saan namamatay ang benta.** ⚠️ Itinama rin ang tantsa ng
  agent na "3 araw" — **isang upuan lang** sya: 65 linya ang `api/checkout.ts` at
  may `createCheckoutSession` na sa `api/_lib/paymongo.ts` (kailangan ng sariling
  kopya, bawal mag-import ang funnel mula sa repo root).

#### 🔴 HARD GATE 2026-08-05 — walang ads hangga't hindi totoo ang certificate

Lumabas sa premortem na may mga certificate na naibibigay para sa waste na **hindi
dumadaan sa treatment facility.** Hangga't ganon, **hindi maaaring i-ads ang alok
ni Paolo.** Nauuna ang gate na ito sa page, sa creative, at sa checkout.

**Bakit hindi sya operational na isyu lang:** ang KABUUAN ng ibinabayad ni Paolo ay
ang katiyakang hindi sya mananagot sa RA 9275. **Sya pa rin ang generator at sya pa
rin ang mananagot.** Kapag hindi totoo ang papel, ang ibinebenta natin ay ang
mismong panganib na akala nyang inaalis nya — at mas malala pa, may hawak na syang
papel na nagsasabing ligtas sya, kaya hindi na sya maghahanap ng tunay na solusyon.
Nasa pangalan ni Neil ang ads, ang pera, at ang partnership.

**At hindi naman sya kailangan.** ₱6,000 kada load ang natitipid — sa trabahong may
**₱6,500 na gross kahit binayaran ang facility.** 43% margin na kahit tama ang
ginawa. Hindi sulit ipagpalit ang negosyo, ang partnership, at ang pangalan para
doblehin ang margin na malusog na.

**Ang lunas ay nasa hawak na ni Neil.** Sya ang may access sa PayMongo at sya ang
naglilipat ng pera, kaya kaya nyang ipatupad ito nang walang pahintulot ninuman:

1. **Ang ₱6,000 kada load ay diretsong ibabayad sa facility mula sa perang hawak ni
   Neil, bago ilabas ang kahit anong iba.** Unang labas ang facility, hindi huli.
2. **Ang certificate ay galing sa facility.** Ang 15-araw na lead time ay mismong
   patunay na buhay at gamit ang tamang daan.
3. **Walang sinasabi ang ads na hindi naihahatid.**

Kapag ganon, **totoo ang papel dahil binayaran sya**, hindi dahil may nagpaalam.
Ang parehong kontrol sa pera na proteksyon ni Neil ay sya ring makina ng compliance.

⚠️ Sa mga naunang naibigay na certificate: **abogado ang dapat sundin**, wala yun
sa saklaw ng dokumentong ito at hindi sya masasagot ng marketing plan.

🔴 **Apat na bagay bago mag-code, at wala sa kanila ang tungkol sa checkout mismo:**
1. **Kaninong PayMongo?** Kay **Grifon** ang `VITE_PAYMONGO_PUBLIC_KEY` sa root
   `.env`. Kung nagamit yun, **ang kita ng Oceanides ay dadapo sa account ng
   Grifon** — gulo sa libro at sa BIR na mahirap ayusin pabalik.
2. **Sino ang maglalabas ng official receipt?** Negosyo ang bumibili at hihingi
   sya ng OR para sa libro nya. Ang PayMongo ay payment confirmation, **hindi BIR
   OR.** At **papeles mismo ang ibinebenta natin** — ito ang unang mapapansin nya.
3. **I-save ang lead BAGO ang checkout.** Kapag nakabitin ang lead sa likod ng
   bayad, nawawala ang bawat hindi natuloy at hindi natin sila mabibilang.
4. **Subaybayan ang credit.** May hawak kang pera at may utang kang serbisyo kapag
   hindi pala puno. Kailangan ng field at ng tanaw ni Zam.

#### ✅ SARADO ANG GATE — 2026-08-06, kausap na si Boss Jay

Apat sa apat, kumpirmado ni Boss Jay kay Neil:

1. **Dumadaan sa facility ang bawat load, babayaran ang nararapat.** Sinabihan
   ni Neil nang diretso na hindi sya papayag na dodoctorin o gagamitin sa maling
   paraan ang certificate.
2. **100% sumang-ayon sa mekanismo** — ₱6,000 kada load diretso sa facility mula
   sa perang hawak ni Neil sa PayMongo, bago ang kahit anong ibang payout.
3. **Normal na 15 araw ang promised delivery date ng certificate** mula sa
   facility — hindi sya artificial na lead time, standard term nila talaga.
4. **Buhay pa ang ₱1,600 na payout** (inspector ₱500 + transport ₱600 + Zam
   ₱250 + Neil ₱250) kada DENR job. Sistema pa rin nila ito.

**Proseso, sabi ni Boss Jay:** kokontakin nya ang supervisor ng treatment plant
para magpagawa ng certificate. Magpapadala sila ng truck na kukuha ng waste
mula sa site papunta sa treatment plant nila — doon ise-issue ang certificate,
irerelease sa loob ng 15 araw, at **babayaran agad pagdating** (hindi terms).

**Bagong desisyon ni Neil (2026-08-06):** hindi na sya magiging dependent kay
Boss Jay para sa scaling — gagawa sya ng sarili nyang sistema, **under pa rin
ng Oceanides**, at si Neil mismo ang maghahandle ng profit/financial side para
masiguro ang tamang paglaki. **Kumpirmado: pareho** — logistics AT financial
control layer, hindi isa lang.

**Konkretong disenyo, phased (kumpirmado ni Neil):**

1. **Hauler.** Naghahanap ng sariling partner hauler online. Sa ngayon, mga
   contact ni Boss Jay muna ang gagamitin — sya at ang team ang magbabantay ng
   byahe at makikipag-coordinate, hindi hihintayin si Boss Jay para dun.
2. **Booking/dispatch.** Sa umpisa, dadaan pa kay Boss Jay ang scheduling.
   Once matatag na, iipunin ni Neil ang lahat ng contact (inspector, hauler,
   facility) para hindi na kailangan dumaan sa kanya. **Alam na ni Boss Jay
   ito** — sinabi nya kay Neil, *"ako ang bahala, since Oceanides parin naman
   ito."*
3. **Pera.** Diretsong makikipag-transact si Neil sa facility — bibigyan sya
   ni Boss Jay ng contact number ng supervisor doon. Walang middleman sa pera:
   si Neil mismo ang mag-uutos ng ₱6,000/load bago ang ibang payout, gaya ng
   nasa §HARD GATE mechanism sa itaas.

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
